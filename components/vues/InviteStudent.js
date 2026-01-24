import { StyleSheet, Text, View, TouchableOpacity, TextInput, FlatList, Image, Share, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import React, { useState, useContext, useEffect } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { db } from '../../config';
import { doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { useTranslation } from '../hooks/useTranslation';

const DOWNLOAD_URL = 'https://biblioapp.example.com/download'; // Update with your actual download URL

export default function InviteStudent({ navigation }) {
    const { datUser } = useContext(UserContext); // Get current user
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [recentContacts, setRecentContacts] = useState([]);

    // Subscribe to recent contacts
    useEffect(() => {
        if (!datUser?.email) return;

        const userRef = doc(db, 'BiblioUser', datUser?.email);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.recentContacts) {
                    setRecentContacts([...userData.recentContacts].reverse());
                }
            }
        });

        return () => unsubscribe();
    }, [datUser?.email]);

    const handleSmartEmail = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert(t('error'), t('invalid_email_error'));
            return;
        }

        try {
            setLoading(true);

            // 1. Save to History (Firestore)
            // Check for duplicates
            const isDuplicate = recentContacts.some(contact =>
                contact.email.toLowerCase() === email.toLowerCase().trim()
            );

            if (datUser?.email && !isDuplicate) {
                const userRef = doc(db, 'BiblioUser', datUser.email);
                const newContact = {
                    id: Date.now().toString(),
                    name: email.split('@')[0],
                    email: email.trim(),
                    image: null
                };

                // Add to Firestore without waiting for email app to close
                await updateDoc(userRef, {
                    recentContacts: arrayUnion(newContact)
                });
            }

            // 2. Open Native Email App
            const subject = encodeURIComponent(t('email_subject'));
            // Simple replacement for now
            const bodyRaw = t('email_body').replace('{{url}}', DOWNLOAD_URL);
            const body = encodeURIComponent(bodyRaw);
            const url = `mailto:${email}?subject=${subject}&body=${body}`;

            const canOpen = await Linking.canOpenURL(url);

            if (canOpen) {
                await Linking.openURL(url);
                setEmail(''); // Clear input on success
            } else {
                Alert.alert(t('error'), t('no_mail_app_error'));
            }

        } catch (error) {
            console.error("Error sending email:", error);
            Alert.alert(t('error'), t('generic_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleShareInvite = async () => {
        try {
            await Share.share({
                message: `${t('share_message')} ${DOWNLOAD_URL}`,
            });
        } catch (error) {
            Alert.alert(t('error'), `${t('share_error')} ${error.message}`);
        }
    };

    const handleContactClick = (contactEmail) => {
        setEmail(contactEmail);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('invite_student_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.subtitle}>
                    {t('invite_subtitle')}
                </Text>

                {/* Email Input Section */}
                <View style={styles.inputContainer}>
                    <MaterialIcons name="email" size={20} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder={t('email_placeholder')}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.inviteButton, (!email) && styles.inviteButtonDisabled]}
                    onPress={handleSmartEmail}
                    disabled={!email || loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.inviteButtonText}>
                            {t('open_mail_app')}
                        </Text>
                    )}
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>{t('or_share_link')}</Text>
                    <View style={styles.line} />
                </View>

                {/* Share options */}
                <TouchableOpacity
                    style={styles.shareOption}
                    onPress={handleShareInvite}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#FF8A5020' }]}>
                        <Ionicons name="share-social" size={24} color="#FF8A50" />
                    </View>
                    <View style={styles.shareTextContainer}>
                        <Text style={styles.shareOptionText}>{t('share_options')}</Text>
                        <Text style={styles.shareOptionSubtext}>{t('share_subtext')}</Text>
                    </View>
                    <MaterialIcons name="arrow-forward-ios" size={16} color="#CCCCCC" />
                </TouchableOpacity>

                {/* Recent Contacts List */}
                {recentContacts.length > 0 && (
                    <>
                        <Text style={styles.contactsTitle}>{t('history_title')}</Text>
                        <FlatList
                            data={recentContacts}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.contactItem}
                                    onPress={() => handleContactClick(item.email)}
                                >
                                    <View style={styles.avatarContainer}>
                                        <View style={styles.placeholderAvatar}>
                                            <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.contactInfo}>
                                        <Text style={styles.contactName}>{item.name}</Text>
                                        <Text style={styles.contactEmail}>{item.email}</Text>
                                    </View>
                                    <MaterialIcons name="history" size={20} color="#ccc" />
                                </TouchableOpacity>
                            )}
                            style={styles.contactsList}
                        />
                    </>
                )}

            </View>
        </KeyboardAvoidingView>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    backButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        marginBottom: 16,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#333',
    },
    inviteButton: {
        backgroundColor: '#FF8A50',
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: "#FF8A50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    inviteButtonDisabled: {
        backgroundColor: '#FFCCB0',
        shadowOpacity: 0,
    },
    inviteButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E5EA',
    },
    dividerText: {
        paddingHorizontal: 16,
        color: '#8E8E93',
        fontSize: 14,
    },
    shareOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    shareTextContainer: {
        flex: 1,
    },
    shareOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 2,
    },
    shareOptionSubtext: {
        fontSize: 12,
        color: '#8E8E93',
    },
    contactsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    contactsList: {
        flex: 1,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f5f5f5'
    },
    avatarContainer: {
        marginRight: 12,
    },
    placeholderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF0E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF8A50',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    contactEmail: {
        fontSize: 12,
        color: '#8E8E93',
    },
});