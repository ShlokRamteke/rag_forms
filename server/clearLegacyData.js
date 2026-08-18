import mongoose from "mongoose";
import config from "./config.js";

async function clearLegacyData() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(config.mongodbUri);
        console.log("Connected successfully.");

        console.log("Removing legacy embedded responses from Forms...");
        const formResult = await mongoose.connection.collection("forms").updateMany(
            { responses: { $exists: true } },
            { $unset: { responses: "" } }
        );
        console.log(`✅ Cleaned up ${formResult.modifiedCount} forms.`);

        console.log("\n🎉 Database is now clean! You can safely re-upload your files.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

clearLegacyData();
