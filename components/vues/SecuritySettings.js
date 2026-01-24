import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';

export default function SecuritySettings({ navigation }) {
    const { t } = useTranslation();
    const [twoFactorAuth, setTwoFactorAuth] = useState(false);
    const [loginNotifications, setLoginNotifications] = useState(true);
    const [dataCollection, setDataCollection] = useState(true);

    const handleTwoFactorToggle = (value) => {
        if (value) {
            Alert.alert(
                t('two_factor'),
                t('feature_coming_soon'),
                [{ text: t('ok') }]
            );
        } else {
            setTwoFactorAuth(value);
        }
    };

    const handleChangePassword = () => {
        navigation.navigate('ChangePassword');
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
                        Alert.alert(t('val_information'), t('delete_account_contact_admin'));
                    }
                }
            ]
        );
    };

    const renderSettingItem = ({ icon, iconColor, title, subtitle, action, toggle, value, dangerous = false }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={action}
            disabled={toggle}
        >
            <View style={[styles.settingIconContainer, { backgroundColor: iconColor + '20' }]}>
                {icon}
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, dangerous && styles.dangerousText]}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {toggle && (
                <Switch
                    value={value}
                    onValueChange={action}
                    trackColor={{ false: "#D1D1D6", true: "#FF8A5030" }}
                    thumbColor={value ? "#FF8A50" : "#F4F4F4"}
                    ios_backgroundColor="#D1D1D6"
                />
            )}
            {!toggle && (
                <MaterialIcons name="arrow-forward-ios" size={16} color="#A1A1A1" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
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

                    {renderSettingItem({
                        icon: <MaterialIcons name="security" size={20} color="#4CAF50" />,
                        iconColor: "#4CAF50",
                        title: t('two_factor'),
                        subtitle: t('two_factor_subtitle'),
                        toggle: true,
                        value: twoFactorAuth,
                        action: handleTwoFactorToggle
                    })}
                </View>

                {/* Section Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('security_notifications')}</Text>

                    {renderSettingItem({
                        icon: <Ionicons name="notifications-outline" size={20} color="#FF9800" />,
                        iconColor: "#FF9800",
                        title: t('login_alerts'),
                        subtitle: t('login_alerts_subtitle'),
                        toggle: true,
                        value: loginNotifications,
                        action: setLoginNotifications
                    })}
                </View>

                {/* Section Confidentialité */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('data_privacy')}</Text>

                    {renderSettingItem({
                        icon: <MaterialIcons name="analytics" size={20} color="#2196F3" />,
                        iconColor: "#2196F3",
                        title: t('data_collection'),
                        subtitle: t('data_collection_subtitle'),
                        toggle: true,
                        value: dataCollection,
                        action: setDataCollection
                    })}

                    {renderSettingItem({
                        icon: <MaterialIcons name="download" size={20} color="#9C27B0" />,
                        iconColor: "#9C27B0",
                        title: t('download_data'),
                        subtitle: t('download_data_subtitle'),
                        action: () => Alert.alert(t('val_information'), t('feature_coming_soon'))
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

                {/* Informations légales */}
                <View style={styles.legalSection}>
                    <Text style={styles.legalTitle}>{t('legal_info')}</Text>
                    <TouchableOpacity style={styles.legalItem}>
                        <Text style={styles.legalText}>{t('privacy_policy')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.legalItem}>
                        <Text style={styles.legalText}>{t('terms_of_use')}</Text>
                    </TouchableOpacity>
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
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
        marginLeft: 16,
        marginBottom: 8,
        marginTop: 8,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 1,
    },
    settingIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    dangerousText: {
        color: '#FF3B30',
    },
    legalSection: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 16,
        marginBottom: 40,
    },
    legalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 12,
    },
    legalItem: {
        paddingVertical: 8,
    },
    legalText: {
        fontSize: 14,
        color: '#FF8A50',
    },
});