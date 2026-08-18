import mongoose from "mongoose";

const formDraftSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    draftKey: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

formDraftSchema.index({ ownerId: 1, draftKey: 1 }, { unique: true });

export default mongoose.model("FormDrafts", formDraftSchema);
