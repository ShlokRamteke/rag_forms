import Form from "../models/Form.js";
import FormDraft from "../models/FormDraft.js";
import Response from "../models/Response.js";
import Conversation from "../models/Conversation.js";
import ragService from "../services/ragService.js";
import crypto from "crypto";
import mongoose from "mongoose";

const ALLOWED_TYPES = new Set([
    "text",
    "textarea",
    "number",
    "email",
    "tel",
    "date",
    "enum",
    "boolean",
    "section",
]);

const ALLOWED_PRIVACY_POLICIES = new Set([
    "private",
    "derived",
    "redacted_analyzable",
    "analyzable",
]);

const TYPE_PRIVACY_DEFAULTS = {
    text: "redacted_analyzable",
    textarea: "redacted_analyzable",
    number: "analyzable",
    email: "derived",
    tel: "derived",
    date: "derived",
    enum: "analyzable",
    boolean: "analyzable",
};

const PHONE_COUNTRY_BY_CODE = {
    "+1": "United States/Canada",
    "+44": "United Kingdom",
    "+61": "Australia",
    "+81": "Japan",
    "+86": "China",
    "+91": "India",
    "+971": "United Arab Emirates",
};

const CREATE_FORM_DRAFT_KEY = "create-form";

function sanitizeString(value, maxLen = 200) {
    if (value === undefined || value === null) return undefined;
    return String(value).trim().slice(0, maxLen);
}

function sanitizeDraftField(field, index = 0) {
    const type = sanitizeString(field?.type, 32) || "text";
    const validation = field?.validation && typeof field.validation === "object"
        ? {
            min: field.validation.min ?? "",
            max: field.validation.max ?? "",
            minLength: field.validation.minLength ?? "",
            maxLength: field.validation.maxLength ?? "",
            pattern: field.validation.pattern ? String(field.validation.pattern) : "",
        }
        : { min: "", max: "", minLength: "", maxLength: "", pattern: "" };

    return {
        label: sanitizeString(field?.label, 200) || "",
        type,
        required: index === 0 ? Boolean(field?.required ?? true) : Boolean(field?.required),
        description: sanitizeString(field?.description, 1000) || "",
        privacy: type === "section" ? undefined : getFieldPrivacy(field),
        optionsText: sanitizeString(field?.optionsText, 5000) || "",
        validation,
    };
}

function sanitizeCreateDraftPayload(payload) {
    const rawFields = Array.isArray(payload?.fields) ? payload.fields.slice(0, 100) : [];
    return {
        name: sanitizeString(payload?.name, 200) || "",
        privacyMode: payload?.privacyMode === "none" ? "none" : "encrypted",
        fields: rawFields.length > 0 ? rawFields.map(sanitizeDraftField) : [sanitizeDraftField({}, 0)],
    };
}

function toFieldKey(input, fallback) {
    const base = String(input ?? "").trim();
    if (!base) return fallback;
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
}

function getDefaultPrivacyForType(type) {
    return TYPE_PRIVACY_DEFAULTS[type] || "private";
}

function getFieldPrivacy(field) {
    if (field?.type === "section") return undefined;
    return ALLOWED_PRIVACY_POLICIES.has(field?.privacy)
        ? field.privacy
        : getDefaultPrivacyForType(field?.type);
}

function getRequesterOwnerId(req) {
    return sanitizeString(req?.auth?.userId, 128) || null;
}

function getServerEncryptionKey() {
    const secret = process.env.APP_DATA_KEY;
    if (!secret || secret === "dev-insecure-default-key") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Fatal: APP_DATA_KEY is not configured securely in production.");
        }
    }
    return crypto.createHash("sha256").update(secret || "dev-insecure-default-key").digest();
}

export function encryptForStorage(payload) {
    const iv = crypto.randomBytes(12);
    const key = getServerEncryptionKey();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        encryptedData: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: tag.toString("base64"),
        salt: tag.toString("base64"),
    };
}

export function redactForAnalysis(value) {
    if (value === undefined || value === null) return value;
    return String(value)
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
        .replace(/\+?[0-9][0-9\s().-]{6,}[0-9]/g, (match) => {
            const compact = match.replace(/[\s().-]/g, "");
            const countryCode = detectPhoneCountryCode(compact);
            return countryCode ? `[PHONE_${countryCode.replace("+", "")}]` : "[PHONE]";
        })
        .replace(/\b\d{8,}\b/g, "[ID]");
}

function hasValue(value) {
    return value !== undefined && value !== null && value !== "";
}

function detectPhoneCountryCode(value) {
    const compact = String(value || "").replace(/[\s()-]/g, "");
    const matches = Object.keys(PHONE_COUNTRY_BY_CODE)
        .filter((code) => compact.startsWith(code))
        .sort((a, b) => b.length - a.length);
    return matches[0] || null;
}

export function deriveFieldMetadata(field, value) {
    const key = field?.key;
    const type = field?.type;
    if (!key) return {};

    if (type === "tel") {
        const countryCode = detectPhoneCountryCode(value);
        return {
            [`${key}_present`]: hasValue(value),
            ...(countryCode
                ? {
                    [`${key}_country_code`]: countryCode,
                    [`${key}_country`]: PHONE_COUNTRY_BY_CODE[countryCode],
                }
                : {}),
        };
    }

    if (type === "email") {
        const domain = hasValue(value) ? String(value).split("@")[1]?.toLowerCase() : undefined;
        return {
            [`${key}_present`]: hasValue(value),
            ...(domain ? { [`${key}_domain`]: domain } : {}),
        };
    }

    if (type === "date") {
        const dateValue = hasValue(value) ? String(value) : "";
        return {
            [`${key}_present`]: hasValue(value),
            ...(dateValue
                ? {
                    [`${key}_year`]: dateValue.slice(0, 4),
                    [`${key}_month`]: dateValue.slice(0, 7),
                }
                : {}),
        };
    }

    return {
        [`${key}_present`]: hasValue(value),
    };
}

export function buildAnalysisData(fields, cleanedData) {
    return fields.reduce((analysis, field) => {
        if (field.type === "section") return analysis;

        const value = cleanedData[field.key];
        const privacy = getFieldPrivacy(field);
        if (privacy === "private") return analysis;

        if (privacy === "derived") {
            return {
                ...analysis,
                ...deriveFieldMetadata(field, value),
            };
        }

        if (!hasValue(value)) return analysis;

        if (privacy === "redacted_analyzable") {
            return {
                ...analysis,
                [field.key]: redactForAnalysis(value),
            };
        }

        return {
            ...analysis,
            [field.key]: value,
        };
    }, {});
}

function sanitizeField(field) {
    const label = sanitizeString(field?.label ?? field?.name, 200);
    const key = sanitizeString(field?.key, 64) || toFieldKey(label ?? field?.name, "field");
    const type = sanitizeString(field?.type, 32) || "text";
    const description = sanitizeString(field?.description, 1000);
    const privacy = ALLOWED_PRIVACY_POLICIES.has(field?.privacy)
        ? field.privacy
        : getDefaultPrivacyForType(type);
    const config = field?.config && typeof field.config === "object" ? field.config : undefined;

    return {
        key,
        label,
        type,
        required: Boolean(field?.required),
        description,
        privacy: type === "section" ? undefined : privacy,
        config,
    };
}

export function getNormalizedFormFields(form) {
    const fields = Array.isArray(form?.fields) && form.fields.length > 0
        ? form.fields
        : Array.isArray(form?.schema?.fields)
            ? form.schema.fields
            : [];
    return fields.map(sanitizeField);
}

function validateFormDefinition(name, fields) {
    if (!name) throw new Error("Form name is required.");
    if (!Array.isArray(fields) || fields.length === 0) {
        throw new Error("At least one field is required.");
    }
    if (fields.length > 100) {
        throw new Error("Form cannot exceed 100 fields.");
    }

    const keys = new Set();
    fields.forEach((field, index) => {
        if (!ALLOWED_TYPES.has(field.type)) {
            throw new Error(`Unsupported field type "${field.type}" at index ${index + 1}.`);
        }
        if (field.type !== "section") {
            if (!field.label) throw new Error(`Field label is required at index ${index + 1}.`);
            if (!field.key) throw new Error(`Field key is required at index ${index + 1}.`);
        }
        if (field.key) {
            const normalizedKey = field.key.toLowerCase();
            if (keys.has(normalizedKey)) throw new Error(`Duplicate field key "${field.key}".`);
            keys.add(normalizedKey);
        }
        if (field.type === "enum") {
            const options = field?.config?.options;
            if (!Array.isArray(options) || options.length === 0) {
                throw new Error(`Dropdown field "${field.label || field.key}" requires options.`);
            }
        }
    });
}

export function validateAndSanitizeResponse(fields, data) {
    if (data === undefined || data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Response data must be an object.");
    }

    const cleaned = {};
    for (const field of fields) {
        const type = field.type;
        if (type === "section") continue;
        const key = field.key;
        const value = data[key];

        if (field.required) {
            if (type === "boolean") {
                if (value !== true) throw new Error(`"${key}" is required.`);
            } else if (value === undefined || value === null || value === "") {
                throw new Error(`"${key}" is required.`);
            }
        }

        if (value === undefined) continue;

        if (type === "number") {
            const n = Number(value);
            if (Number.isNaN(n)) throw new Error(`"${key}" must be a number.`);
            const min = field?.config?.validation?.min;
            const max = field?.config?.validation?.max;
            if (min !== undefined && n < Number(min)) throw new Error(`"${key}" must be at least ${min}.`);
            if (max !== undefined && n > Number(max)) throw new Error(`"${key}" must be at most ${max}.`);
            cleaned[key] = n;
            continue;
        }

        if (type === "boolean") {
            cleaned[key] = value === true || value === "true";
            continue;
        }

        if (type === "date") {
            const v = sanitizeString(value, 32);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`"${key}" must be a date.`);
            const min = field?.config?.validation?.min;
            const max = field?.config?.validation?.max;
            if (min && v < min) throw new Error(`"${key}" must be on or after ${min}.`);
            if (max && v > max) throw new Error(`"${key}" must be on or before ${max}.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "email") {
            const v = sanitizeString(value, 320);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`"${key}" must be a valid email.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "tel") {
            const v = sanitizeString(value, 32);
            const compact = String(v || "").replace(/[\s()-]/g, "");
            if (!/^\+?[0-9]{7,15}$/.test(compact)) throw new Error(`"${key}" must be a valid phone number.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "enum") {
            const v = sanitizeString(value, 200);
            const options = field?.config?.options || [];
            if (!options.includes(v)) throw new Error(`"${key}" must be one of the allowed options.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "text" || type === "textarea") {
            const v = sanitizeString(value, 5000);
            const minLength = field?.config?.validation?.minLength;
            const maxLength = field?.config?.validation?.maxLength;
            const pattern = field?.config?.validation?.pattern;
            if (minLength !== undefined && v.length < Number(minLength)) throw new Error(`"${key}" must be at least ${minLength} characters.`);
            if (maxLength !== undefined && v.length > Number(maxLength)) throw new Error(`"${key}" must be at most ${maxLength} characters.`);
            if (pattern) {
                const patternStr = String(pattern).trim();
                if (patternStr.length > 100) {
                    throw new Error(`Invalid pattern length for "${key}".`);
                }
                // Detect potentially catastrophic nested quantifiers: (x+)+, (x*)+, (x+)*, etc.
                if (/(\+|\*|\{[0-9]+,\})\s*\)\s*(\+|\*|\{[0-9]+,\})/.test(patternStr)) {
                    throw new Error(`Pattern for "${key}" contains unsafe exponential expressions.`);
                }
                try {
                    const re = new RegExp(patternStr);
                    if (!re.test(v)) throw new Error(`"${key}" does not match the required pattern.`);
                } catch (err) {
                    if (err.message && err.message.includes("does not match")) throw err;
                    throw new Error(`Invalid regex pattern for "${key}".`);
                }
            }
            cleaned[key] = v;
            continue;
        }

        cleaned[key] = value;
    }

    return cleaned;
}

async function getAllForms(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const formsDocs = await Form.find({ ownerId }).sort({ updatedAt: -1 }).lean();
        
        const formIds = formsDocs.map(f => f._id);
        const responseStats = await Response.aggregate([
            { $match: { formId: { $in: formIds } } },
            { $group: {
                _id: "$formId",
                total: { $sum: 1 },
                encrypted: { $sum: { $cond: [{ $eq: ["$mode", "encrypted"] }, 1, 0] } },
                plaintext: { $sum: { $cond: [{ $eq: ["$mode", "plaintext"] }, 1, 0] } }
            }}
        ]);
        
        const statsMap = responseStats.reduce((acc, stat) => {
            acc[stat._id.toString()] = stat;
            return acc;
        }, {});

        const forms = formsDocs.map((form) => {
            const stats = statsMap[form._id.toString()] || { total: 0, encrypted: 0, plaintext: 0 };
            const normalizedFields = getNormalizedFormFields(form);
            return {
                _id: form._id,
                name: form.name,
                fields: normalizedFields,
                privacyMode: form.privacyMode,
                createdAt: form.createdAt,
                updatedAt: form.updatedAt,
                responseCount: stats.total,
                encryptedResponseCount: stats.encrypted,
                plaintextResponseCount: stats.plaintext,
            };
        });
        res.json(forms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function createForm(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
        const { name, fields, responses, privacyMode } = req.body;

        const sanitizedFields = Array.isArray(fields) ? fields.map(sanitizeField) : [];
        const sanitizedName = sanitizeString(name, 200);
        validateFormDefinition(sanitizedName, sanitizedFields);

        const embeddedResponses = await Promise.all(
            (responses || []).slice(0, 100).map(async (response) => {
                const data = response?.data ?? response;
                const cleanedData = validateAndSanitizeResponse(sanitizedFields, data);
                const analysisData = buildAnalysisData(sanitizedFields, cleanedData);
                return {
                    mode: "plaintext",
                    data: cleanedData,
                    analysisData,
                    embedding: await ragService.generateEmbedding(JSON.stringify(analysisData)),
                };
            })
        );

        const form = new Form({
            ownerId,
            name: sanitizedName,
            schema: { fields: sanitizedFields },
            schemaVersion: 1,
            fields: sanitizedFields,
            privacyMode: privacyMode ?? "encrypted",
        });
        await form.save();

        if (embeddedResponses.length > 0) {
            await Response.insertMany(embeddedResponses.map(r => ({
                formId: form._id,
                ownerId,
                responseId: new mongoose.Types.ObjectId().toString(),
                ...r
            })));
        }

        res.json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function analyzeForm(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
        const { formId, question } = req.body;
        if (!formId || typeof formId !== "string") {
            return res.status(400).json({ error: "A valid formId is required" });
        }
        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({ error: "A non-empty question is required" });
        }
        const trimmedQuestion = question.trim();
        if (trimmedQuestion.length > 2000) {
            return res.status(400).json({ error: "Question exceeds maximum limit of 2000 characters" });
        }

        const form = await Form.findOne({ _id: formId, ownerId }).select("_id").lean();
        if (!form) return res.status(404).json({ error: "Form not found" });
        const result = await ragService.analyzeQuestion(formId, trimmedQuestion, ownerId);
        res.json(result);
    } catch (error) {
        console.error("Error in analyze:", error);
        res.status(500).json({ error: "An error occurred during analysis" });
    }
}

async function analyzeFormStream(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
        const { formId, question } = req.body;
        if (!formId || typeof formId !== "string") {
            return res.status(400).json({ error: "A valid formId is required" });
        }
        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({ error: "A non-empty question is required" });
        }
        const trimmedQuestion = question.trim();
        if (trimmedQuestion.length > 2000) {
            return res.status(400).json({ error: "Question exceeds maximum limit of 2000 characters" });
        }

        const form = await Form.findOne({ _id: formId, ownerId }).select("_id").lean();
        if (!form) return res.status(404).json({ error: "Form not found" });

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        const sendEvent = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        await ragService.analyzeQuestionStream({
            formId,
            question: trimmedQuestion,
            ownerId,
            onCitations: (citations) => {
                sendEvent("citations", { citations });
            },
            onChunk: (chunk) => {
                sendEvent("chunk", { chunk });
            },
        });

        sendEvent("done", {});
        res.end();
    } catch (error) {
        console.error("Error in analyzeFormStream:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "An error occurred during streaming analysis" });
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`);
            res.end();
        }
    }
}

async function getAdminFormById(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });
        const form = await Form.findOne({ _id: req.params.id, ownerId })
            .select("ownerId name schema schemaVersion fields privacyMode createdAt updatedAt")
            .lean();
        if (!form) return res.status(404).json({ error: "Form not found" });

        const totalCount = await Response.countDocuments({ formId: form._id });
        form.responseCount = totalCount;

        res.json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getPublicFormById(req, res) {
    try {
        const form = await Form.findById(req.params.id).select("name schema schemaVersion fields privacyMode createdAt updatedAt").lean();
        if (!form) return res.status(404).json({ error: "Form not found" });
        res.json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const submitResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = req.body;

        const form = await Form.findById(id).select("ownerId fields schema privacyMode").lean();
        if (!form) return res.status(404).json({ error: "Form not found" });
        if (data === undefined) return res.status(400).json({ error: "Submission requires data." });

        const sanitizedFields = getNormalizedFormFields(form);
        const cleanedData = validateAndSanitizeResponse(sanitizedFields, data);
        const analysisData = buildAnalysisData(sanitizedFields, cleanedData);
        // Always generate embedding securely on the server; never trust client-supplied vectors
        const computedEmbedding = await ragService.generateEmbedding(JSON.stringify(analysisData));
        const privacyMode = form.privacyMode ?? "encrypted";

        const response = privacyMode === "none"
            ? {
                mode: "plaintext",
                data: cleanedData,
                analysisData,
                embedding: computedEmbedding,
            }
            : {
                mode: "encrypted",
                ...encryptForStorage(cleanedData),
                analysisData,
                embedding: computedEmbedding,
            };

        const responseId = new mongoose.Types.ObjectId().toString();

        await ragService.addResponse(
            id,
            responseId,
            computedEmbedding,
            privacyMode === "none"
                ? { mode: "plaintext", data: cleanedData, analysisData, ownerId: form.ownerId }
                : { 
                    mode: "encrypted", 
                    ownerId: form.ownerId,
                    encryptedData: response.encryptedData,
                    iv: response.iv,
                    salt: response.salt,
                    authTag: response.authTag,
                    analysisData,
                  }
        );

        return res.status(200).json({ message: "Response submitted securely" });
    } catch (error) {
        console.error("Submission error:", error);
        res.status(500).json({ error: error.message });
    }
};

async function getConversationHistory(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const history = await Conversation.find({ formId: req.params.id, ownerId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.json(history.reverse());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function clearConversationHistory(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        await Conversation.deleteMany({ formId: req.params.id, ownerId });
        res.json({ message: "Conversation history cleared successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getFormResponses(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const form = await Form.findOne({ _id: req.params.id, ownerId }).select("_id fields schema privacyMode").lean();
        if (!form) return res.status(404).json({ error: "Form not found" });

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
        const skip = (page - 1) * limit;

        const [responseDocs, total] = await Promise.all([
            Response.find({ formId: form._id, ownerId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("responseId mode data analysisData encryptedData iv salt authTag createdAt")
                .lean(),
            Response.countDocuments({ formId: form._id, ownerId }),
        ]);

        const key = getServerEncryptionKey();
        const responses = responseDocs.map((r) => {
            let visibleData = null;

            if (r.mode === "plaintext" && r.data) {
                // Plaintext: show data directly
                visibleData = r.data;
            } else if (r.mode === "encrypted" && r.encryptedData && r.iv && (r.authTag || r.salt)) {
                // Encrypted: decrypt server-side for admin view
                try {
                    const tag = r.authTag || r.salt;
                    const iv = Buffer.from(r.iv, "base64");
                    const authTagBuf = Buffer.from(tag, "base64");
                    const encrypted = Buffer.from(r.encryptedData, "base64");
                    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
                    decipher.setAuthTag(authTagBuf);
                    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
                    visibleData = JSON.parse(decrypted.toString("utf8"));
                } catch (err) {
                    // If decryption fails, fall back to analysisData (redacted)
                    visibleData = r.analysisData ?? null;
                }
            } else if (r.analysisData) {
                // Fallback to analysisData (redacted metadata only)
                visibleData = r.analysisData;
            }

            return {
                responseId: r.responseId,
                mode: r.mode,
                data: visibleData,
                submittedAt: r.createdAt,
            };
        });

        res.json({ responses, total, page, limit });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function clearLegacyData(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const formResult = await Form.updateMany(
            { ownerId, responses: { $exists: true } },
            { $unset: { responses: "" } }
        );
        res.json({ 
            message: "Legacy embedded responses removed.", 
            updatedForms: formResult.modifiedCount 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteForm(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const form = await Form.findOne({ _id: req.params.id, ownerId }).select("_id").lean();
        if (!form) return res.status(404).json({ error: "Form not found" });

        const formDeleteResult = await Form.deleteOne({ _id: form._id, ownerId });

        let responseDeleteCount = 0;
        let conversationDeleteCount = 0;

        try {
            const responseDeleteResult = await Response.deleteMany({ formId: form._id, ownerId });
            responseDeleteCount = responseDeleteResult.deletedCount || 0;
        } catch (cleanupError) {
            console.warn("Unable to clean up responses for deleted form:", cleanupError);
        }

        try {
            const conversationDeleteResult = await Conversation.deleteMany({ formId: form._id, ownerId });
            conversationDeleteCount = conversationDeleteResult.deletedCount || 0;
        } catch (cleanupError) {
            console.warn("Unable to clean up conversations for deleted form:", cleanupError);
        }

        res.json({
            message: "Form deleted successfully.",
            deletedForms: formDeleteResult.deletedCount,
            deletedResponses: responseDeleteCount,
            deletedConversations: conversationDeleteCount,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getAllDrafts(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const drafts = await FormDraft.find({ ownerId })
            .sort({ updatedAt: -1 })
            .lean();

        const formatted = drafts.map((d) => ({
            _id: d._id,
            draftKey: d.draftKey,
            name: d.payload?.name || "Untitled Draft",
            privacyMode: d.payload?.privacyMode || "encrypted",
            fieldsCount: Array.isArray(d.payload?.fields) ? d.payload.fields.length : 0,
            payload: d.payload,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getDraftByKey(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const draftKey = sanitizeString(req.params.draftKey, 64) || CREATE_FORM_DRAFT_KEY;
        const draft = await FormDraft.findOne({ ownerId, draftKey }).lean();
        if (!draft) return res.status(404).json({ error: "Draft not found" });

        res.json(draft.payload);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function saveDraftByKey(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const draftKey = sanitizeString(req.params.draftKey, 64) || CREATE_FORM_DRAFT_KEY;
        const payload = sanitizeCreateDraftPayload(req.body);

        const draft = await FormDraft.findOneAndUpdate(
            { ownerId, draftKey },
            { $set: { payload } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: "Draft saved remotely.", draftKey, payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteDraftByKey(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const draftKey = sanitizeString(req.params.draftKey, 64) || CREATE_FORM_DRAFT_KEY;
        await FormDraft.deleteOne({ ownerId, draftKey });
        res.json({ message: "Draft cleared.", draftKey });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getCreateFormDraft(req, res) {
    return getDraftByKey({ ...req, params: { draftKey: CREATE_FORM_DRAFT_KEY } }, res);
}

async function saveCreateFormDraft(req, res) {
    return saveDraftByKey({ ...req, params: { draftKey: CREATE_FORM_DRAFT_KEY } }, res);
}

async function deleteCreateFormDraft(req, res) {
    return deleteDraftByKey({ ...req, params: { draftKey: CREATE_FORM_DRAFT_KEY } }, res);
}

async function updateForm(req, res) {
    try {
        const ownerId = getRequesterOwnerId(req);
        if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

        const form = await Form.findOne({ _id: req.params.id, ownerId });
        if (!form) return res.status(404).json({ error: "Form not found" });

        const { name, fields, privacyMode } = req.body;

        if (name !== undefined) {
            const sanitizedName = sanitizeString(name, 200);
            if (!sanitizedName) return res.status(400).json({ error: "Form name is required." });
            form.name = sanitizedName;
        }

        if (fields !== undefined) {
            if (!Array.isArray(fields)) return res.status(400).json({ error: "Fields must be an array." });
            const sanitizedFields = fields.map(sanitizeField);
            validateFormDefinition(form.name, sanitizedFields);
            form.fields = sanitizedFields;
            form.schema = { fields: sanitizedFields };
        }

        if (privacyMode !== undefined) {
            form.privacyMode = privacyMode === "none" ? "none" : "encrypted";
        }

        await form.save();
        res.json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


export default {
    getAllForms,
    createForm,
    updateForm,
    analyzeForm,
    analyzeFormStream,
    getAdminFormById,
    getPublicFormById,
    submitResponse,
    getConversationHistory,
    clearConversationHistory,
    getFormResponses,
    clearLegacyData,
    deleteForm,
    getAllDrafts,
    getDraftByKey,
    saveDraftByKey,
    deleteDraftByKey,
    getCreateFormDraft,
    saveCreateFormDraft,
    deleteCreateFormDraft,
};
