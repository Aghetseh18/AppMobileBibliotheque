import { API_URL } from '../../apiConfig';

/**
 * Service to interact with the Railway Recommendation API
 */
export const RecommendationService = {

    /**
     * Get popular documents (books and theses)
     * GET /recommendations/popular
     */
    getPopularDocuments: async () => {
        try {
            const response = await fetch(`${API_URL}/recommendations/popular`);
            if (!response.ok) throw new Error('Failed to fetch popular documents');
            const data = await response.json();
            // Handle cases where API returns array directly or wrapped in object
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.popular_documents)) return data.popular_documents;
            if (data && Array.isArray(data.results)) return data.results;
            if (data && Array.isArray(data.documents)) return data.documents;
            return [];
        } catch (error) {
            console.error('[RecommendationService] Error fetching popular docs:', error);
            return [];
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
            if (response.status === 404) return []; // User not found specific case
            if (!response.ok) throw new Error('Failed to fetch personalized recommendations');
            return await response.json(); // Expected format: { "recommendations": [...] } or array
        } catch (error) {
            console.error('[RecommendationService] Error fetching personalized:', error);
            return [];
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

            if (response.status === 404) return { similar_documents: [] }; // Document not found
            if (!response.ok) throw new Error('Failed to fetch similar documents');

            const data = await response.json();
            // API returns: { base_document: {...}, similar_documents: [...] }
            return data;
        } catch (error) {
            console.error('[RecommendationService] Error fetching similar docs:', error);
            return { similar_documents: [] };
        }
    }
};
