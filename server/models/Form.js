import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true }, // arbitrary datatype identifier (e.g., "text", "number", "object", "my.custom.type")
    required: { type: Boolean, default: false },
    description: { type: String },
    default: { type: mongoose.Schema.Types.Mixed },
    config: { type: mongoose.Schema.Types.Mixed }, // validation/options/items/properties/ui hints, etc.
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["encrypted", "plaintext"], required: true },

    // Plaintext responses (admin imports / non-zero-knowledge)
    data: { type: mongoose.Schema.Types.Mixed },

    // Encrypted responses (privacy-first)
    encryptedData: { type: String },
    iv: { type: String },
    salt: { type: String },

    embedding: { type: [Number], required: true },
    schemaVersionUsed: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const formsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    // Canonical schema store (JSON-schema-like). The UI can use either this or `fields`.
    schema: { type: mongoose.Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1 },

    // Convenience representation for common builder flows
    fields: { type: [fieldSchema], default: [] },

    // Privacy defaults (can be extended later)
    privacyMode: { type: String, enum: ["none", "encrypted"], default: "encrypted" },

    responses: { type: [responseSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Forms", formsSchema);
