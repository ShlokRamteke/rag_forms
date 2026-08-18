import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        // The listModels method is on the client or similar, but we can try to find it
        // Or we just try to use 'embedding-001' which is the standard
        console.log("Attempting to use 'embedding-001'...");
        const embedModel = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await embedModel.embedContent("test");
        console.log("Success! 'embedding-001' is available.");
        process.exit(0);
    } catch (error) {
        console.error("Error with 'embedding-001':", error.message);
        console.log("Trying 'text-embedding-004' (again)...");
        try {
            const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await embedModel.embedContent("test");
            console.log("Success! 'text-embedding-004' is available.");
            process.exit(0);
        } catch (error2) {
             console.error("Error with 'text-embedding-004':", error2.message);
             process.exit(1);
        }
    }
}

listModels();
