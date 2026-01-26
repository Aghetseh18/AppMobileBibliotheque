import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { db } from '../../config';

const LAST_ALERT_KEY = 'lastClientAlertId';

const ClientAlertModal = () => {
    const [visible, setVisible] = useState(false);
    const [activeAlert, setActiveAlert] = useState(null);

    useEffect(() => {
        // 1. Check for Blocked Status (Priority)
        const checkBlockedStatus = async () => {
            try {
                const blockStatusJson = await AsyncStorage.getItem('userBlockStatus');
                if (blockStatusJson) {
                    const blockData = JSON.parse(blockStatusJson);
                    if (blockData.isBlocked) {
                        const blockedDate = blockData.blockedAt ? new Date(blockData.blockedAt).toLocaleDateString() : '';
                        setActiveAlert({
                            id: 'blocked_' + Date.now(), // Unique ID to force show
                            title: 'Compte Bloqué',
                            message: `Votre compte a été bloqué.\n\nRaison: ${blockData.reason}\n${blockedDate ? 'Date: ' + blockedDate : ''}`,
                            isCritical: true, // Custom flag to prevent simple dismissal
                            targetRole: 'client'
                        });
                        setVisible(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
                        return true; // Blocked found
                    }
                }
            } catch (error) {
                console.error('Error checking block status:', error);
            }
            return false;
        };

        // Check immediately
        checkBlockedStatus();

        // Check periodically (every 5 seconds) to catch real-time blocks
        const intervalId = setInterval(checkBlockedStatus, 5000);

        // 2. System Alerts Listener
        const q = query(
            collection(db, 'SystemAlerts'),
            where('targetRole', '==', 'client')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                if (snapshot.empty) return;

                const next = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));

                next.sort((a, b) => {
                    const aTime = a?.createdAt?.toMillis?.() || 0;
                    const bTime = b?.createdAt?.toMillis?.() || 0;
                    return bTime - aTime;
                });

                const latest = next[0];
                if (!latest?.id) return;

                // Only show system alert if NOT blocked
                AsyncStorage.getItem('userBlockStatus').then(status => {
                    if (!status) {
                        AsyncStorage.getItem(LAST_ALERT_KEY)
                            .then((lastSeen) => {
                                if (!lastSeen || lastSeen !== latest.id) {
                                    setActiveAlert(latest);
                                    setVisible(true);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { });
                                }
                            })
                            .catch((error) => {
                                console.error('Erreur lecture AsyncStorage alertes:', error);
                            });
                    }
                });
            },
            (error) => {
                console.error('Listener alertes client:', error);
            }
        );

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, []);

    const handleOk = async () => {
        // If critical (e.g. blocked), allow dismissal and CLEAR the status
        // so the 5s interval doesn't immediately repoen it.
        // This allows the user to try signing in again.
        if (activeAlert?.isCritical) {
            try {
                await AsyncStorage.removeItem('userBlockStatus');
                setVisible(false);
                setActiveAlert(null);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (!activeAlert?.id) return;
        try {
            await AsyncStorage.setItem(LAST_ALERT_KEY, activeAlert.id);
        } catch (error) {
            console.error('Erreur sauvegarde AsyncStorage alertes:', error);
        } finally {
            setVisible(false);
            setActiveAlert(null);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleOk}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.banner} />
                    <Text style={styles.title}>
                        {activeAlert?.title || 'Information importante'}
                    </Text>
                    <Text style={styles.message}>
                        {activeAlert?.message || "Bonjour, une mise a jour vient d'etre effectuee."}
                    </Text>
                    <Pressable style={styles.button} onPress={handleOk}>
                        <Text style={styles.buttonText}>OK</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modal: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        borderWidth: 2,
        borderColor: '#ef4444',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8
    },
    banner: {
        height: 6,
        borderRadius: 6,
        backgroundColor: '#ef4444',
        marginBottom: 12
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827'
    },
    message: {
        marginTop: 10,
        fontSize: 15,
        color: '#374151'
    },
    button: {
        marginTop: 18,
        backgroundColor: '#ef4444',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16
    }
});

export default ClientAlertModal;