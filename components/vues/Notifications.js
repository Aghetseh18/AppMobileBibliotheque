import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../config';
import { UserContext } from '../context/UserContext';
import WebSocketService from '../utils/WebSocketService';

export default function Notifications({ navigation }) {
    const { currentUserNewNav } = useContext(UserContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchNotifications();

        // Initialize WebSocket for real-time approval notifications
        if (currentUserNewNav?.email) {
            initializeWebSocket(currentUserNewNav.email);
        }

        return () => {
            // Cleanup WebSocket on unmount
            WebSocketService.disconnect();
        };
    }, [currentUserNewNav?.email]);

    const fetchNotifications = () => {
        if (!currentUserNewNav?.email) {
            setLoading(false);
            return;
        }

        try {
            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);
            const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    const userNotifications = userData.notifications || [];

                    // Trier par date (plus récent en premier)
                    const sortedNotifications = userNotifications.sort((a, b) => {
                        const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
                        const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
                        return dateB - dateA;
                    });

                    console.log(`${sortedNotifications.length} notifications trouvées`);
                    setNotifications(sortedNotifications);
                } else {
                    setNotifications([]);
                }
                setLoading(false);
            }, (error) => {
                console.error('Erreur lors de la récupération des notifications:', error);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            setLoading(false);
        }
    };

    /**
     * Initialize WebSocket connection for real-time approvals
     */
    const initializeWebSocket = (userId) => {
        try {
            // Connect to WebSocket server
            WebSocketService.connect(userId);

            // Handle approval notifications
            WebSocketService.on('approval', async (data) => {
                console.log('Approval received:', data);

                // Create approval notification
                const approvalNotification = {
                    id: `notif_approval_${Date.now()}`,
                    type: 'reservation_approved',
                    title: 'Réservation approuvée',
                    message: `Votre réservation pour le livre "${data.bookTitle}" a été approuvée par l'administrateur. Le livre est prêt à être retiré.`,
                    date: Timestamp.now(),
                    read: false,
                    bookId: data.bookId,
                    bookTitle: data.bookTitle,
                };

                // Add notification to Firestore
                try {
                    const userRef = doc(db, 'BiblioUser', userId);
                    await updateDoc(userRef, {
                        notifications: arrayUnion(approvalNotification)
                    });

                    // Show alert to user
                    Alert.alert(
                        'Réservation approuvée ✓',
                        `Le livre "${data.bookTitle}" est prêt à être retiré!`,
                        [{ text: 'OK' }]
                    );
                } catch (error) {
                    console.error('Erreur lors de l\'ajout de la notification:', error);
                }
            });

            // Handle disconnection
            WebSocketService.on('disconnected', () => {
                console.log('WebSocket disconnected');
            });

            // Handle errors
            WebSocketService.on('error', (error) => {
                console.error('WebSocket error:', error);
            });

        } catch (error) {
            console.error('Error initializing WebSocket:', error);
        }
    };

    const markAllAsRead = async () => {
        if (!currentUserNewNav?.email || notifications.length === 0) return;

        try {
            setLoading(true);
            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);

            // Marquer toutes les notifications comme lues
            const updatedNotifications = notifications.map(notification => ({
                ...notification,
                read: true
            }));

            await updateDoc(userRef, {
                notifications: updatedNotifications
            });

            Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues');
        } catch (error) {
            console.error('Erreur lors du marquage des notifications:', error);
            Alert.alert('Erreur', 'Impossible de marquer les notifications comme lues');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId) => {
        if (!currentUserNewNav?.email) return;

        try {
            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);

            // Trouver et mettre à jour la notification spécifique
            const updatedNotifications = notifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, read: true }
                    : notification
            );

            await updateDoc(userRef, {
                notifications: updatedNotifications
            });
        } catch (error) {
            console.error('Erreur lors du marquage de la notification:', error);
        }
    };

    const deleteNotification = async (notificationToDelete) => {
        if (!currentUserNewNav?.email) return;

        Alert.alert(
            'Supprimer la notification',
            'Voulez-vous vraiment supprimer cette notification ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);
                            await updateDoc(userRef, {
                                notifications: arrayRemove(notificationToDelete)
                            });
                            Alert.alert('Succès', 'Notification supprimée');
                        } catch (error) {
                            console.error('Erreur lors de la suppression:', error);
                            Alert.alert('Erreur', 'Impossible de supprimer la notification');
                        }
                    }
                }
            ]
        );
    };

    const deleteAllNotifications = async () => {
        if (!currentUserNewNav?.email || notifications.length === 0) return;

        Alert.alert(
            'Tout supprimer',
            'Voulez-vous vraiment supprimer toutes les notifications ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Tout supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);
                            // On vide le tableau de notifications
                            await updateDoc(userRef, {
                                notifications: []
                            });
                            Alert.alert('Succès', 'Toutes les notifications ont été supprimées');
                        } catch (error) {
                            console.error('Erreur lors de la suppression de toutes les notifications:', error);
                            Alert.alert('Erreur', 'Impossible de supprimer les notifications');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const openNotificationModal = (notification) => {
        setSelectedNotification(notification);
        setModalVisible(true);

        // Marquer comme lue automatiquement
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'reservation':
                return <Ionicons name="bookmark-outline" size={24} color="#FF8A50" />;
            case 'reservation_approved':
                return <Ionicons name="checkmark-circle" size={24} color="#34C759" />;
            case 'emprunt':
                return <Ionicons name="book-outline" size={24} color="#30B0C7" />;
            case 'retour':
                return <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />;
            case 'annulation':
                return <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />;
            case 'rappel':
                return <Ionicons name="time-outline" size={24} color="#FF9500" />;
            case 'nouveau_livre':
                return <Ionicons name="library-outline" size={24} color="#5856D6" />;
            default:
                return <Ionicons name="notifications-outline" size={24} color="#8E8E93" />;
        }
    };

    const formatDate = (dateInput) => {
        let date;
        if (dateInput?.seconds) {
            date = new Date(dateInput.seconds * 1000);
        } else {
            date = new Date(dateInput);
        }

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return 'À l\'instant';
        } else if (diffMins < 60) {
            return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
        } else if (diffHours < 24) {
            return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        } else if (diffDays < 7) {
            return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        } else {
            return date.toLocaleDateString('fr-FR');
        }
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#CCCCCC" />
            <Text style={styles.emptyText}>Aucune notification</Text>
            <Text style={styles.emptySubText}>Vous recevrez des notifications concernant vos emprunts et les nouveautés</Text>
        </View>
    );

    const renderItem = ({ item }) => {
        const isLongMessage = item.message && item.message.length > 100;
        const displayMessage = isLongMessage ? `${item.message.slice(0, 100)}...` : item.message;

        return (
            <TouchableOpacity
                style={[styles.notificationItem, item.read ? {} : styles.unreadItem]}
                onPress={() => openNotificationModal(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: item.read ? '#F2F2F7' : '#E5F3FF' }]}>
                    {getNotificationIcon(item.type)}
                </View>
                <View style={styles.notificationContent}>
                    <Text style={[styles.notificationTitle, item.read ? {} : styles.unreadText]}>
                        {item.title}
                    </Text>
                    <Text style={styles.notificationMessage} numberOfLines={isLongMessage ? 3 : 2}>
                        {displayMessage}
                    </Text>
                    {isLongMessage && (
                        <Text style={styles.seeMoreText}>Appuyer pour voir plus</Text>
                    )}
                    <Text style={styles.notificationDate}>
                        {formatDate(item.date)}
                    </Text>
                </View>
                <View style={styles.notificationActions}>
                    {!item.read && (
                        <View style={styles.unreadDot} />
                    )}
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            deleteNotification(item);
                        }}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderNotificationModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{selectedNotification?.title}</Text>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#8E8E93" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.modalIconContainer}>
                            {getNotificationIcon(selectedNotification?.type)}
                        </View>

                        <Text style={styles.modalMessage}>
                            {selectedNotification?.message}
                        </Text>

                        <Text style={styles.modalDate}>
                            {selectedNotification?.date && formatDate(selectedNotification.date)}
                        </Text>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.modalDeleteButton}
                            onPress={() => {
                                setModalVisible(false);
                                deleteNotification(selectedNotification);
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            <Text style={styles.modalDeleteText}>Supprimer</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                            <Text style={styles.markAllText}>Tout marquer</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={deleteAllNotifications} style={styles.deleteAllButton}>
                            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8A50" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={renderEmptyList}
                    contentContainerStyle={notifications.length === 0 ? { flex: 1 } : {}}
                />
            )}

            {renderNotificationModal()}
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
        flex: 1,
        textAlign: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
    },
    markAllButton: {
        padding: 8,
        marginRight: 4,
    },
    deleteAllButton: {
        padding: 8,
    },
    markAllText: {
        fontSize: 14,
        color: '#FF8A50',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
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
    },
    notificationItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        alignItems: 'flex-start',
    },
    unreadItem: {
        backgroundColor: '#F8F9FF',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 4,
    },
    notificationContent: {
        flex: 1,
        paddingRight: 8,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 4,
    },
    unreadText: {
        fontWeight: '600',
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 6,
        lineHeight: 20,
    },
    seeMoreText: {
        fontSize: 12,
        color: '#FF8A50',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    notificationDate: {
        fontSize: 12,
        color: '#8E8E93',
    },
    notificationActions: {
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 4,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF8A50',
        marginBottom: 8,
    },
    deleteButton: {
        padding: 8,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        padding: 16,
        maxHeight: 400,
    },
    modalIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalMessage: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
        marginBottom: 16,
    },
    modalDate: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    modalDeleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF3B3020',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    modalDeleteText: {
        color: '#FF3B30',
        marginLeft: 4,
        fontWeight: '500',
    },
    modalCloseBtn: {
        backgroundColor: '#FF8A50',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    modalCloseBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});