import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AQ.Ab8RN6KD--DPcMpAMX1xC6oN5L5I8030155p1K7Ze9R86ePWZg");

export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});