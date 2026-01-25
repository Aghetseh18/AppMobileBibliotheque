import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config';

const MaintenanceGate = ({ children }) => {
    const [appMaintenance, setAppMaintenance] = useState(false);
    const [orgMaintenance, setOrgMaintenance] = useState(false);

    useEffect(() => {
        const ref = doc(db, 'Configuration', 'AppSettings');
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                const data = snapshot.data();
                setAppMaintenance(Boolean(data?.MaintenanceMode));
            },
            (error) => {
                console.error('Erreur maintenance listener:', error);
                setAppMaintenance(false);
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const ref = doc(db, 'Configuration', 'OrgSettings');
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                const data = snapshot.data();
                setOrgMaintenance(Boolean(data?.MaintenanceMode));
            },
            (error) => {
                console.error('Erreur maintenance listener:', error);
                setOrgMaintenance(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const maintenanceEnabled = appMaintenance || orgMaintenance;

    if (maintenanceEnabled) {
        return (
            <Modal transparent animationType="fade" visible>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.banner} />
                        <Text style={styles.title}>Maintenance en cours</Text>
                        <Text style={styles.message}>
                            L'application est actuellement en maintenance. Veuillez revenir plus tard.
                        </Text>
                    </View>
                </View>
            </Modal>
        );
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modal: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#111827',
        borderRadius: 18,
        padding: 20,
        borderWidth: 2,
        borderColor: '#f59e0b'
    },
    banner: {
        height: 6,
        borderRadius: 6,
        backgroundColor: '#f59e0b',
        marginBottom: 12
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff'
    },
    message: {
        marginTop: 10,
        fontSize: 15,
        color: '#e5e7eb'
    }
});

export default MaintenanceGate;
