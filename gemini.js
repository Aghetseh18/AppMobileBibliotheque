// gemini.js - Version SIMPLE qui fonctionne
import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai";

import { GEMINI_API_KEY } from "@env";

console.log("DEBUG: GEMINI_API_KEY loaded:", GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + "..." : "UNDEFINED");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
    }
});

const generationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2000,
};

// Votre fonction existante - GARDEZ-LA
async function run(prompt) {
    try {
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });
        const result = await chatSession.sendMessage(prompt);
        const response = await result.response;
        console.log("Gemini Response Metadata:", JSON.stringify(response, null, 2));
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Error in Gemini API call:", error);
        throw error;
    }
}

// NOUVELLE FONCTION : Pour le chatbot bibliothèque AVEC CONTEXTE TEMPOREL
// NOUVELLE FONCTION : Pour le chatbot bibliothèque AVEC CONTEXTE TEMPOREL ET RAG
export async function runLibraryBot(userQuestion, conversationHistory = [], libraryContext = null) {
    // RÉCUPÉRER L'HEURE ACTUELLE
    const now = new Date();
    const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));

    const timeInfo = {
        hour: localTime.getHours(),
        timeString: localTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        day: localTime.toLocaleDateString('fr-FR', { weekday: 'long' }),
        date: localTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    // DÉTERMINER LE MOMENT DE LA JOURNÉE
    let greeting = timeInfo.hour >= 5 && timeInfo.hour < 18 ? "Bonjour" : "Bonsoir";
    let timeContext = timeInfo.hour >= 5 && timeInfo.hour < 12 ? "ce matin" :
        timeInfo.hour >= 12 && timeInfo.hour < 18 ? "cet après-midi" : "ce soir";

    // ANALYSER LE CONTEXTE DE LA CONVERSATION
    const userMessageLower = userQuestion.toLowerCase();
    const isGreeting = userMessageLower.includes('bonjour') || userMessageLower.includes('bonsoir') || userMessageLower.includes('salut');
    const isFirstInteraction = !conversationHistory || conversationHistory.length <= 2;
    const shouldGreet = isGreeting || isFirstInteraction;

    // CONSTRUIRE LE BLOC DE DONNÉES RÉCUPÉRÉES (RAG)
    let ragContext = "";
    if (libraryContext) {
        ragContext = `\nDONNÉES RÉELLES RÉCUPÉRÉES DE LA BASE DE DONNÉES (Source de vérité) :
- Institution : ${libraryContext.libraryInfo?.Name || 'La bibliothèque'}
- Horaires : ${JSON.stringify(libraryContext.libraryInfo?.OpeningHours || {})}
- Contact : ${JSON.stringify(libraryContext.libraryInfo?.Contact || {})}
- Règles : Max emprunts=${libraryContext.libraryInfo?.MaximumSimultaneousLoans}, Pénalités=${JSON.stringify(libraryContext.libraryInfo?.LateReturnPenalties)}
`;

        if (libraryContext.booksFound?.length > 0) {
            ragContext += `\nLIVRES TROUVÉS DANS LE CATALOGUE :\n${libraryContext.booksFound.map(b => `- ${b.title} (${b.author}), Cat: ${b.category}, Dispo: ${b.available ? 'OUI' : 'NON'} (${b.count} expl)`).join('\n')}`;
        }

        if (libraryContext.thesisFound?.length > 0) {
            ragContext += `\nMÉMOIRES TROUVÉS DANS LE CATALOGUE :\n${libraryContext.thesisFound.map(t => `- ${t.title}, Dept: ${t.category}`).join('\n')}`;
        }

        if (!libraryContext.matchFound) {
            ragContext += "\nREMARQUE : Aucune donnée spécifique n'a été trouvée dans la base de données pour cette requête.";
        }
    }

    const systemPrompt = `Tu es l'assistant virtuel expert de la bibliothèque universitaire.

CONTEXTE TEMPOREL : ${timeInfo.day} ${timeInfo.date}, ${timeInfo.timeString} (${timeContext}).

${ragContext}

INSTRUCTIONS :
1. Si des DONNÉES RÉELLES sont présentes ci-dessus, résume-les et présente-les de manière claire et amicale à l'utilisateur.
2. Si AUCUNE donnée pertinente n'a été trouvée dans la base de données (matchFound=false), utilise tes connaissances générales pour répondre poliment, donner des conseils ou recommander des ressources.
3. Ne mentionne jamais "D'après la base de données" ou "Le contexte dit". Parle naturellement comme un bibliothécaire qui CONNAÎT ces informations.
4. Si l'utilisateur demande à réserver, explique qu'il peut le faire directement via le bouton "Réserver" sur la page du livre.
5. UTILISE LE FORMAT MARKDOWN pour embellir ta réponse :
   - Mets en **gras** les titres, noms importants ou mots-clés.
   - Utilise des listes à puces (-) pour énumérer les livres, horaires ou instructions.
   - Saute des lignes pour aérer le texte.
6. Sois concis et professionnel.

Question de l'étudiant : "${userQuestion}"`;

    try {
        // FILTER HISTORY TO ENSURE IT ALTERNATES CORRECTLY (Gemini requirement: starts with user)
        let processedHistory = (conversationHistory || []).map(m => ({
            role: m.isBot ? "model" : "user",
            parts: [{ text: m.text }],
        }));

        // Remove the first message if it's from model (Gemini history should start with user)
        if (processedHistory.length > 0 && processedHistory[0].role === "model") {
            processedHistory = processedHistory.slice(1);
        }

        const chatSession = model.startChat({
            generationConfig,
            history: processedHistory.slice(-10),
        });

        console.log("Sending message to Gemini...");
        const result = await chatSession.sendMessage(systemPrompt);
        console.log("Got result from Gemini");
        const response = result.response;
        console.log("Gemini Response Metadata:", JSON.stringify({
            finishReason: response.candidates?.[0]?.finishReason,
            usageMetadata: response.usageMetadata,
            safetyRatings: response.candidates?.[0]?.safetyRatings
        }, null, 2));

        const text = response.text();
        console.log("Gemini Text:", text);
        return text;
    } catch (error) {
        console.error('Erreur dans runLibraryBot:', error);
        throw error;
    }
}

// Export par défaut - GARDEZ VOTRE FONCTION EXISTANTE
export default run;