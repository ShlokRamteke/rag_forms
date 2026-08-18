import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        formId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        ownerId: { type: String, required: true, index: true },
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
    },
    { timestamps: true }
);

conversationSchema.index({ formId: 1, ownerId: 1, createdAt: 1 });

export default mongoose.model("Conversations", conversationSchema);
