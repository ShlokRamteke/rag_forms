import https from "https";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log("AVAILABLE MODELS:");
                    json.models.forEach(m => {
                        const canEmbed = m.supportedGenerationMethods.includes("embedContent") ? "[EMBEDDING SUPPORTED]" : "";
                        console.log(`${m.name} ${canEmbed}`);
                    });
                } else {
                    console.log("No models in response:", json);
                }
            } catch (e) {
                console.error("Parse error:", e.message);
                console.log("Raw output:", data);
            }
        });
    }).on("error", (err) => {
        console.error("HTTP Error:", err.message);
    });
}

listModels();
