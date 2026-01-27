import { API_URL } from '../../apiConfig';
import { collection, query, where, getDocs, limit, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../../config';

// Helper to normalize strings for comparison
const normalizeString = (str) => {
    if (!str) return '';
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .trim();
};

/**
 * Service to interact with the Railway Recommendation API
 * With Firebase Fallback
 */
export const RecommendationService = {

    /**
     * Fallback: Get recent books from Firestore
     */
    fetchRecentBooksFallback: async (count = 10) => {
        try {
            const booksRef = collection(db, 'BiblioBooks');
            // Assuming there might be a date field, otherwise just limit
            const q = query(booksRef, limit(count));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('[RecommendationService] Error in fetchRecentBooksFallback:', error);
            return [];
        }
    },

    /**
     * Fallback: Get books by category
     */
    fetchBooksByCategoryFallback: async (category, excludeTitle, count = 5) => {
        try {
            const booksRef = collection(db, 'BiblioBooks');
            const q = query(booksRef, where('cathegorie', '==', category), limit(count + 1));
            const snapshot = await getDocs(q);

            const results = [];
            const normalizedExclude = normalizeString(excludeTitle);

            snapshot.forEach(doc => {
                const data = doc.data();
                if (normalizeString(data.name) !== normalizedExclude && results.length < count) {
                    results.push({ id: doc.id, ...data });
                }
            });
            return results;
        } catch (error) {
            console.error('[RecommendationService] Error in fetchBooksByCategoryFallback:', error);
            return [];
        }
    },

    /**
     * Fallback: Get personalized recommendations based on user history
     */
    fetchPersonalizedFallback: async (userEmail) => {
        if (!userEmail) return [];
        try {
            const userRef = doc(db, 'BiblioUser', userEmail);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) return [];

            const userData = userSnap.data();
            const history = userData.docRecent || userData.historique || [];

            if (history.length === 0) {
                // No history, return generic recent books
                return await RecommendationService.fetchRecentBooksFallback(5);
            }

            // Extract preferred categories
            const categoryCounts = {};
            history.forEach(item => {
                const cat = item.cathegorieDoc || item.cathegorie;
                if (cat) {
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                }
            });

            const sortedCategories = Object.entries(categoryCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([cat]) => cat);

            if (sortedCategories.length === 0) {
                return await RecommendationService.fetchRecentBooksFallback(5);
            }

            // Fetch books from top category
            const topCategory = sortedCategories[0];
            const booksRef = collection(db, 'BiblioBooks');
            const q = query(booksRef, where('cathegorie', '==', topCategory), limit(6));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {
            console.error('[RecommendationService] Error in fetchPersonalizedFallback:', error);
            return [];
        }
    },

    /**
     * Get popular documents (books and theses)
     * GET /recommendations/popular
     */
    getPopularDocuments: async () => {
        try {
            const response = await fetch(`${API_URL}/recommendations/popular`);
            if (!response.ok) throw new Error('Failed to fetch popular documents');
            const data = await response.json();

            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.popular_documents)) return data.popular_documents;
            if (data && Array.isArray(data.results)) return data.results;
            if (data && Array.isArray(data.documents)) return data.documents;

            // If data format is unexpected, treat as error to trigger fallback
            throw new Error('Unexpected API response format');
        } catch (error) {
            console.warn('[RecommendationService] API failed for popular, using fallback:', error.message);
            return await RecommendationService.fetchRecentBooksFallback();
        }
    },

    /**
     * Get personalized recommendations based on user email
     * GET /recommendations/similar-users/{user_email}
     */
    getPersonalizedRecommendations: async (userEmail) => {
        if (!userEmail) return [];
        try {
            const response = await fetch(`${API_URL}/recommendations/similar-users/${encodeURIComponent(userEmail)}`);
            if (response.status === 404) {
                // User not found in API (new user?), use fallback
                console.log('[RecommendationService] User not found in API, using fallback');
                const fallbackData = await RecommendationService.fetchPersonalizedFallback(userEmail);
                return { recommendations: fallbackData };
            }
            if (!response.ok) throw new Error('Failed to fetch personalized recommendations');
            return await response.json();
        } catch (error) {
            console.warn('[RecommendationService] API failed for personalized, using fallback:', error.message);
            const fallbackData = await RecommendationService.fetchPersonalizedFallback(userEmail);
            return { recommendations: fallbackData };
        }
    },

    /**
     * Get similar documents for a given title
     * POST /similarbooks
     * Body: { "title": "Introduction to Python" }
     */
    getSimilarDocuments: async (title) => {
        if (!title) return { similar_documents: [] };
        try {
            const response = await fetch(`${API_URL}/similarbooks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title }),
            });

            if (response.status === 404) {
                // Document not found in API, try to find category locally and recommend
                // We don't have category here easily without fetching book, but caller might not pass it.
                // Ideally we'd need to look up the book first.
                // For now, return empty or implement a lookup if critical.
                // Let's rely on looking up the book by title to find its category.
                const booksRef = collection(db, 'BiblioBooks');
                const q = query(booksRef, where('name', '==', title), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const bookData = snap.docs[0].data();
                    if (bookData.cathegorie) {
                        const similar = await RecommendationService.fetchBooksByCategoryFallback(bookData.cathegorie, title);
                        return { similar_documents: similar };
                    }
                }
                return { similar_documents: [] };
            }

            if (!response.ok) throw new Error('Failed to fetch similar documents');

            const data = await response.json();
            return data;
        } catch (error) {
            console.warn('[RecommendationService] API failed for similar docs, using fallback:', error.message);

            // Fallback: Try to find the book in Firestore to get its category
            try {
                const booksRef = collection(db, 'BiblioBooks');
                const q = query(booksRef, where('name', '==', title), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const bookData = snap.docs[0].data();
                    if (bookData.cathegorie) {
                        const similar = await RecommendationService.fetchBooksByCategoryFallback(bookData.cathegorie, title);
                        return { similar_documents: similar };
                    }
                }
            } catch (fbError) {
                console.error('[RecommendationService] Fallback also failed:', fbError);
            }

            return { similar_documents: [] };
        }
    }
};
