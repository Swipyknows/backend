import { pipeline } from "@xenova/transformers";

let extractor = null;

/**
 * Initializes or retrieves the singleton feature-extraction pipeline.
 */
export const getExtractor = async () => {
    if (!extractor) {
        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    return extractor;
};

/**
 * Generates a 384-dimensional normalized vector embedding for the given text.
 * @param {string} text
 * @returns {Promise<number[]>} Array of floating-point numbers representing the embedding vector.
 */
export const generateEmbedding = async (text) => {
    if (!text || typeof text !== "string" || !text.trim()) {
        return [];
    }

    try {
        const pipe = await getExtractor();
        // Mean pooling and normalization
        const output = await pipe(text.trim(), { pooling: "mean", normalize: true });
        return Array.from(output.data);
    } catch (error) {
        console.error("Error generating text embedding:", error);
        return [];
    }
};

/**
 * Calculates cosine similarity between two numeric vectors.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Cosine similarity score between -1 and 1 (or 0 if vectors are invalid).
 */
export const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Aggregates multiple video embedding vectors into a single user interest vector,
 * giving higher weights to recent/frequently interacted videos.
 * @param {Array<number[]>} videoVectors List of vector embeddings.
 * @returns {number[]} Aggregated normalized vector.
 */
export const aggregateUserInterestVector = (videoVectors) => {
    if (!videoVectors || videoVectors.length === 0) return [];
    
    const validVectors = videoVectors.filter(v => Array.isArray(v) && v.length > 0);
    if (validVectors.length === 0) return [];

    const dimensions = validVectors[0].length;
    const aggregated = new Array(dimensions).fill(0);
    
    // Apply linear decay weight: recent interactions have higher weight
    let totalWeight = 0;
    const totalCount = validVectors.length;

    validVectors.forEach((vector, index) => {
        // Weight from 0.5 (oldest) to 1.0 (newest)
        const weight = 0.5 + (0.5 * (index + 1)) / totalCount;
        totalWeight += weight;

        for (let d = 0; d < dimensions; d++) {
            aggregated[d] += vector[d] * weight;
        }
    });

    if (totalWeight === 0) return [];

    // Normalize resulting vector
    let norm = 0;
    for (let d = 0; d < dimensions; d++) {
        aggregated[d] /= totalWeight;
        norm += aggregated[d] * aggregated[d];
    }

    norm = Math.sqrt(norm);
    if (norm > 0) {
        for (let d = 0; d < dimensions; d++) {
            aggregated[d] /= norm;
        }
    }

    return aggregated;
};
