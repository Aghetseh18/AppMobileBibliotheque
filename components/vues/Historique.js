import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config';
import { useTranslation } from '../hooks/useTranslation';

export default function Historique({ route, navigation }) {
    const { datUser } = route.params;
    const { t } = useTranslation();
    const [historique, setHistorique] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistorique = async () => {
            if (!datUser || !datUser.email) {
                setLoading(false);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'BiblioUser', datUser.email));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.historique && Array.isArray(userData.historique)) {
                        setHistorique(userData.historique);
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de l\'historique:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorique();
    }, [datUser]);

    const clearHistory = async () => {
        Alert.alert(
            t('confirm_delete_history_title'),
            t('confirm_delete_history_msg'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!datUser || !datUser.email) return;

                        try {
                            setLoading(true);
                            await updateDoc(doc(db, 'BiblioUser', datUser.email), {
                                historique: []
                            });
                            setHistorique([]);
                            Alert.alert(t('success'), t('delete_history_success'));
                        } catch (error) {
                            console.error('Erreur lors de la suppression de l\'historique:', error);
                            Alert.alert(t('error'), t('delete_history_error'));
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };


    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={60} color="#CCCCCC" />
            <Text style={styles.emptyText}>{t('no_history')}</Text>
            <Text style={styles.emptySubText}>{t('no_history_sub')}</Text>
            <TouchableOpacity
                style={styles.browseButton}
                onPress={navigateToBibliotheque}
            >
                <Text style={styles.browseButtonText}>{t('browse_library')}</Text>
            </TouchableOpacity>
        </View>
    );

    const navigateToBibliotheque = () => {
        navigation.navigate('VueUn');
    };

    const renderHistorique = () => {
        if (!historique || historique.length === 0) {
            return (
                <View style={styles.emptyHistoryContainer}>
                    <Text style={styles.emptyHistoryText}>{t('no_history')}</Text>
                </View>
            );
        }

        return (
            <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
                {historique
                    .sort((a, b) => b.dateVue.toDate() - a.dateVue.toDate())
                    .map((book, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.historyItem}
                            onPress={() => navigation.navigate('Produit', {
                                name: book.nameDoc,
                                desc: book.desc,
                                image: book.image,
                                cathegorie: book.cathegorieDoc,
                                type: book.type,
                                salle: book.salle || '',
                                etagere: book.etagere || '',
                                exemplaire: book.exemplaire || 1,
                                commentaire: book.commentaire || [],
                                nomBD: 'BiblioLivre',
                                datUser: datUser
                            })}
                        >
                            <Image
                                source={{ uri: book.image }}
                                style={styles.historyImage}
                                resizeMode="cover"
                            />
                            <View style={styles.historyInfo}>
                                <Text style={styles.historyTitle} numberOfLines={2}>
                                    {book.nameDoc}
                                </Text>
                                <Text style={styles.historyCategory}>
                                    {book.cathegorieDoc} • {book.type}
                                </Text>
                                <Text style={styles.historyDate}>
                                    {t('consulted_on')}{book.dateVue.toDate().toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('history_title')}</Text>
                {historique.length > 0 && (
                    <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
                        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8A50" />
                </View>
            ) : (
                renderHistorique()
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
    clearButton: {
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
    emptyHistoryContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyHistoryText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
    },
    historyItem: {
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
    historyImage: {
        width: 80,
        height: 120,
        backgroundColor: '#F0F0F0',
    },
    historyInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
    },
    historyCategory: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 8,
    },
    historyDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
});
