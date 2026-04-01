import { db } from "../../firebase/config";
import { collection, getDocs } from "firebase/firestore";

export const getTransactions = async (userId) => {
  if (!userId) return [];

  const snapshot = await getDocs(
    collection(db, "users", userId, "transactions")
  );

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};