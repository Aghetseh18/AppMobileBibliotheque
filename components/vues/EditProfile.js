// Créer le fichier EditProfile.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../hooks/useTranslation';

export default function EditProfile({ route, navigation }) {
    const { imageM, nameM, emailM, telM, departM, niveauM } = route.params;
    const { t } = useTranslation();

    const [name, setName] = useState(nameM || '');
    const [email, setEmail] = useState(emailM || '');
    const [tel, setTel] = useState(telM || '');
    const [depart, setDepart] = useState(departM || '');
    const [niveau, setNiveau] = useState(niveauM || '');
    const [imageUri, setImageUri] = useState(imageM || '');
    const [saving, setSaving] = useState(false);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('error'), t('permission_photos_needed') || 'Nous avons besoin de votre permission pour accéder à vos photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets[0] && result.assets[0].uri) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Erreur lors de la sélection de l'image:", error);
            Alert.alert(t('error'), t('image_selection_failed') || "Impossible de sélectionner l'image");
        }
    };

    const saveProfile = async () => {
        if (!email) {
            Alert.alert(t('error'), t('email_required'));
            return;
        }

        setSaving(true);
        try {
            await updateDoc(doc(db, "BiblioUser", email), {
                name,
                tel,
                departement: depart,
                niveau,
                imageUri
            });

            Alert.alert(t('success'), t('profile_update_success'));
            navigation.goBack();
        } catch (error) {
            console.error("Erreur lors de la mise à jour:", error);
            Alert.alert(t('error'), t('profile_update_error'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('edit_profile_title')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.imageSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                            {imageUri ? (
                                <Image style={styles.profileLargeImage} source={{ uri: imageUri }} />
                            ) : (
                                <View style={styles.placeholderLargeImage}>
                                    <Ionicons name="person" size={50} color="#CCCCCC" />
                                </View>
                            )}
                            <View style={styles.cameraIconBadge}>
                                <Ionicons name="camera" size={18} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.changeLabel}>{t('change_photo')}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Text style={styles.groupLabel}>{t('personal_info')}</Text>

                        <View style={styles.inputCard}>
                            <View style={styles.inputIconWrapper}>
                                <Ionicons name="person-outline" size={20} color="#FF8A50" />
                            </View>
                            <View style={styles.inputMain}>
                                <Text style={styles.labelSmall}>{t('full_name')}</Text>
                                <TextInput
                                    style={styles.inputStyle}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder={t('your_name_placeholder')}
                                    placeholderTextColor="#A1A1A1"
                                />
                            </View>
                        </View>

                        <View style={[styles.inputCard, styles.disabledCard]}>
                            <View style={styles.inputIconWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#8E8E93" />
                            </View>
                            <View style={styles.inputMain}>
                                <Text style={styles.labelSmall}>{t('email_label')}</Text>
                                <TextInput
                                    style={[styles.inputStyle, { color: '#8E8E93' }]}
                                    value={email}
                                    editable={false}
                                />
                            </View>
                            <Ionicons name="lock-closed" size={14} color="#CECECE" style={{ marginRight: 5 }} />
                        </View>

                        <View style={styles.inputCard}>
                            <View style={styles.inputIconWrapper}>
                                <Ionicons name="call-outline" size={20} color="#4361EE" />
                            </View>
                            <View style={styles.inputMain}>
                                <Text style={styles.labelSmall}>{t('phone_label')}</Text>
                                <TextInput
                                    style={styles.inputStyle}
                                    value={tel}
                                    onChangeText={setTel}
                                    placeholder={t('phone_placeholder')}
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#A1A1A1"
                                />
                            </View>
                        </View>

                        <View style={styles.inputCard}>
                            <View style={styles.inputIconWrapper}>
                                <Ionicons name="business-outline" size={20} color="#EF476F" />
                            </View>
                            <View style={styles.inputMain}>
                                <Text style={styles.labelSmall}>{t('dept_label')}</Text>
                                <TextInput
                                    style={styles.inputStyle}
                                    value={depart}
                                    onChangeText={setDepart}
                                    placeholder={t('dept_placeholder')}
                                    placeholderTextColor="#A1A1A1"
                                />
                            </View>
                        </View>

                        <View style={styles.inputCard}>
                            <View style={styles.inputIconWrapper}>
                                <Ionicons name="school-outline" size={20} color="#118AB2" />
                            </View>
                            <View style={styles.inputMain}>
                                <Text style={styles.labelSmall}>{t('level_label')}</Text>
                                <TextInput
                                    style={styles.inputStyle}
                                    value={niveau}
                                    onChangeText={setNiveau}
                                    placeholder={t('level_placeholder')}
                                    placeholderTextColor="#A1A1A1"
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtnRefined, saving && styles.disabledBtn]}
                        onPress={saveProfile}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.saveBtnText}>
                            {saving ? t('saving') : t('save_changes')}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
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
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 138, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imageSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
    },
    imageWrapper: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    profileLargeImage: {
        height: 120,
        width: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    placeholderLargeImage: {
        height: 120,
        width: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    cameraIconBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#FF8A50',
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    changeLabel: {
        fontSize: 14,
        color: '#FF8A50',
        fontWeight: '800',
        marginTop: 12,
        letterSpacing: 0.5,
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    groupLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 15,
        marginLeft: 4,
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    disabledCard: {
        backgroundColor: '#F2F2F7',
        opacity: 0.8,
    },
    inputIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    inputMain: {
        flex: 1,
    },
    labelSmall: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8E8E93',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    inputStyle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        paddingVertical: 2,
    },
    saveBtnRefined: {
        backgroundColor: '#FF8A50',
        borderRadius: 22,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginTop: 20,
        shadowColor: '#FF8A50',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
