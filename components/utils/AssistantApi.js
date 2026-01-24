import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config';

// Default settings if Firestore config is missing
const defaultOrgSettings = {
    Name: "Bibliothèque ENSPY",
    Address: "Yaoundé, Cameroun",
    Contact: {
        Email: "bibliotheque@enspy.cm",
        Phone: "+237 123456789",
        WhatsApp: "+237 123456789",
        Facebook: "Bibliothèque ENSPY",
        Instagram: "@biblio_enspy"
    },
    OpeningHours: {
        Monday: "8h00 - 18h00",
        Tuesday: "8h00 - 18h00",
        Wednesday: "8h00 - 18h00",
        Thursday: "8h00 - 18h00",
        Friday: "8h00 - 18h00",
        Saturday: "9h00 - 14h00",
        Sunday: "Fermé"
    },
    MaximumSimultaneousLoans: 3,
    LateReturnPenalties: ["Suspension de prêt", "Amende de 100 FCFA par jour"],
    SpecificBorrowingRules: ["Carte étudiante obligatoire", "Durée max: 14 jours"]
};

export class AssistantApi {
    constructor() {
        this.cache = {
            libraryInfo: new Map(),
            orgSettings: null,
        };
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    async checkHealth() {
        // Simple check to see if database is reachable
        try {
            // Using a lightweight read or just assuming true if initialized
            return !!db;
        } catch (e) {
            return false;
        }
    }

    async getLibraryInfo(orgName = 'OrgSettings') {
        try {
            const settings = await this.fetchOrgConfiguration(orgName);
            return {
                name: settings.Name,
                address: settings.Address,
                contact: settings.Contact,
                openingHours: settings.OpeningHours,
                borrowingRules: {
                    maxLoans: settings.MaximumSimultaneousLoans,
                    latePenalties: settings.LateReturnPenalties,
                    specificRules: settings.SpecificBorrowingRules
                }
            };
        } catch (e) {
            console.error("Error fetching library info", e);
            return null;
        }
    }

    async getQuickSuggestions(orgName = 'OrgSettings') {
        const settings = await this.fetchOrgConfiguration(orgName);
        const suggestions = [
            { text: "📅 Horaires", query: "Quels sont les horaires d'ouverture ?" },
            { text: "📚 Règles", query: "Quelles sont les règles d'emprunt ?" },
            { text: "📞 Contact", query: "Comment contacter la bibliothèque ?" },
        ];

        if (settings.Address) {
            suggestions.push({ text: "📍 Adresse", query: "Où se trouve la bibliothèque ?" });
        }

        // Add specific searches
        suggestions.push({ text: "🔍 Chercher un livre", query: "Chercher un livre" });

        return suggestions;
    }

    async checkBookAvailabilityDirect(bookName, author) {
        try {
            const availability = await this.checkBookAvailability(bookName, author);
            return this.formatBookAvailability(availability);
        } catch (error) {
            console.error('[AssistantApi] Error in checkBookAvailabilityDirect:', error);
            return "❌ Impossible de vérifier la disponibilité. Veuillez contacter la bibliothèque.";
        }
    }

    // Get assistant response
    async getAssistantResponse(queryText, orgName = 'OrgSettings') {
        try {
            const orgSettings = await this.fetchOrgConfiguration(orgName);
            const normalizedQuery = queryText.toLowerCase().trim();

            if (this.containsAny(normalizedQuery, ['bonjour', 'salut', 'hello', 'hey', 'coucou'])) {
                return `Bonjour! Bienvenue à la ${orgSettings.Name}. Je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?`;
            }

            // ... (rest of simple string checks can stay for speed, or we fallback to RAG)
            return null;
        } catch (err) {
            console.error('Error in assistant response:', err);
            return null;
        }
    }

    /**
     * RAG Knowledge Base Query
     * Returns structured data for LLM processing
     */
    async queryKnowledgeBase(queryText, orgSettings) {
        const lowerQuery = queryText.toLowerCase();
        let contextData = {
            libraryInfo: orgSettings,
            booksFound: [],
            thesisFound: [],
            matchFound: false
        };

        try {
            // 1. Check if it's about books
            if (this.containsAny(lowerQuery, ['livre', 'lire', 'titre', 'auteur', 'disponible', 'recherche', 'chercher'])) {
                const searchTerms = lowerQuery.replace(/(livre|lire|titre|auteur|recherche|chercher|un|le|la|les|pour|dans)/g, '').trim();
                if (searchTerms.length > 2) {
                    const books = await this.searchCollection('BiblioBooks', searchTerms);
                    contextData.booksFound = books;
                    if (books.length > 0) contextData.matchFound = true;
                }
            }

            // 2. Check if it's about memoirs/theses
            if (this.containsAny(lowerQuery, ['mémoire', 'thèse', 'thesis', 'académique', 'recherche'])) {
                const searchTerms = lowerQuery.replace(/(mémoire|thèse|thesis|recherche|un|le|la|les|pour|dans)/g, '').trim();
                if (searchTerms.length > 2) {
                    const theses = await this.searchCollection('BiblioThesis', searchTerms);
                    contextData.thesisFound = theses;
                    if (theses.length > 0) contextData.matchFound = true;
                }
            }

            // 3. Mark match as true if query is about rules/hours (data is already in libraryInfo)
            if (this.containsAny(lowerQuery, ['règle', 'heure', 'horaire', 'contact', 'adresse', 'localisation', 'pénalité', 'amende'])) {
                contextData.matchFound = true;
            }

            return contextData;
        } catch (error) {
            console.error("Error in queryKnowledgeBase:", error);
            return contextData;
        }
    }

    async searchCollection(collectionName, searchTerms) {
        try {
            const ref = collection(db, collectionName);
            const snapshot = await getDocs(ref);
            const results = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const name = (data.name || data.title || '').toLowerCase();
                const desc = (data.description || data.cathegorie || data.departement || '').toLowerCase();

                if (name.includes(searchTerms.toLowerCase()) || desc.includes(searchTerms.toLowerCase())) {
                    results.push({
                        id: doc.id,
                        title: data.name || data.title,
                        category: data.cathegorie || data.departement,
                        author: data.auteur || 'Inconnu',
                        available: (data.exemplaire || 0) > 0,
                        count: data.exemplaire || 0
                    });
                }
            });
            return results.slice(0, 5);
        } catch (e) {
            console.error(`Search error in ${collectionName}:`, e);
            return [];
        }
    }

    // Check book availability
    async checkBookAvailability(bookName, author) {
        try {
            console.log(`[AssistantApi] Searching for book: "${bookName}"${author ? ` by ${author}` : ''}`);

            const booksCollectionRef = collection(db, 'BiblioBooks');
            let books = [];

            // Simple broad search first
            const allBooksSnapshot = await getDocs(booksCollectionRef);
            allBooksSnapshot.forEach((doc) => {
                const data = doc.data();
                const bookTitle = data.name || data.title || '';
                const bookCategory = data.cathegorie || '';

                // Match title or category
                if (bookTitle.toLowerCase().includes(bookName.toLowerCase()) ||
                    bookCategory.toLowerCase().includes(bookName.toLowerCase())) {
                    books.push({ id: doc.id, ...data });
                }
            });

            if (books.length === 0) {
                return {
                    available: false,
                    bookName,
                    author,
                    canReserve: false,
                    reasons: ["❌ Livre non trouvé dans notre catalogue"],
                    currentStatus: 'unavailable'
                };
            }

            // Select best match (first one for now)
            const book = books[0];
            const bookId = book.id;
            const bookTitle = book.name || book.title || bookName;
            const totalCopies = parseInt(book.exemplaire || book.exemplaires || 0);

            // Check copies in use
            const usersCollectionRef = collection(db, 'BiblioUser');
            const usersSnapshot = await getDocs(usersCollectionRef);

            let inUseCopies = 0;
            const inUseDetails = [];

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                // Check all state slots (etat1...etat10)
                for (let i = 1; i <= 10; i++) {
                    const stateKey = `etat${i}`;
                    const tabKey = `tabEtat${i}`;

                    if (userData[stateKey] && (userData[stateKey] === 'reserv' || userData[stateKey] === 'emprunt')) {
                        const tabData = userData[tabKey];
                        // tabData format usually [id, title, ...]
                        if (tabData && (tabData[0] === bookId || (tabData[1] && tabData[1].includes(bookTitle)))) {
                            inUseCopies++;
                            const userName = userData.email || 'un utilisateur'; // Don't expose names if privacy concern, but okay for internal logic
                            const status = userData[stateKey] === 'reserv' ? 'réservé' : 'emprunté';
                            // We won't show user details to public bot, just count
                        }
                    }
                }
            }

            const availableCopies = Math.max(0, totalCopies - inUseCopies);
            const canReserve = availableCopies > 0;

            const reasons = [];
            if (availableCopies > 0) {
                reasons.push(`✅ ${availableCopies} exemplaire(s) disponible(s) sur ${totalCopies}`);
            } else {
                reasons.push("❌ Tous les exemplaires sont actuellement empruntés ou réservés.");
            }

            let currentStatus = availableCopies > 0 ? 'available' : 'unavailable';
            if (inUseCopies > 0 && availableCopies === 0) currentStatus = 'borrowed';

            return {
                available: availableCopies > 0,
                bookName: bookTitle,
                author: book.auteur || author,
                canReserve,
                reasons,
                currentStatus,
                exemplaireCount: availableCopies
            };

        } catch (error) {
            console.error('[AssistantApi] Error checking book availability:', error);
            return {
                available: false,
                bookName,
                canReserve: false,
                reasons: ["❌ Erreur lors de la vérification."],
                currentStatus: 'unavailable'
            };
        }
    }

    // Helpers
    async fetchOrgConfiguration(orgName) {
        // Return default settings directly as we likely don't have the Config collection set up yet
        // Or try to fetch, fallback to default
        try {
            // Uncomment if you actually have this collection
            /*
            const ref = doc(db, 'Configuration', orgName);
            const snap = await getDoc(ref);
            if (snap.exists()) return { ...defaultOrgSettings, ...snap.data() };
            */
            return defaultOrgSettings;
        } catch (e) {
            return defaultOrgSettings;
        }
    }

    containsAny(query, keywords) {
        return keywords.some(keyword => query.includes(keyword));
    }

    extractBookInfoFromQuery(query) {
        const cleanQuery = query
            .replace(/^(est-ce que|je cherche|je veux|trouver|chercher)/i, '')
            .replace(/(livre|roman|document|mémoire)/i, '')
            .replace(/^(le|la|les|un|une|des)/i, '')
            .trim();

        // Simple extraction: assume remaining text is the book name
        return { bookName: cleanQuery, author: null };
    }

    formatBookAvailability(availability) {
        let response = `📚 Information sur "${availability.bookName}"`;
        if (availability.author) response += ` par ${availability.author}`;
        response += '\n\n';

        response += availability.available ? "🟢 **DISPONIBLE**\n" : "🔴 **INDISPONIBLE**\n";

        if (availability.reasons) {
            availability.reasons.forEach(r => response += `${r}\n`);
        }

        if (availability.canReserve) {
            response += "\n💡 Vous pouvez le réserver via l'application.";
        }

        return response;
    }

    formatOpeningHours(hours, name) {
        // Simplified formatting
        let res = `🕐 Horaires d'ouverture (${name}):\n`;
        Object.entries(hours).forEach(([day, hour]) => {
            res += `• ${day}: ${hour}\n`;
        });
        return res;
    }

    formatBorrowingRules(config) {
        return `📚 Règles d'emprunt:\n• Max emprunts: ${config.MaximumSimultaneousLoans}\n• Durée: 14 jours\n• Pénalités: ${config.LateReturnPenalties.join(', ')}`;
    }

    formatContactInfo(contact) {
        let res = "📞 Contacts:\n";
        if (contact.Phone) res += `• Tél: ${contact.Phone}\n`;
        if (contact.Email) res += `• Email: ${contact.Email}\n`;
        return res;
    }

    formatAddress(address) {
        return `📍 Adresse:\n${address}`;
    }
}
