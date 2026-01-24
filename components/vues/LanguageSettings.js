import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, Alert } from 'react-native';
import React, { useState, useContext, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../context/UserContext';
import { db } from '../../config';
import { doc, updateDoc } from 'firebase/firestore';
import { useTranslation } from '../hooks/useTranslation';

export default function LanguageSettings({ navigation }) {
    const { datUser, setDatUser } = useContext(UserContext);
    const { t } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(datUser?.language || 'Français');

    const languages = [
        { id: '1', name: 'Français', code: 'fr' },
        { id: '2', name: 'English', code: 'en' },
    ];

    useEffect(() => {
        if (datUser?.language) {
            setSelectedLanguage(datUser.language);
        }
    }, [datUser]);

    const handleLanguageSelect = async (language) => {
        const prevLanguage = selectedLanguage;
        setSelectedLanguage(language.name);

        if (datUser?.email) {
            try {
                const userRef = doc(db, 'BiblioUser', datUser.email);
                await updateDoc(userRef, {
                    language: language.name
                });

                // Update local context
                if (setDatUser) {
                    setDatUser({ ...datUser, language: language.name });
                }

            } catch (error) {
                console.error("Error updating language:", error);
                Alert.alert(t('error'), t('change_language_error'));
                setSelectedLanguage(prevLanguage); // Revert on error
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('language')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <Text style={styles.subtitle}>{t('select_language')}</Text>

            <FlatList
                data={languages}
                keyExtractor={(item) => item.id}
                style={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.languageItem}
                        onPress={() => handleLanguageSelect(item)}
                    >
                        <Text style={styles.languageName}>{item.name}</Text>
                        {selectedLanguage === item.name && (
                            <Ionicons name="checkmark-circle" size={24} color="#FF8A50" />
                        )}
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
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
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
    },
    backButton: {
        padding: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 24,
    },
    list: {
        flex: 1,
    },
    languageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    languageName: {
        fontSize: 16,
        color: '#000000',
    },
    separator: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
});