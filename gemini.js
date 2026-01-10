// gemini.js - Version SIMPLE qui fonctionne
import {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} from "@google/generative-ai";

import { GEMINI_API_KEY } from "@env";

// REPLACE WITH YOUR NEW API KEY from https://aistudio.google.com/app/apikey
const apiKey = GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
});

const generationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 512, // Réponses plus courtes
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
        return response.text();
    } catch (error) {
        console.error("Error in Gemini API call:", error);
        throw error;
    }
}

// NOUVELLE FONCTION : Pour le chatbot bibliothèque AVEC CONTEXTE TEMPOREL
export async function runLibraryBot(userQuestion, conversationHistory = []) {
    // RÉCUPÉRER L'HEURE ACTUELLE (LOCALE DE L'UTILISATEUR)
    const now = new Date();

    // FORCER L'HEURE LOCALE (pas UTC)
    const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));

    const timeInfo = {
        hour: localTime.getHours(),
        minute: localTime.getMinutes(),
        day: localTime.toLocaleDateString('fr-FR', { weekday: 'long' }),
        date: localTime.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }),
        timeString: localTime.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    console.log('=== DEBUG HEURE ===');
    console.log('Heure détectée:', timeInfo.hour);
    console.log('Heure complète:', timeInfo.timeString);

    // DÉTERMINER LE MOMENT DE LA JOURNÉE
    let greeting = "Bonjour";
    let timeContext = "";

    if (timeInfo.hour >= 5 && timeInfo.hour < 12) {
        greeting = "Bonjour";
        timeContext = "ce matin";
    } else if (timeInfo.hour >= 12 && timeInfo.hour < 18) {
        greeting = "Bonjour";
        timeContext = "cet après-midi";
    } else if (timeInfo.hour >= 18 && timeInfo.hour < 22) {
        greeting = "Bonsoir";
        timeContext = "ce soir";
    } else {
        greeting = "Bonsoir";
        timeContext = "cette nuit";
    }

    console.log('Salutation choisie:', greeting);

    if (timeInfo.hour >= 5 && timeInfo.hour < 12) {
        greeting = "Bonjour";
        timeContext = "ce matin";
    } else if (timeInfo.hour >= 12 && timeInfo.hour < 18) {
        greeting = "Bonjour";
        timeContext = "cet après-midi";
    } else if (timeInfo.hour >= 18 && timeInfo.hour < 22) {
        greeting = "Bonsoir";
        timeContext = "ce soir";
    } else {
        greeting = "Bonsoir";
        timeContext = "cette nuit";
    }

    // ANALYSER LE CONTEXTE DE LA CONVERSATION
    const userMessageLower = userQuestion.toLowerCase();
    const isGreeting = userMessageLower.includes - ('bonjour') ||
        userMessageLower.includes('bonsoir') ||
        userMessageLower.includes('salut') ||
        userMessageLower.includes('hello') ||
        userMessageLower.includes('hi');

    // VÉRIFIER SI C'EST LA PREMIÈRE INTERACTION (historique vide ou très court)
    const isFirstInteraction = !conversationHistory || conversationHistory.length <= 2;

    // DÉTERMINER S'IL FAUT SALUER
    const shouldGreet = isGreeting || isFirstInteraction;

    const systemPrompt = `Tu es l'assistant virtuel d'une bibliothèque universitaire francophone.

CONTEXTE TEMPOREL ACTUEL :
- Heure actuelle : ${timeInfo.timeString}
- Jour : ${timeInfo.day}
- Date : ${timeInfo.date}
- Moment : ${timeContext}
- Salutation appropriée : ${greeting}

CONTEXTE DE LA CONVERSATION :
- L'utilisateur dit : "${userQuestion}"
- Est-ce une salutation de l'utilisateur ? ${isGreeting ? 'Oui' : 'Non'}
- Dois-je saluer ? ${shouldGreet ? 'Oui' : 'Non'}
- Nombre de messages dans l'historique : ${conversationHistory ? conversationHistory.length : 0}

CONTEXTE DE LA BIBLIOTHÈQUE :
- Services : Emprunts de livres, réservations, recherche documentaire
- Départements : Génie Électrique, Informatique, Mécanique, Télécommunications  
- Durée d'emprunt : 2 semaines
- Application : BiblioApp pour étudiants

INSTRUCTIONS IMPORTANTES :
- ${shouldGreet ? `Commence par "${greeting} !" puis réponds à la question` : 'Ne salue PAS, réponds directement à la question'}
- Sois naturel et conversationnel, comme un vrai bibliothécaire
- Adapte ton langage au moment de la journée si pertinent
- Réponds en français, de manière amicale et professionnelle
- Sois concis (2-3 phrases maximum)
- Donne des conseils pratiques
- Si tu ne sais pas quelque chose de spécifique, recommande de contacter la bibliothécaire

EXEMPLES DE RÉPONSES :
${shouldGreet ?
            `- Si salutation nécessaire : "${greeting} ! Comment puis-je vous aider ?"` :
            `- Réponse directe sans salutation : "Bien sûr, je peux vous aider avec..."`
        }

Question de l'étudiant : ${userQuestion}`;

    try {
        return await run(systemPrompt);
    } catch (error) {
        console.error('Erreur dans runLibraryBot:', error);
        // Réponse de fallback avec l'heure
        const fallbackGreeting = shouldGreet ? `${greeting} ! ` : '';
        return `${fallbackGreeting}Je rencontre une difficulté technique ${timeContext}. La bibliothécaire vous répondra directement pour vous aider au mieux.`;
    }
}

// Export par défaut - GARDEZ VOTRE FONCTION EXISTANTE
export default run;