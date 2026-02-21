import Form from "../models/Form.js";
import ragService from "../services/ragService.js";

const ALLOWED_TYPES = new Set([
    "text",
    "textarea",
    "number",
    "email",
    "date",
    "enum",
    "boolean",
    "section",
]);

function sanitizeString(value, maxLen = 200) {
    if (value === undefined || value === null) return undefined;
    return String(value).trim().slice(0, maxLen);
}

function sanitizeField(field) {
    const label = sanitizeString(field?.label, 200);
    const type = sanitizeString(field?.type, 32) || "text";
    const required = Boolean(field?.required);
    const description = sanitizeString(field?.description, 1000);
    const config = field?.config && typeof field.config === "object" ? field.config : undefined;

    return {
        key: sanitizeString(field?.key, 64),
        label,
        type,
        required,
        description,
        config,
    };
}

function validateFormDefinition(name, fields) {
    if (!name) throw new Error("Form name is required.");
    if (!Array.isArray(fields) || fields.length === 0) {
        throw new Error("At least one field is required.");
    }

    const keys = new Set();
    fields.forEach((field, index) => {
        const type = field.type;
        if (!ALLOWED_TYPES.has(type)) {
            throw new Error(`Unsupported field type "${type}" at index ${index + 1}.`);
        }
        if (type !== "section") {
            if (!field.label) throw new Error(`Field label is required at index ${index + 1}.`);
            if (!field.key) throw new Error(`Field key is required at index ${index + 1}.`);
        }
        if (field.key) {
            if (keys.has(field.key)) throw new Error(`Duplicate field key "${field.key}".`);
            keys.add(field.key);
        }
        if (type === "enum") {
            const options = field?.config?.options;
            if (!Array.isArray(options) || options.length === 0) {
                throw new Error(`Dropdown field "${field.label || field.key}" requires options.`);
            }
        }
    });
}

function validateAndSanitizeResponse(fields, data) {
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
                if (value !== true) throw new Error(`"${field.label || key}" is required.`);
            } else if (value === undefined || value === null || value === "") {
                throw new Error(`"${field.label || key}" is required.`);
            }
        }

        if (value === undefined) continue;

        if (type === "number") {
            const n = Number(value);
            if (Number.isNaN(n)) throw new Error(`"${field.label || key}" must be a number.`);
            const min = field?.config?.validation?.min;
            const max = field?.config?.validation?.max;
            if (min !== undefined && n < Number(min)) throw new Error(`"${field.label || key}" must be at least ${min}.`);
            if (max !== undefined && n > Number(max)) throw new Error(`"${field.label || key}" must be at most ${max}.`);
            cleaned[key] = n;
            continue;
        }

        if (type === "boolean") {
            const b = value === true || value === "true";
            cleaned[key] = b;
            continue;
        }

        if (type === "date") {
            const v = sanitizeString(value, 32);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`"${field.label || key}" must be a date.`);
            const min = field?.config?.validation?.min;
            const max = field?.config?.validation?.max;
            if (min && v < min) throw new Error(`"${field.label || key}" must be on or after ${min}.`);
            if (max && v > max) throw new Error(`"${field.label || key}" must be on or before ${max}.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "email") {
            const v = sanitizeString(value, 320);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`"${field.label || key}" must be a valid email.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "enum") {
            const v = sanitizeString(value, 200);
            const options = field?.config?.options || [];
            if (!options.includes(v)) throw new Error(`"${field.label || key}" must be one of the allowed options.`);
            cleaned[key] = v;
            continue;
        }

        if (type === "text" || type === "textarea") {
            const v = sanitizeString(value, 5000);
            const minLength = field?.config?.validation?.minLength;
            const maxLength = field?.config?.validation?.maxLength;
            const pattern = field?.config?.validation?.pattern;
            if (minLength !== undefined && v.length < Number(minLength)) throw new Error(`"${field.label || key}" must be at least ${minLength} characters.`);
            if (maxLength !== undefined && v.length > Number(maxLength)) throw new Error(`"${field.label || key}" must be at most ${maxLength} characters.`);
            if (pattern) {
                const re = new RegExp(pattern);
                if (!re.test(v)) throw new Error(`"${field.label || key}" does not match the required pattern.`);
            }
            cleaned[key] = v;
            continue;
        }

        cleaned[key] = value;
    }

    return cleaned;
}

function toFieldKey(input, fallback) {
    const base = String(input ?? "").trim();
    if (!base) return fallback;
    return base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || fallback;
}

function normalizeFields({ schema, fields }) {
    const rawFields = Array.isArray(schema?.fields) ? schema.fields : Array.isArray(fields) ? fields : [];

    return rawFields.map((field, index) => {
        const legacyLabel = field?.name;
        const label = field?.label ?? legacyLabel ?? `Field ${index + 1}`;
        const key = field?.key ?? toFieldKey(label, `field_${index + 1}`);

        // Legacy code sometimes stores type as `{ type: "text" }`
        const legacyTypeObject = field?.type && typeof field.type === "object" ? field.type.type : null;
        const type = field?.type && typeof field.type === "string" ? field.type : legacyTypeObject ?? "text";

        return {
            key,
            label,
            type,
            required: Boolean(field?.required),
            description: field?.description,
            default: field?.default,
            config: field?.config,
        };
    });
}

async function getAllForms(req, res) {
    try {
        const forms = await Form.find().select("name fields schemaVersion privacyMode"); // optimized to not fetch responses
        res.json(forms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function createForm(req, res) {
    try {
        const { name, schema, fields, responses, privacyMode } = req.body;

        const normalizedFields = normalizeFields({ schema, fields }).map(sanitizeField);
        const sanitizedName = sanitizeString(name, 200);
        validateFormDefinition(sanitizedName, normalizedFields);

        const embeddedResponses = await Promise.all(
            (responses || []).map(async (response) => {
                const data = response?.data ?? response;
                return {
                    mode: "plaintext",
                    data,
                    embedding: await ragService.generateEmbedding(JSON.stringify(data)),
                };
            })
        );

        const form = new Form({
            name: sanitizedName,
            schema: schema ?? (normalizedFields.length ? { fields: normalizedFields } : undefined),
            fields: normalizedFields,
            privacyMode: privacyMode ?? "encrypted",
            responses: embeddedResponses,
        });
        await form.save();

        res.json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function analyzeForm(req, res) {
    try {
        const { formId, question, contextOverride } = req.body;
        const result = await ragService.analyzeQuestion(formId, question, contextOverride);
        res.json(result);
    } catch (error) {
        console.error("Error in analyze:", error);
        res.status(500).json({ error: "An error occurred during analysis" });
    }
}

async function getFormById(req, res) {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).json({ error: "Form not found" });
        res.json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Public submission endpoint (Privacy-First)
export const submitResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { encryptedData, iv, salt, embedding, data, mode } = req.body;

        const form = await Form.findById(id);
        if (!form) return res.status(404).json({ error: "Form not found" });

        const schemaVersionUsed = form.schemaVersion ?? 1;
        const privacyMode = form.privacyMode ?? "encrypted";

        if (privacyMode === "encrypted") {
            if (!encryptedData || !iv || !salt || !Array.isArray(embedding)) {
                return res.status(400).json({ error: "Encrypted submission requires encryptedData, iv, salt, and embedding." });
            }

            const response = {
                mode: "encrypted",
                encryptedData,
                iv,
                salt,
                embedding,
                schemaVersionUsed,
            };

            const updatedForm = await Form.findByIdAndUpdate(id, {
                $push: {
                    responses: response
                }
            }, { new: true });

            const lastResponse = updatedForm.responses[updatedForm.responses.length - 1];

            await ragService.addResponse(
                id,
                lastResponse._id.toString(),
                embedding,
                {
                    mode: "encrypted",
                }
            );

            return res.status(200).json({ message: "Response submitted securely" });
        }

        // Plaintext submission (privacyMode: none)
        if (privacyMode === "none") {
            if (data === undefined) {
                return res.status(400).json({ error: "Plaintext submission requires data." });
            }

            const cleanedData = validateAndSanitizeResponse(form.fields || [], data);
            const computedEmbedding = Array.isArray(embedding)
                ? embedding
                : await ragService.generateEmbedding(JSON.stringify(cleanedData));

            const response = {
                mode: "plaintext",
                data: cleanedData,
                embedding: computedEmbedding,
                schemaVersionUsed,
            };

            const updatedForm = await Form.findByIdAndUpdate(id, {
                $push: {
                    responses: response
                }
            }, { new: true });

            const lastResponse = updatedForm.responses[updatedForm.responses.length - 1];

            const metadata =
                response?.data && typeof response.data === "object" && !Array.isArray(response.data)
                    ? { __recordId: lastResponse._id.toString(), mode: "plaintext", ...response.data }
                    : { __recordId: lastResponse._id.toString(), mode: "plaintext", value: response.data };

            await ragService.addResponse(
                id,
                lastResponse._id.toString(),
                response.embedding,
                { mode: "plaintext", data: response.data }
            );

            return res.status(200).json({ message: "Response submitted (plaintext)" });
        }

        return res.status(400).json({ error: `Unsupported privacyMode: ${privacyMode}` });

    } catch (error) {
        console.error("Submission error:", error);
        res.status(500).json({ error: error.message });
    }
};

export default {
    getAllForms,
    createForm,
    analyzeForm,
    getFormById,
    submitResponse
};
