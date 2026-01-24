
const { AssistantApi } = require('./components/utils/AssistantApi');
const { runLibraryBot } = require('./gemini');

// Mock orgSettings for testing
const mockOrgSettings = {
    Name: "Bibliothèque de Test",
    OpeningHours: { Monday: "8h-18h", Friday: "8h-16h" },
    MaximumSimultaneousLoans: 3,
    LateReturnPenalties: ["Suspension"],
    Contact: { Email: "test@library.com" }
};

async function testRAG() {
    const api = new AssistantApi();

    console.log("--- TEST 1: Knowledge Base Query (Books) ---");
    const bookQuery = "Est-ce que vous avez des livres sur l'informatique ?";
    const context = await api.queryKnowledgeBase(bookQuery, mockOrgSettings);
    console.log("Context match found:", context.matchFound);
    console.log("Books found count:", context.booksFound.length);

    console.log("\n--- TEST 2: Gemini RAG Response ---");
    try {
        const response = await runLibraryBot(bookQuery, [], context);
        console.log("Gemini Response:\n", response);
    } catch (e) {
        console.log("Gemini Call Failed (Expected if API key/env missing in node env):", e.message);
    }

    console.log("\n--- TEST 3: General Knowledge Fallback ---");
    const generalQuery = "Comment bien réviser pour ses examens ?";
    const emptyContext = await api.queryKnowledgeBase(generalQuery, mockOrgSettings);
    console.log("Match found for general query:", emptyContext.matchFound);

    try {
        const genResponse = await runLibraryBot(generalQuery, [], emptyContext);
        console.log("Gemini General Response:\n", genResponse);
    } catch (e) {
        console.log("Gemini Call Failed:", e.message);
    }
}

// Running the test
console.log("Starting RAG Verification Test...");
// Since this is designed for React Native environment, direct node execution might fail on imports.
// This is a logic verification script.
testRAG().then(() => console.log("\nTests completed.")).catch(console.error);
