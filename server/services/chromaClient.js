import { ChromaClient } from "chromadb";

const client = new ChromaClient({
    // path: process.env.CHROMA_URL || "http://localhost:8000",
    // defaults are fine for localhost
});

async function getOrCreateCollection(name) {
    try {
        return await client.getOrCreateCollection({
            name,
            metadata: { "hnsw:space": "cosine" },
        });
    } catch (e) {
        console.error("Error getting/creating collection:", e);
        throw e;
    }
}

async function upsertPoints(collectionName, ids, embeddings, metadatas, documents) {
    const collection = await getOrCreateCollection(collectionName);
    await collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents,
    });
}

async function queryCollection(collectionName, queryEmbeddings, nResults = 5) {
    const collection = await getOrCreateCollection(collectionName);
    return await collection.query({
        queryEmbeddings,
        nResults,
    });
}

export default {
    client,
    getOrCreateCollection,
    upsertPoints,
    queryCollection,
};
