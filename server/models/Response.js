import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    ownerId: { type: String, index: true },
    formId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    responseId: { type: String, required: true, index: true },
    mode: { type: String, enum: ["encrypted", "plaintext"], required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    analysisData: { type: mongoose.Schema.Types.Mixed },
    encryptedData: { type: String },
    iv: { type: String },
    salt: { type: String },
    authTag: { type: String },
    privacyVersion: { type: Number, default: 1 },
    embedding: { type: [Number], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

responseSchema.index({ formId: 1, ownerId: 1 });
responseSchema.index({ formId: 1, createdAt: -1 });

export default mongoose.model("Responses", responseSchema);
