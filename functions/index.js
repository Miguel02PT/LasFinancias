const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const Stripe = require("stripe");

setGlobalOptions({ region: "europe-west1", maxInstances: 20 });

admin.initializeApp();

const groqApiKey = defineSecret("GROQ_API_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const stripePricePro = defineString("STRIPE_PRICE_PRO", { default: "" });
const stripePriceFulltime = defineString("STRIPE_PRICE_FULLTIME", { default: "" });
const appUrl = defineString("APP_URL", { default: "https://financasapp-149dc.web.app" });

function planFromPriceId(priceId) {
  const pro = stripePricePro.value();
  const ft = stripePriceFulltime.value();
  if (pro && priceId === pro) return "pro";
  if (ft && priceId === ft) return "fulltime";
  return "free";
}

async function syncUserFromStripeSubscription(stripe, subscription) {
  let uid = subscription.metadata?.firebaseUid;
  if (!uid && typeof subscription.customer === "string") {
    const customer = await stripe.customers.retrieve(subscription.customer);
    uid = customer.metadata?.firebaseUid;
  }
  if (!uid) {
    console.warn("stripeWebhook: missing firebaseUid on subscription", subscription.id);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const status = subscription.status;
  const paid = status === "active" || status === "trialing";
  const planMeta = subscription.metadata?.plan;
  let plan = paid ? planFromPriceId(priceId) : "free";
  if (paid && plan === "free" && (planMeta === "pro" || planMeta === "fulltime")) {
    plan = planMeta;
  }

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  await admin.firestore().doc(`users/${uid}`).set(
    {
      subscription: plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: paid ? subscription.id : null,
      subscriptionStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

exports.groqChatCompletion = onCall(
  { secrets: [groqApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Inicie sessão para usar a IA.");
    }

    const { model, messages, temperature = 0.7, max_tokens = 1024 } = request.data || {};
    if (!model || typeof model !== "string") {
      throw new HttpsError("invalid-argument", "Modelo em falta.");
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "Mensagens em falta.");
    }

    const cappedTokens = Math.min(Math.max(Number(max_tokens) || 1024, 1), 8192);
    const key = groqApiKey.value();
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: cappedTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq error:", res.status, errText);
      throw new HttpsError("internal", "Falha ao contactar a IA.");
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return { content };
  }
);

exports.createCheckoutSession = onCall(
  { secrets: [stripeSecretKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Inicie sessão para subscrever.");
    }

    const { plan } = request.data || {};
    if (plan !== "pro" && plan !== "fulltime") {
      throw new HttpsError("invalid-argument", "Plano inválido.");
    }

    const priceId = plan === "pro" ? stripePricePro.value() : stripePriceFulltime.value();
    if (!priceId) {
      throw new HttpsError(
        "failed-precondition",
        "Preços Stripe não configurados (STRIPE_PRICE_PRO / STRIPE_PRICE_FULLTIME)."
      );
    }

    const uid = request.auth.uid;
    const user = await admin.auth().getUser(uid);
    const email = user.email;
    if (!email) {
      throw new HttpsError("failed-precondition", "A conta precisa de email para pagamento.");
    }

    const stripe = new Stripe(stripeSecretKey.value());
    const base = appUrl.value().replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      client_reference_id: uid,
      metadata: { firebaseUid: uid, plan },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/pricing?checkout=success`,
      cancel_url: `${base}/pricing?checkout=cancel`,
      subscription_data: {
        metadata: { firebaseUid: uid, plan },
      },
    });

    if (!session.url) {
      throw new HttpsError("internal", "Stripe não devolveu URL de checkout.");
    }

    return { url: session.url };
  }
);

exports.createBillingPortalSession = onCall(
  { secrets: [stripeSecretKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Inicie sessão.");
    }

    const uid = request.auth.uid;
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    const stripeCustomerId = snap.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
      throw new HttpsError(
        "failed-precondition",
        "Sem cliente de faturação. Subscreva primeiro ou contacte o suporte."
      );
    }

    const stripe = new Stripe(stripeSecretKey.value());
    const base = appUrl.value().replace(/\/$/, "");

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${base}/pricing`,
    });

    return { url: session.url };
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret], cors: false },
  async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value());
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    } catch (err) {
      console.error("Webhook signature:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const uid = session.client_reference_id || session.metadata?.firebaseUid;
          const subId = session.subscription;
          if (uid && typeof subId === "string") {
            const sub = await stripe.subscriptions.retrieve(subId);
            await syncUserFromStripeSubscription(stripe, sub);
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          await syncUserFromStripeSubscription(stripe, subscription);
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error("Webhook handler error:", e);
      return res.status(500).send("Handler error");
    }

    return res.json({ received: true });
  }
);
