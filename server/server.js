import express from "express";
import mongoose from "mongoose";
import { pipeline } from "@xenova/transformers";
import config from "./config.js";

import Form from "./model/forms.js";

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const chatSession = model.startChat({
  generationConfig,
  // safetySettings: Adjust safety settings
  // See https://ai.google.dev/gemini-api/docs/safety-settings
});

const app = express();
app.use(express.json());
app.use(cors());

mongoose
  .connect(config.mongodbUri)
  .then(() => {
    console.log("Connected to MongoDB", config.mongodbUri);
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
  });

let embeddingPipeline;

async function initializeModels() {
  embeddingPipeline = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
}

initializeModels();

async function generateEmbedding(text) {
  const result = await embeddingPipeline(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(result.data);
}

async function findSimilarResponses(formId, question, limit = 2) {
  const form = await Form.findById(formId);

  const questionEmbedding = await generateEmbedding(question);

  const similarResponses = form.responses
    .map((response) => ({
      data: response.data,
      similarity: cosineSimilarity(questionEmbedding, response.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarResponses;
}

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function prepareContext(responses) {
  return responses
    .map((response, index) => {
      return `Response ${index + 1}: ${Object.entries(response)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")}`;
    })
    .join("\n\n");
}

app.get("/api/forms", async (req, res) => {
  const forms = await Form.find().select("name");
  console.log("forms", forms);

  res.json(forms);
});

app.post("/api/forms", async (req, res) => {
  const { name, fields, responses } = req.body;
  //console.log("fields, responses", fields, responses);

  const embeddedResponses = await Promise.all(
    responses.map(async (response) => ({
      data: response.data,
      embedding: await generateEmbedding(JSON.stringify(response.data)),
    }))
  );

  const form = new Form({ name, fields, responses: embeddedResponses });
  await form.save();
  console.log(form);

  res.json(form);
});

app.post("/api/analyze", async (req, res) => {
  const { formId, question } = req.body;

  try {
    const similarResponses = await findSimilarResponses(formId, question);

    const context = prepareContext(similarResponses.map((r) => r.data));
    console.log("question & context", question, similarResponses);
    console.log(
      `Answer the below question from the Context Question:${question} Context:${context}. If not present say no answer`
    );

    const result = await chatSession.sendMessage(
      `Answer the below question from the Context.If not present say no answer Question:${question} Context:${context}. `
    );
    console.log(result.response.text());

    res.json({
      answer: result.response.text(),
    });
  } catch (error) {
    console.error("Error in RAG processing:", error);
    res.status(500).json({ error: "An error occurred during analysis" });
  }
});

app.listen(config.port, () =>
  console.log(`Server running on port ${config.port}`)
);
