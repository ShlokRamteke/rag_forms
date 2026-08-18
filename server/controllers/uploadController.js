import Form from "../models/Form.js";
import Response from "../models/Response.js";
import mongoose from "mongoose";
import ragService from "../services/ragService.js";
import fs from "fs";
import csv from "csv-parser";
import {
    buildAnalysisData,
    encryptForStorage,
    getNormalizedFormFields,
    validateAndSanitizeResponse,
} from "./formController.js";

async function processFile(filePath, mimeType) {
    const results = [];
    return new Promise((resolve, reject) => {
        if (mimeType === "application/json") {
            fs.readFile(filePath, "utf8", (err, data) => {
                if (err) reject(err);
                try {
                    const jsonData = JSON.parse(data);
                    if (Array.isArray(jsonData)) {
                        // Assume array of objects
                        jsonData.forEach(item => results.push(item));
                    } else {
                        results.push(jsonData);
                    }
                    resolve(results);
                } catch (e) {
                    reject(e);
                }
            });
        } else {
            // Assume CSV
            fs.createReadStream(filePath)
                .pipe(csv())
                .on("data", (data) => results.push(data))
                .on("end", () => resolve(results))
                .on("error", (error) => reject(error));
        }
    });
}

const MAX_UPLOAD_RECORDS = 1000;

async function uploadData(req, res) {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const ownerId = req?.auth?.userId;
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
        const { id } = req.params;

        const form = await Form.findOne({ _id: id, ownerId });
        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }

        const data = await processFile(file.path, file.mimetype);
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: "Uploaded file contains no valid data records" });
        }

        if (data.length > MAX_UPLOAD_RECORDS) {
            return res.status(400).json({ 
                error: `Upload exceeds maximum allowed limit of ${MAX_UPLOAD_RECORDS} records per file (received ${data.length}).` 
            });
        }

        const privacyMode = form.privacyMode ?? "encrypted";
        const fields = getNormalizedFormFields(form);

        // Process and store in batches
        const BATCH_SIZE = 50;
        let processedCount = 0;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            
            const batchResults = await Promise.all(
                batch.map(async (item) => {
                    const cleanedData = validateAndSanitizeResponse(fields, item);
                    const analysisData = buildAnalysisData(fields, cleanedData);
                    const embedding = await ragService.generateEmbedding(JSON.stringify(analysisData));
                    const responseId = new mongoose.Types.ObjectId().toString();
                    
                    if (privacyMode === "none") {
                        return {
                            ownerId: form.ownerId,
                            formId: id,
                            responseId,
                            mode: "plaintext",
                            data: cleanedData,
                            analysisData,
                            embedding,
                        };
                    } else {
                        const encrypted = encryptForStorage(cleanedData);
                        return {
                            ownerId: form.ownerId,
                            formId: id,
                            responseId,
                            mode: "encrypted",
                            ...encrypted,
                            analysisData,
                            embedding,
                        };
                    }
                })
            );

            await Response.insertMany(batchResults);
            processedCount += batchResults.length;
        }

        res.json({ message: "Data uploaded successfully", count: processedCount });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (file?.path) {
            fs.promises.unlink(file.path).catch((err) => {
                console.warn("Failed to delete temp upload file:", err.message);
            });
        }
    }
}

export default {
    uploadData,
};
