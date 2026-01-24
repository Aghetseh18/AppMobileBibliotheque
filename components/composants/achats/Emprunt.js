import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config';
import { UserContext } from '../../context/UserContext';
import { useTranslation } from '../../hooks/useTranslation';

export default function Emprunt({ navigation }) {
    const { t, currentLanguage } = useTranslation();
    const { currentUserNewNav } = useContext(UserContext);
    const [emprunts, setEmprunts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmprunts = async () => {
            if (!currentUserNewNav?.email) {
                setLoading(false);
                return;
            }

            try {
                // Écouter les changements du document utilisateur
                const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);
                const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data();
                        const empruntsData = [];

                        // Vérifier les 3 emplacements pour les emprunts
                        for (let i = 1; i <= 3; i++) {
                            const etat = userData[`etat${i}`];
                            const tabEtat = userData[`tabEtat${i}`];

                            console.log(`Vérification emplacement ${i}:`, { etat, tabEtat });

                            // Si l'état est "emprunt" et qu'il y a des données
                            if (etat === 'emprunt' && Array.isArray(tabEtat) && tabEtat.length >= 6) {
                                const emprunt = {
                                    id: `emprunt_${i}`,
                                    emplacement: i,
                                    titre: tabEtat[0],
                                    cathegorie: tabEtat[1],
                                    imageUrl: tabEtat[2],
                                    exemplairesRestants: tabEtat[3],
                                    collection: tabEtat[4],
                                    dateEmprunt: tabEtat[5], // Timestamp de la réservation/emprunt
                                    bookId: tabEtat[6] || null,
                                    statut: t('borrowed_status'),
                                    // Calculer la date de retour (par exemple, 2 semaines après l'emprunt)
                                    dateRetour: tabEtat[5] ? new Date(tabEtat[5].seconds * 1000 + 14 * 24 * 60 * 60 * 1000) : new Date()
                                };

                                console.log('Emprunt trouvé:', emprunt);
                                empruntsData.push(emprunt);
                            }
                        }

                        console.log(`${empruntsData.length} emprunts trouvés`);
                        setEmprunts(empruntsData);
                    } else {
                        console.log('Document utilisateur non trouvé');
                        setEmprunts([]);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Erreur lors de l'écoute des emprunts:", error);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Erreur lors de la récupération des emprunts:', error);
                setLoading(false);
            }
        };

        fetchEmprunts();
    }, [currentUserNewNav?.email]);

    const navigateToBibliotheque = () => {
        navigation.navigate('VueUn');
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={60} color="#CCCCCC" />
            <Text style={styles.emptyText}>{t('no_borrowed_books')}</Text>
            <Text style={styles.emptySubText}>{t('borrowed_books_placeholder')}</Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={navigateToBibliotheque}
            >
                <Text style={styles.browseButtonText}>{t('browse_library')}</Text>
            </TouchableOpacity>
        </View>
    );

    // Fonction cohérente pour formater les dates Firestore
    // Fonction cohérente pour formater les dates Firestore
    const formatFirestoreDate = (date) => {
        if (!date) return 'N/A';
        const locale = currentLanguage === 'Français' ? 'fr-FR' : 'en-US';

        // Si c'est un timestamp Firestore
        if (date.seconds) {
            return new Date(date.seconds * 1000).toLocaleDateString(locale);
        }
        // Si c'est déjà un objet Date
        if (date instanceof Date) {
            return date.toLocaleDateString(locale);
        }
        // Si c'est une chaîne ISO
        return new Date(date).toLocaleDateString(locale);
    };

    // Fonction pour vérifier si un emprunt est en retard
    const isEmpruntOverdue = (dateRetour) => {
        if (!dateRetour) return false;
        return new Date(dateRetour) < new Date();
    };

    const renderItem = ({ item }) => {
        // Vérification si la date d'échéance est dépassée
        const isOverdue = isEmpruntOverdue(item.dateRetour);

        return (
            <TouchableOpacity
                style={styles.bookItem}
                onPress={() => {
                    // Navigation vers les détails du livre
                    navigation.navigate('Produit', {
                        name: item.titre,
                        desc: '',
                        image: item.imageUrl,
                        cathegorie: item.cathegorie,
                        type: '',
                        salle: '',
                        etagere: '',
                        exemplaire: item.exemplairesRestants,
                        commentaire: [],
                        nomBD: item.collection,
                    });
                }}
            >
                <Image
                    source={
                        item.imageUrl
                            ? { uri: item.imageUrl }
                            : require('../../../assets/thesis.png')
                    }
                    style={styles.bookCover}
                    onError={({ nativeEvent: { error } }) => {
                        console.log("Erreur de chargement d'image:", error);
                    }}
                />
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{item.titre || 'Titre inconnu'}</Text>

                    <View style={styles.bookMetaContainer}>
                        <View style={styles.bookMeta}>
                            <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                            <Text style={styles.bookMetaText}>
                                {t('borrowed_on')} {formatFirestoreDate(item.dateEmprunt)}
                            </Text>
                        </View>

                        <View style={styles.bookMeta}>
                            <Ionicons
                                name="time-outline"
                                size={14}
                                color={isOverdue ? '#FF3B30' : '#8E8E93'}
                            />
                            <Text
                                style={[
                                    styles.bookMetaText,
                                    isOverdue ? styles.overdueText : {}
                                ]}
                            >
                                {t('return_by')} {formatFirestoreDate(item.dateRetour)}
                            </Text>
                        </View>

                        <View style={styles.bookMeta}>
                            <Ionicons name="location-outline" size={14} color="#8E8E93" />
                            <Text style={styles.bookMetaText}>
                                {t('location_title')}: {item.emplacement}/3
                            </Text>
                        </View>
                    </View>

                    {isOverdue && (
                        <View style={styles.overdueTag}>
                            <Text style={styles.overdueTagText}>{t('overdue_status')}</Text>
                        </View>
                    )}

                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statut) }]}>
                        <Text style={styles.statusText}>{item.statut}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Fonction pour déterminer la couleur du statut
    const getStatusColor = (status) => {
        switch (status) {
            case t('borrowed_status'):
                return '#FF8A50'; // Orange
            case t('overdue_status'):
                return '#FF3B30'; // Rouge
            default:
                return '#757575'; // Gris par défaut
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('my_borrows_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8A50" />
                </View>
            ) : (
                <FlatList
                    data={emprunts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={renderEmptyList}
                    contentContainerStyle={emprunts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    backButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    browseButton: {
        backgroundColor: '#FF8A50',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    browseButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    bookItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bookCover: {
        width: 80,
        height: 120,
        backgroundColor: '#F0F0F0',
    },
    bookInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
    },
    bookMetaContainer: {
        marginTop: 4,
    },
    bookMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    bookMetaText: {
        fontSize: 12,
        color: '#8E8E93',
        marginLeft: 4,
    },
    overdueText: {
        color: '#FF3B30',
    },
    overdueTag: {
        position: 'absolute',
        right: 12,
        top: 12,
        backgroundColor: '#FF3B3020',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    overdueTagText: {
        fontSize: 10,
        color: '#FF3B30',
        fontWeight: '500',
    },
    statusBadge: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});