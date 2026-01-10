// Créer le fichier EditProfile.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfile({ route, navigation }) {
    const { imageM, nameM, emailM, telM, departM, niveauM } = route.params;

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
                Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos');
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
            Alert.alert('Erreur', "Impossible de sélectionner l'image");
        }
    };

    const saveProfile = async () => {
        if (!email) {
            Alert.alert('Erreur', 'Email requis');
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

            Alert.alert('Succès', 'Profil mis à jour avec succès');
            navigation.goBack();
        } catch (error) {
            console.error("Erreur lors de la mise à jour:", error);
            Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
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
                <Text style={styles.headerTitle}>Modifier le profil</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
                        {imageUri ? (
                            <Image style={styles.profileImage} source={{ uri: imageUri }} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="person" size={40} color="#CCCCCC" />
                            </View>
                        )}
                        <View style={styles.cameraButton}>
                            <Ionicons name="camera" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoText}>Changer la photo</Text>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Informations personnelles</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Nom complet</Text>
                        <TextInput
                            style={styles.textInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Votre nom"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Adresse email</Text>
                        <TextInput
                            style={[styles.textInput, { color: '#999' }]}
                            value={email}
                            editable={false}
                            placeholder="Votre email"
                        />
                        <Text style={styles.emailHint}>L'email ne peut pas être modifié</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Téléphone</Text>
                        <TextInput
                            style={styles.textInput}
                            value={tel}
                            onChangeText={setTel}
                            placeholder="Votre numéro de téléphone"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Département</Text>
                        <TextInput
                            style={styles.textInput}
                            value={depart}
                            onChangeText={setDepart}
                            placeholder="Votre département"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Niveau</Text>
                        <TextInput
                            style={styles.textInput}
                            value={niveau}
                            onChangeText={setNiveau}
                            placeholder="Votre niveau d'études"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveProfile}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
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
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    profileImageContainer: {
        height: 100,
        width: 100,
        borderRadius: 50,
        backgroundColor: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 8,
    },
    profileImage: {
        height: 100,
        width: 100,
        borderRadius: 50,
    },
    placeholderImage: {
        height: 100,
        width: 100,
        borderRadius: 50,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF8A50',
        borderRadius: 12,
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    changePhotoText: {
        fontSize: 14,
        color: '#FF8A50',
        fontWeight: '500',
    },
    formSection: {
        marginHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8E8E93',
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    emailHint: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 4,
    },
    saveButton: {
        backgroundColor: '#FF8A50',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        margin: 16,
        marginTop: 24,
        marginBottom: 40,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});