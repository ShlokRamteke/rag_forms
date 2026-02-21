import { pipeline } from "@xenova/transformers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from "mongoose";
import Response from "../models/Response.js";

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
});

let embeddingPipeline;

async function initializeModels() {
    if (!embeddingPipeline) {
        embeddingPipeline = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2"
        );
    }
}

// Initialize immediately
initializeModels();

async function generateEmbedding(text) {
    if (!embeddingPipeline) await initializeModels();
    const result = await embeddingPipeline(text, {
        pooling: "mean",
        normalize: true,
    });
    return Array.from(result.data);
}




// ... (previous code)

async function addResponse(formId, responseId, embedding, payload) {
    await Response.create({
        formId,
        responseId,
        mode: payload?.mode ?? "plaintext",
        data: payload?.data,
        embedding,
    });
}

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
        const x = a[i];
        const y = b[i];
        dot += x * y;
        normA += x * x;
        normB += y * y;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findSimilarResponses(formId, question, limit = 5) {
    const questionEmbedding = await generateEmbedding(question);
    const indexName = process.env.MONGO_VECTOR_SEARCH_INDEX;

    if (indexName) {
        try {
            const results = await Response.aggregate([
                {
                    $vectorSearch: {
                        index: indexName,
                        path: "embedding",
                        queryVector: questionEmbedding,
                        numCandidates: Math.max(limit * 20, limit),
                        limit,
                        filter: {
                            formId: new mongoose.Types.ObjectId(formId),
                            mode: "plaintext",
                        },
                    },
                },
                {
                    $project: {
                        responseId: 1,
                        data: 1,
                        mode: 1,
                        score: { $meta: "vectorSearchScore" },
                    },
                },
            ]);

            return results.map((item) => ({
                _id: item.responseId,
                data: item.data,
                mode: item.mode,
                score: item.score,
            }));
        } catch (error) {
            console.warn("MongoDB vector search unavailable, falling back to app-side similarity.", error);
        }
    }

    const candidates = await Response.find({ formId, mode: "plaintext" })
        .select("responseId data embedding")
        .lean();

    if (!candidates.length) return [];

    const scored = candidates
        .map((candidate) => ({
            _id: candidate.responseId,
            data: candidate.data,
            score: cosineSimilarity(questionEmbedding, candidate.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    return scored;
}


function prepareContext(responses) {
    return responses
        .map((response, index) => {
            // Limit context data to relevant fields if possible, or just dump data
            // Excluding embedding from context to save tokens
            const { embedding, ...rest } = response;
            // data is inside response.data usually based on schema
            const dataToContext = response.data || rest;

            // Format as readable text
            const readableData = Object.entries(dataToContext)
                .map(([key, value]) => `- ${key}: ${value}`)
                .join("\n");

            return `[Record #${index + 1}]\n${readableData}`;
        })
        .join("\n\n");
}

async function analyzeQuestion(formId, question, contextOverride = null) {
    let context;
    let citations = [];

    if (contextOverride) {
        context = contextOverride;
        citations = [{ info: "Decrypted locally on client dispositivo" }];
    } else {
        const similarResponses = await findSimilarResponses(formId, question);
        const publicResponses = similarResponses.filter((response) => response?.data?.mode !== "encrypted");
        context = prepareContext(publicResponses);
        citations = publicResponses.map(r => r.data);
    }

    const prompt = `You are an expert Data Analyst using a RAG (Retrieval-Augmented Generation) system.
  Your goal is to answer the user's question precisely using ONLY the provided collected data records.
  
  Instructions:
  1. Analyze the Context provided below, which contains multiple data records relevant to the question.
  2. Synthesize the information to answer the question.
  3. If you cite specific numbers or facts, mention which "Record #ID" they came from if relevant.
  4. Use Markdown formatting:
     - Use **bold** for key insights or numbers.
     - Use lists for multiple points.
  5. If the answer is not in the context, explicitly say "I cannot find the answer in the provided data."

  User Question: "${question}"
  
  Context Data:
  ${context}`;

    const result = await chatSession.sendMessage(prompt);
    const answer = result.response.text();

    return {
        answer,
        citations
    };
}

export default {
    generateEmbedding,
    analyzeQuestion,
    addResponse,
};
