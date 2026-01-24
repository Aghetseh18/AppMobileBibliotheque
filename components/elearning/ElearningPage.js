import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    FlatList,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { UserContext } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';

const { WIDTH, HEIGHT } = Dimensions.get('window');

const ELearningPage = ({ navigation }) => {
    const { t } = useTranslation();
    const { currentUserNewNav } = useContext(UserContext);
    const [allLivres, setAllLivres] = useState([]);
    const [allMemoires, setAllMemoires] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('livres'); // 'livres' ou 'memoires'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        if (!currentUserNewNav?.email) {
            setLoading(false);
            return;
        }
        loadAllData();
    }, [currentUserNewNav?.email]);

    useEffect(() => {
        setCurrentPage(1); // Reset pagination when switching tabs
    }, [activeTab]);

    const loadAllData = async () => {
        try {
            setLoading(true);

            console.log('Début du chargement des données...');

            // Charger les livres
            const livres = await loadLivres();
            console.log(`${livres.length} livres chargés`);
            setAllLivres(livres);

            // Charger les mémoires
            const memoires = await loadMemoires();
            console.log(`${memoires.length} mémoires chargés`);
            setAllMemoires(memoires);

            console.log('Chargement des données terminé');

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            // En cas d'erreur, au moins définir des tableaux vides
            setAllLivres([]);
            setAllMemoires([]);
        } finally {
            setLoading(false);
        }
    };

    const loadLivres = async () => {
        const livreCollections = ['BiblioBooks'];
        let allLivres = [];

        for (const collectionName of livreCollections) {
            try {
                const q = query(collection(db, collectionName), orderBy('name', 'asc'));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    const bookData = doc.data();
                    // Vérifier que les données essentielles existent
                    if (bookData && bookData.name) {
                        allLivres.push({
                            id: `livre_${collectionName}_${doc.id}`,
                            name: bookData.name || t('untitled'),
                            cathegorie: bookData.cathegorie || t('uncategorized'),
                            image: bookData.image || null,
                            desc: bookData.desc || bookData.description || 'Description non disponible',
                            exemplaire: bookData.exemplaire || 0,
                            collection: collectionName,
                            originalId: doc.id,
                            salle: bookData.salle || t('consultation_on_site'),
                            etagere: bookData.etagere || t('consultation_on_site')
                        });
                    }
                });
            } catch (error) {
                console.error(`Erreur lors du chargement de ${collectionName}:`, error);
            }
        }

        return allLivres.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    };

    const loadMemoires = async () => {
        try {
            const memoireQuery = query(collection(db, 'BiblioThesis'));
            const memoireSnapshot = await getDocs(memoireQuery);

            let allMemoires = [];
            memoireSnapshot.forEach((doc) => {
                const memoireData = doc.data();
                // Vérifier que les données essentielles existent
                if (memoireData) {
                    allMemoires.push({
                        id: `memoire_${doc.id}`,
                        name: memoireData.name || t('untitled'),
                        cathegorie: memoireData.département || t('uncategorized'),
                        image: memoireData.image || null,
                        desc: memoireData.abstract || 'Description non disponible',
                        exemplaire: 1, // Par défaut pour les mémoires
                        collection: 'Memoire',
                        originalId: doc.id,
                        salle: 'Bibliothèque principale', // Valeur par défaut
                        etagere: memoireData.etagere || 'Section mémoires',
                        // Champs spécifiques aux thèses/mémoires
                        annee: memoireData.annee,
                        superviseur: memoireData.superviseur,
                        keywords: memoireData.keywords,
                        pdfUrl: memoireData.pdfUrl,
                        matricule: memoireData.matricule,
                        theme: memoireData.theme,
                        commentaire: memoireData.commentaire || [],
                        createdAt: memoireData.createdAt
                    });
                }
            });

            return allMemoires.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } catch (error) {
            console.error('Erreur lors du chargement des mémoires:', error);
            return [];
        }
    };

    const handleItemPress = (item) => {
        try {
            const isMemoire = activeTab === 'memoires';

            // Vérifier que toutes les données nécessaires sont présentes
            if (!item || !item.name) {
                console.warn('Données d\'item manquantes:', item);
                return;
            }

            if (isMemoire) {
                navigation.navigate('MemoireDetails', {
                    name: item.name,
                    cathegorie: item.cathegorie || 'Non classé',
                    image: item.image || null,
                    desc: item.desc || 'Description disponible dans les détails',
                    exemplaire: 1,
                    type: 'Memoire',
                    salle: item.salle || 'Bibliothèque principale',
                    etagere: item.etagere || 'Section mémoires',
                    nomBD: item.originalId || item.id,
                    commentaire: item.commentaire || [],
                    datUser: currentUserNewNav,
                    annee: item.annee,
                    superviseur: item.superviseur,
                    keywords: item.keywords,
                    pdfUrl: item.pdfUrl,
                    matricule: item.matricule,
                    theme: item.theme,
                    createdAt: item.createdAt
                });
            } else {
                navigation.navigate('Produit', {
                    name: item.name,
                    cathegorie: item.cathegorie || 'Non classé',
                    image: item.image || null,
                    desc: item.desc || 'Description disponible dans les détails',
                    exemplaire: item.exemplaire || 0,
                    type: item.cathegorie || 'Non classé',
                    salle: item.salle || 'À voir sur place',
                    etagere: item.etagere || 'À voir sur place',
                    nomBD: item.originalId || item.id,
                    commentaire: [],
                    datUser: currentUserNewNav
                });
            }
        } catch (error) {
            console.error('Erreur lors de la navigation vers Produit:', error);
        }
    };

    const getCurrentData = () => {
        return activeTab === 'livres' ? allLivres : allMemoires;
    };

    const getPaginatedData = () => {
        const data = getCurrentData();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const totalPages = Math.ceil(getCurrentData().length / itemsPerPage);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.itemCard}
            onPress={() => handleItemPress(item)}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemImageContainer}>
                    {item.image ? (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.itemImage}
                        />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons
                                name={activeTab === 'livres' ? 'book' : 'document-text'}
                                size={24}
                                color="#999"
                            />
                        </View>
                    )}
                </View>

                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                        {item.name || t('untitled')}
                    </Text>
                    <Text style={styles.itemCategory} numberOfLines={1}>
                        {item.cathegorie || t('uncategorized')}
                    </Text>
                    <Text style={[
                        styles.availabilityText,
                        item.exemplaire > 0 ? styles.available : styles.unavailable
                    ]}>
                        {item.exemplaire > 0 ?
                            `${item.exemplaire} ${t('available_exemplaires')}` :
                            t('unavailable')
                        }
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
        </TouchableOpacity>
    );

    const renderTabButton = (tabKey, title, count) => (
        <TouchableOpacity
            style={[
                styles.tabButton,
                activeTab === tabKey && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tabKey)}
        >
            <Text style={[
                styles.tabText,
                activeTab === tabKey && styles.activeTabText
            ]}>
                {title} ({count})
            </Text>
        </TouchableOpacity>
    );

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <View style={styles.paginationContainer}>
                <TouchableOpacity
                    style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
                    onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? "#ccc" : "#007AFF"} />
                </TouchableOpacity>

                <Text style={styles.pageText}>
                    {currentPage} / {totalPages}
                </Text>

                <TouchableOpacity
                    style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
                    onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                >
                    <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? "#ccc" : "#007AFF"} />
                </TouchableOpacity>
            </View>
        );
    };

    if (!currentUserNewNav?.email) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loginPromptContainer}>
                    <Text style={styles.loginPromptText}>
                        {t('login_required_msg')}
                    </Text>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('LoginScreen')}
                    >
                        <Text style={styles.loginButtonText}>{t('login_action')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('library_title')}</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={loadAllData}
                >
                    <Ionicons name="refresh" size={22} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {renderTabButton('livres', t('tab_books_label'), allLivres.length)}
                {renderTabButton('memoires', t('tab_theses_label'), allMemoires.length)}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>{t('loading_data')}</Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={getPaginatedData()}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons
                                    name={activeTab === 'livres' ? 'book' : 'document-text'}
                                    size={48}
                                    color="#ccc"
                                />
                                <Text style={styles.emptyText}>
                                    {activeTab === 'livres' ? t('no_book_available') : t('no_thesis_available')}
                                </Text>
                            </View>
                        }
                    />
                    {renderPagination()}
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
    },
    refreshButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },
    listContainer: {
        padding: 16,
    },
    itemCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    itemContent: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    itemImageContainer: {
        marginRight: 16,
    },
    itemImage: {
        width: 60,
        height: 80,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
    },
    placeholderImage: {
        width: 60,
        height: 80,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    itemCategory: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    availabilityText: {
        fontSize: 13,
        fontWeight: '500',
    },
    available: {
        color: '#34C759',
    },
    unavailable: {
        color: '#FF3B30',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 24,
    },
    paginationButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
    },
    disabledButton: {
        opacity: 0.5,
    },
    pageText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#000',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    loginPromptContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loginPromptText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    loginButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ELearningPage;