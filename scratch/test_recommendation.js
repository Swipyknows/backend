import {
    generateEmbedding,
    cosineSimilarity,
    aggregateUserInterestVector
} from "../src/utils/embedding.service.js";

async function runTests() {
    console.log("=== Testing Embedding & Recommendation Core Functions ===");

    // Test 1: Embedding generation
    console.log("\n[Test 1] Generating text embedding for 'Node.js backend tutorial'...");
    const text1 = "Node.js backend tutorial with Express and MongoDB";
    const vec1 = await generateEmbedding(text1);
    console.log(`Vector length: ${vec1.length}`);
    if (vec1.length !== 384) {
        throw new Error(`Expected vector dimension 384, got ${vec1.length}`);
    }
    console.log("PASSED: Generated 384-d vector successfully.");

    // Test 2: Cosine Similarity Relevancy Test
    console.log("\n[Test 2] Testing Cosine Similarity Relevancy...");
    const text2 = "JavaScript Express server backend development guide";
    const text3 = "Delicious Italian pasta cooking recipe step by step";

    const vec2 = await generateEmbedding(text2);
    const vec3 = await generateEmbedding(text3);

    const sim1_2 = cosineSimilarity(vec1, vec2);
    const sim1_3 = cosineSimilarity(vec1, vec3);

    console.log(`Similarity (Node.js backend vs JS Express backend): ${sim1_2.toFixed(4)}`);
    console.log(`Similarity (Node.js backend vs Pasta recipe): ${sim1_3.toFixed(4)}`);

    if (sim1_2 <= sim1_3) {
        throw new Error("Semantic similarity failed: Tech vs Tech should score higher than Tech vs Food");
    }
    console.log("PASSED: Related text scored higher than unrelated text.");

    // Test 3: User Interest Vector Aggregation
    console.log("\n[Test 3] Aggregating User Interest Vector...");
    const userInterestVec = aggregateUserInterestVector([vec1, vec2]);
    console.log(`Aggregated vector length: ${userInterestVec.length}`);
    const simInterest_Tech = cosineSimilarity(userInterestVec, vec1);
    const simInterest_Food = cosineSimilarity(userInterestVec, vec3);
    console.log(`User Interest vs Tech Video: ${simInterest_Tech.toFixed(4)}`);
    console.log(`User Interest vs Food Video: ${simInterest_Food.toFixed(4)}`);

    if (simInterest_Tech <= simInterest_Food) {
        throw new Error("User interest vector aggregation test failed");
    }
    console.log("PASSED: User interest vector correctly aligns with user watch history.");

    console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
