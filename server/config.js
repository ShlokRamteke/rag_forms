import dotenv from "dotenv";

dotenv.config();

export default {
  port: process.env.PORT || 5001,
  mongodbUri: process.env.MONGODB_URI,
};
