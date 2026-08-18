import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    description: { type: String },
    privacy: {
      type: String,
      enum: ["private", "derived", "redacted_analyzable", "analyzable"],
    },
    config: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const formsSchema = new mongoose.Schema(
  {
    ownerId: { type: String, index: true },
    name: { type: String, required: true },

    schema: { type: mongoose.Schema.Types.Mixed },
    schemaVersion: { type: Number, default: 1 },

    fields: { type: [fieldSchema], default: [] },

    privacyMode: { type: String, enum: ["none", "encrypted"], default: "encrypted" },
  },
  { timestamps: true }
);

export default mongoose.model("Forms", formsSchema);
