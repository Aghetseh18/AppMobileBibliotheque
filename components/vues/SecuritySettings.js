import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';

export default function SecuritySettings({ navigation }) {
    const { t } = useTranslation();

    const handleChangePassword = () => {
        navigation.navigate('ChangePassword');
    };

    const handleOpenSettings = () => {
        Linking.openSettings().catch(() => {
            Alert.alert(t('error'), t('cannot_open_settings'));
        });
    };

    const handleContactPrivacy = () => {
        const email = 'support@enspy-library.com';
        const subject = t('privacy_inquiry');
        const body = t('privacy_inquiry_body');
        Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
            Alert.alert(t('error'), t('cannot_open_email'));
        });
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('delete_account'),
            t('delete_account_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: () => {
                        // In a real app, this would call an API
                        Alert.alert(t('request_sent'), t('delete_account_contact_admin'));
                    }
                }
            ]
        );
    };

    const renderSettingItem = ({ icon, iconColor, title, subtitle, action, dangerous = false }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={action}
        >
            <View style={[styles.settingIconContainer, { backgroundColor: iconColor + '20' }]}>
                {icon}
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, dangerous && styles.dangerousText]}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#A1A1A1" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FF6600" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('security_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Section Sécurité du compte */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('account_security')}</Text>

                    {renderSettingItem({
                        icon: <MaterialIcons name="lock-outline" size={20} color="#5E60CE" />,
                        iconColor: "#5E60CE",
                        title: t('change_password_title'),
                        subtitle: t('change_pwd_subtitle'),
                        action: handleChangePassword
                    })}
                </View>

                {/* Section Permissions et Confidentialité */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('privacy_permissions')}</Text>

                    {renderSettingItem({
                        icon: <Ionicons name="settings-outline" size={20} color="#2196F3" />,
                        iconColor: "#2196F3",
                        title: t('system_permissions'),
                        subtitle: t('system_permissions_desc'),
                        action: handleOpenSettings
                    })}

                    {renderSettingItem({
                        icon: <MaterialIcons name="privacy-tip" size={20} color="#4CAF50" />,
                        iconColor: "#4CAF50",
                        title: t('privacy_contact'),
                        subtitle: t('privacy_contact_desc'),
                        action: handleContactPrivacy
                    })}
                </View>

                {/* Section Danger */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('danger_zone')}</Text>

                    {renderSettingItem({
                        icon: <MaterialIcons name="delete-forever" size={20} color="#FF3B30" />,
                        iconColor: "#FF3B30",
                        title: t('delete_account'),
                        subtitle: t('delete_account_subtitle'),
                        action: handleDeleteAccount,
                        dangerous: true
                    })}
                </View>

                {/* Note d'information */}
                <View style={styles.infoContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#64748B" />
                    <Text style={styles.infoText}>
                        {t('security_note')}
                    </Text>
                </View>
            </ScrollView>
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
        backgroundColor: '#FFFFFF',
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
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginLeft: 16,
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    dangerousText: {
        color: '#EF4444',
    },
    infoContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        margin: 16,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    infoText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 8,
        flex: 1,
        lineHeight: 16
    }
});