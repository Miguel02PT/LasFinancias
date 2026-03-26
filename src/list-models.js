import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDoCeSlg27y8mApDDoIzD85bVRFOv9S0gY";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log("Modelos disponíveis:");
    models.forEach(model => {
      console.log(`- ${model.name}`);
    });
  } catch (error) {
    console.error("Erro:", error);
  }
}

listModels();