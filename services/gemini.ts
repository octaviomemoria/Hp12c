
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `
You are an expert on professional RPN Financial Calculators. 
Your goal is to explain to a user how to perform a specific calculation using Reverse Polish Notation (RPN).
The user will ask a question (e.g., "How do I calculate 500 times 12?").
You must reply with a concise step-by-step guide using the standard keys of a financial RPN calculator.
Format the keys in brackets like [ENTER], [n], [i], [PV].
Keep it short. If the user asks for financial math, explain the register storage steps.
Example: 
User: "Calculate monthly payment for $1000 loan at 5% for 1 year"
You: 
1. Type 1000, press [PV] (Present Value)
2. Type 1, press [g], then [n] (12x months)
3. Type 5, press [g], then [i] (12÷ monthly rate)
4. Press [PMT] to calculate payment.
`;

export const askGemini = async (query: string): Promise<string> => {
  if (!process.env.API_KEY) {
      return "Error: API Key is missing. I cannot help you right now.";
  }

  try {
    // Initializing the AI client with correct parameters and model.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      }
    });
    // response.text is a property getter, not a method.
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I had trouble connecting to the manual database.";
  }
};