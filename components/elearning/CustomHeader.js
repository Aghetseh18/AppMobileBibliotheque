import React from 'react';
import { SafeAreaView, View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomHeader = ({ userName, userImage, onProfilePress }) => {
    // Prefer first word of a full name; if an email was passed, fall back to local-part
    let raw = userName || '';
    let firstPart = 'Utilisateur';
    if (raw) {
        if (raw.includes('@')) {
            firstPart = raw.split('@')[0];
        } else {
            firstPart = raw.split(' ')[0]; // take first name
        }
    }
    const capitalizedName = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.customHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.logoText}>BiblioENSPY</Text>
                    <View style={styles.logoSubtitleContainer}>
                        <Ionicons name="school" size={12} color="#666" />
                        <Text style={styles.logoSubtitle}>Bibliothèque numérique</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.profileContainer} 
                    onPress={onProfilePress}
                    activeOpacity={0.7}
                >
                    <View style={styles.profileInfo}>
                        <Text style={styles.greetingText}>Salut,</Text>
                        <Text style={styles.userNameText} numberOfLines={1}>
                            {capitalizedName}
                        </Text>
                    </View>

                    <View style={styles.profileImageContainer}>
                        {userImage ? (
                            <Image
                                source={{ uri: userImage }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={styles.defaultProfileImage}>
                                <Ionicons name="person" size={18} color="#007AFF" />
                            </View>
                        )}
                        <View style={styles.onlineIndicator} />
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        height: 70, // Slightly taller header
        width: '100%',
    },
    headerLeft: {
        flex: 1,
    },
    logoText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    logoSubtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 4,
    },
    logoSubtitle: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F8F9FA',
        marginLeft: 10,
        flexShrink: 1, // Prevents overflow
    },
    profileInfo: {
        marginRight: 10,
        maxWidth: 100, // Prevents text from being too long
    },
    greetingText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    userNameText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    profileImageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    defaultProfileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    safeArea: {
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 8) : 8, // a bit of margin from top
    },
    customHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        height: 70,
        width: '100%',
    },
    headerLeft: { flex: 1 },
    logoText: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.5 },
    logoSubtitleContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
    logoSubtitle: { fontSize: 11, color: '#666', fontWeight: '500' },
    profileContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F8F9FA', marginLeft: 10, flexShrink: 1 },
    profileInfo: { marginRight: 10, maxWidth: 100 },
    greetingText: { fontSize: 11, color: '#666', fontWeight: '500' },
    userNameText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    profileImageContainer: { position: 'relative' },
    profileImage: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FFFFFF' },
    defaultProfileImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759', borderWidth: 2, borderColor: '#FFFFFF' },
});

export default CustomHeader;