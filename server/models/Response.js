import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    responseId: { type: String, required: true, index: true },
    mode: { type: String, enum: ["encrypted", "plaintext"], required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    embedding: { type: [Number], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Responses", responseSchema);
