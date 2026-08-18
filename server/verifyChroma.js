import { ChromaClient } from "chromadb";

async function verify() {
    console.log("Connecting to ChromaDB...");
    // const client = new ChromaClient({ path: "http://localhost:8000" }); 
    // Deprecated, use new construction if needed or ignore warning for now. 
    // Actually, documentation says path is still supported but maybe I should use just defaults? 
    // Defaults are http://localhost:8000.
    const client = new ChromaClient();

    try {
        const heartbeat = await client.heartbeat();
        console.log("Heartbeat:", heartbeat);

        const version = await client.version();
        console.log("Version:", version);

        console.log("Creating verification collection...");
        const collection = await client.getOrCreateCollection({
            name: "verification_test",
        });

        console.log("Adding dummy data...");
        await collection.upsert({
            ids: ["test_id"],
            embeddings: [[0.1, 0.2, 0.3]], // dimension 3 for test
            metadatas: [{ test: "true" }],
            documents: ["This is a test document"]
        });

        console.log("Querying data...");
        const results = await collection.query({
            queryEmbeddings: [[0.1, 0.2, 0.3]],
            nResults: 1
        });

        console.log("Query Result:", JSON.stringify(results));

        if (results.ids[0].includes("test_id")) {
            console.log("✅ VERIFICATION SUCCESSFUL: ChromaDB is ready!");
        } else {
            console.error("❌ VERIFICATION FAILED: Data mismatch.");
            process.exit(1);
        }

    } catch (e) {
        console.error("❌ VERIFICATION FAILED:", e);
        process.exit(1);
    }
}

verify();
