import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc, arrayRemove, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../config';
import { UserContext } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';

export default function Notifications({ navigation }) {
    const { currentUserNewNav } = useContext(UserContext);
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchNotifications();
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

            Alert.alert(t('success'), t('mark_all_success'));
        } catch (error) {
            console.error('Erreur lors du marquage des notifications:', error);
            Alert.alert(t('error'), t('mark_all_error'));
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
            t('delete_notif_title'),
            t('delete_notif_msg'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);
                            await updateDoc(userRef, {
                                notifications: arrayRemove(notificationToDelete)
                            });
                            Alert.alert(t('success'), t('delete_notif_success'));
                        } catch (error) {
                            console.error('Erreur lors de la suppression:', error);
                            Alert.alert(t('error'), t('delete_notif_error'));
                        }
                    }
                }
            ]
        );
    };

    const deleteAllNotifications = async () => {
        if (!currentUserNewNav?.email || notifications.length === 0) return;

        Alert.alert(
            t('delete_all_confirm_title'),
            t('delete_all_confirm_msg'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete_all'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const userRef = doc(db, 'BiblioUser', currentUserNewNav.email);
                            // On vide le tableau de notifications
                            await updateDoc(userRef, {
                                notifications: []
                            });
                            Alert.alert(t('success'), t('delete_all_success'));
                        } catch (error) {
                            console.error('Erreur lors de la suppression de toutes les notifications:', error);
                            Alert.alert(t('error'), t('delete_all_error'));
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
            return t('just_now');
        } else if (diffMins < 60) {
            return (t('mins_ago') || 'Il y a {{count}} minute(s)').replace('{{count}}', diffMins);
        } else if (diffHours < 24) {
            return (t('hours_ago') || 'Il y a {{count}} heure(s)').replace('{{count}}', diffHours);
        } else if (diffDays < 7) {
            return (t('days_ago') || 'Il y a {{count}} jour(s)').replace('{{count}}', diffDays);
        } else {
            return date.toLocaleDateString('fr-FR');
        }
    };

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={50} color="#FF8A50" />
            </View>
            <Text style={styles.emptyText}>{t('no_notifications')}</Text>
            <Text style={styles.emptySubText}>{t('no_notifications_sub')}</Text>
        </View>
    );

    const renderItem = ({ item }) => {
        const isLongMessage = item.message && item.message.length > 100;
        const displayMessage = isLongMessage ? `${item.message.slice(0, 100)}...` : item.message;

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    !item.read && styles.unreadCard
                ]}
                onPress={() => openNotificationModal(item)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.iconCircle,
                    { backgroundColor: !item.read ? 'rgba(255, 138, 80, 0.1)' : '#F2F2F7' }
                ]}>
                    {getNotificationIcon(item.type)}
                    {!item.read && <View style={styles.unreadStatusIndicator} />}
                </View>

                <View style={styles.cardMainContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text
                            style={[styles.cardTitleText, !item.read && styles.boldText]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>
                        <Text style={styles.cardDateText}>
                            {formatDate(item.date)}
                        </Text>
                    </View>

                    <Text
                        style={[styles.cardMessageText, !item.read && styles.unreadMessageText]}
                        numberOfLines={2}
                    >
                        {displayMessage}
                    </Text>

                    <View style={styles.cardFooter}>
                        {isLongMessage && (
                            <Text style={styles.readMorePill}>{t('tap_to_see_more')}</Text>
                        )}
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                            style={styles.cardDeleteBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                deleteNotification(item);
                            }}
                        >
                            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                    </View>
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
                            <Text style={styles.modalDeleteText}>{t('delete')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.modalCloseBtnText}>{t('close')}</Text>
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
                <Text style={styles.headerTitle}>{t('notifications_title')}</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                            <Text style={styles.markAllText}>{t('mark_all_read')}</Text>
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
                    contentContainerStyle={[
                        styles.listContent,
                        notifications.length === 0 ? { flex: 1 } : {}
                    ]}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {renderNotificationModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
        flex: 1,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
        justifyContent: 'flex-end',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 138, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markAllButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 138, 80, 0.1)',
        marginRight: 8,
    },
    markAllText: {
        fontSize: 12,
        color: '#FF8A50',
        fontWeight: '700',
    },
    deleteAllButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 30,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1C1C1E',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 15,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 22,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        alignItems: 'flex-start',
    },
    unreadCard: {
        backgroundColor: '#FFFFFF',
        borderLeftWidth: 4,
        borderLeftColor: '#FF8A50',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        position: 'relative',
    },
    unreadStatusIndicator: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF8A50',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    cardMainContent: {
        flex: 1,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        flex: 1,
        marginRight: 8,
    },
    boldText: {
        fontWeight: '800',
    },
    cardDateText: {
        fontSize: 12,
        color: '#8E8E93',
        fontWeight: '500',
    },
    cardMessageText: {
        fontSize: 14,
        color: '#666666',
        lineHeight: 20,
        marginBottom: 10,
    },
    unreadMessageText: {
        color: '#1C1C1E',
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    readMorePill: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FF8A50',
        backgroundColor: 'rgba(255, 138, 80, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    cardDeleteBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 59, 48, 0.05)',
    },
    // Modal styles refined
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        width: '100%',
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1C1C1E',
        flex: 1,
        letterSpacing: -0.5,
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        padding: 24,
    },
    modalIconContainer: {
        alignItems: 'center',
        marginBottom: 20,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 138, 80, 0.1)',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    modalMessage: {
        fontSize: 17,
        color: '#3A3A3C',
        lineHeight: 26,
        textAlign: 'center',
        marginBottom: 15,
    },
    modalDate: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        gap: 12,
    },
    modalDeleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        paddingVertical: 14,
        borderRadius: 18,
    },
    modalDeleteText: {
        color: '#FF3B30',
        marginLeft: 8,
        fontWeight: '800',
        fontSize: 15,
    },
    modalCloseBtn: {
        flex: 1,
        backgroundColor: '#FF8A50',
        paddingVertical: 14,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF8A50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modalCloseBtnText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 15,
    },
});
