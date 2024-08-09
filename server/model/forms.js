import mongoose from "mongoose";

const formsSchema = new mongoose.Schema({
  name: String,
  fields: [{ name: String }],
  responses: [
    {
      data: mongoose.Schema.Types.Mixed,
      embedding: [Number],
    },
  ],
});

export default mongoose.model("Forms", formsSchema);
