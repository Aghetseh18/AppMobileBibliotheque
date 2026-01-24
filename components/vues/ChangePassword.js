// Créer le fichier ChangePassword.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useTranslation } from '../hooks/useTranslation';

export default function ChangePassword({ navigation }) {
    const { t } = useTranslation();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(t('error'), t('passwords_mismatch'));
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert(t('error'), t('password_too_short'));
            return;
        }

        setLoading(true);
        try {
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user || !user.email) {
                throw new Error(t('user_not_connected'));
            }

            // Réauthentifier l'utilisateur
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Mettre à jour le mot de passe
            await updatePassword(user, newPassword);

            Alert.alert(t('success'), t('password_update_success'));
            navigation.goBack();
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);

            if (error.code === 'auth/wrong-password') {
                Alert.alert(t('error'), t('wrong_current_password'));
            } else {
                Alert.alert(t('error'), t('password_update_error'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('change_password_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.infoText}>
                    {t('change_password_info')}
                </Text>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('current_password')}</Text>
                    <View style={styles.passwordInputWrapper}>
                        <TextInput
                            style={styles.passwordInput}
                            secureTextEntry={!showCurrentPassword}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder={t('current_password_placeholder')}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                            <Ionicons
                                name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#8E8E93"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('new_password')}</Text>
                    <View style={styles.passwordInputWrapper}>
                        <TextInput
                            style={styles.passwordInput}
                            secureTextEntry={!showNewPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder={t('new_password_placeholder')}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowNewPassword(!showNewPassword)}
                        >
                            <Ionicons
                                name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#8E8E93"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('confirm_password')}</Text>
                    <View style={styles.passwordInputWrapper}>
                        <TextInput
                            style={styles.passwordInput}
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t('confirm_password_placeholder')}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            <Ionicons
                                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#8E8E93"
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.changeButton}
                    onPress={handleChangePassword}
                    disabled={loading}
                >
                    <Text style={styles.changeButtonText}>
                        {loading ? t('loading') : t('change_password_btn')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
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
    content: {
        flex: 1,
        padding: 16,
    },
    infoText: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 8,
    },
    passwordInputWrapper: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 10,
    },
    changeButton: {
        backgroundColor: '#FF8A50',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    changeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});