import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { collection, query, where, getDocs, limit, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config';
import { Ionicons } from '@expo/vector-icons';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const USER_EMAIL = 'leroydonchi@gmail.com';

const SearchModal = ({ visible, onClose, navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialiser le document utilisateur si nécessaire
  const initializeUserDocument = async () => {
    try {
      const userRef = doc(db, 'BiblioUser', USER_EMAIL);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Créer un nouveau document utilisateur
        await setDoc(userRef, {
          email: USER_EMAIL,
          searchHistory: [],
          // autres champs par défaut si nécessaire
        });
        return [];
      }

      const userData = userDoc.data();
      if (!userData.searchHistory) {
        // Initialiser searchHistory s'il n'existe pas
        await updateDoc(userRef, {
          searchHistory: []
        });
        return [];
      }

      return userData.searchHistory || [];
    } catch (error) {
      console.error('Error initializing user document:', error);
      return [];
    }
  };

  // Charger l'historique des recherches au démarrage
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const userRef = doc(db, 'BiblioUser', USER_EMAIL);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          console.log('User document does not exist, creating...');
          await setDoc(userRef, {
            email: USER_EMAIL,
            tabMessages: [],
            signalMessage: 'ras',
            searchHistory: []
          });
          setRecentSearches([]);
          return;
        }

        const userData = userDoc.data();
        console.log('Loaded user data:', userData);

        if (!userData.searchHistory || !Array.isArray(userData.searchHistory)) {
          console.log('Initializing search history');
          await updateDoc(userRef, {
            searchHistory: []
          });
          setRecentSearches([]);
        } else {
          setRecentSearches(userData.searchHistory);
        }
      } catch (error) {
        console.error('Error loading history:', error);
        setRecentSearches([]);
      }
    };

    if (visible) {
      loadHistory();
    }
  }, [visible]);

  // Réinitialiser l'état quand le modal se ferme
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [visible]);

  // Fonction pour fermer le modal et réinitialiser l'état
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  // Fonction pour effectuer la recherche en temps réel
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'BiblioInformatique'),
        where('name', '>=', text),
        where('name', '<=', text + '\uf8ff'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Fonction pour ajouter une recherche à l'historique
  const addToRecentSearches = async (searchTerm) => {
    if (!searchTerm || typeof searchTerm !== 'string') {
      console.error('Invalid search term:', searchTerm);
      return;
    }

    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm === '') {
      console.error('Empty search term after trim');
      return;
    }

    try {
      // 1. Récupérer le document utilisateur actuel
      const userRef = doc(db, 'BiblioUser', USER_EMAIL);
      const userDoc = await getDoc(userRef);

      // 2. Si le document n'existe pas, le créer avec un historique vide
      if (!userDoc.exists()) {
        console.log('Creating new user document');
        await setDoc(userRef, {
          email: USER_EMAIL,
          tabMessages: [],
          signalMessage: 'ras',
          searchHistory: [trimmedTerm]
        });
        setRecentSearches([trimmedTerm]);
        return;
      }

      // 3. Récupérer les données actuelles
      const userData = userDoc.data();
      console.log('Current user data:', userData);

      // 4. Préparer le nouveau tableau d'historique
      let currentHistory = Array.isArray(userData.searchHistory) ? userData.searchHistory : [];

      // 5. Vérifier si le terme existe déjà
      if (currentHistory.includes(trimmedTerm)) {
        // Si le terme existe, le déplacer au début
        currentHistory = currentHistory.filter(term => term !== trimmedTerm);
      }

      // 6. Ajouter le nouveau terme au début et limiter à 8 éléments
      currentHistory.unshift(trimmedTerm);
      currentHistory = currentHistory.slice(0, 8);

      // 7. Mettre à jour le document avec le nouveau tableau
      const updateData = {
        ...userData,
        searchHistory: currentHistory
      };

      // 8. Sauvegarder avec setDoc pour remplacer tout le document
      await setDoc(userRef, updateData);

      // 9. Mettre à jour l'état local
      setRecentSearches(currentHistory);
      console.log('History updated successfully');

    } catch (error) {
      console.error('Error in addToRecentSearches:', error);
      // En cas d'erreur, au moins mettre à jour l'état local
      setRecentSearches(prev => {
        const newHistory = [trimmedTerm, ...prev.filter(term => term !== trimmedTerm)].slice(0, 8);
        return newHistory;
      });
    }
  };

  // Fonction pour sélectionner un livre
  const handleSelectBook = (book) => {
    if (!book || !book.name) return;

    const bookName = String(book.name).trim();
    if (bookName) {
      addToRecentSearches(bookName);
      setSearchQuery(''); // Réinitialiser la recherche
      setSearchResults([]); // Réinitialiser les résultats
      navigation.navigate('Produit', {
        nomBD: book.id || '',
        image: book.image || null,
        name: bookName,
        desc: book.desc || '',
        cathegorie: book.cathegorie || '',
        exemplaire: book.exemplaire || 0,
        salle: book.salle || '',
        etagere: book.etagere || '',
        commentaire: book.commentaire || []
      });
      handleClose(); // Utiliser handleClose au lieu de onClose
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
              <TextInput
                placeholder="Rechercher un livre..."
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="gray" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.resultsContainer}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {isSearching ? (
              <ActivityIndicator style={styles.loader} size="large" color="#0096F6" />
            ) : searchQuery.length > 0 ? (
              <View>
                {searchResults.map((book, index) => (
                  <TouchableOpacity
                    key={book.id || index}
                    style={styles.resultItem}
                    onPress={() => handleSelectBook(book)}
                  >
                    <Image
                      source={book.image}
                      style={styles.bookImage}
                      resizeMode="cover"
                    />
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle}>{book.name}</Text>
                      <Text style={styles.bookCategory}>{book.cathegorie}</Text>
                      <Text style={styles.bookAvailability}>
                        {book.exemplaire > 0 ? `${book.exemplaire} exemplaire(s) disponible(s)` : 'Non disponible'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {searchResults.length === 0 && (
                  <Text style={styles.noResults}>Aucun livre trouvé</Text>
                )}
              </View>
            ) : (
              <View style={styles.recentSearchesContainer}>
                <Text style={styles.recentTitle}>Recherches récentes</Text>
                {recentSearches.length > 0 ? (
                  recentSearches.map((search, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.recentItem}
                      onPress={() => handleSearch(search)}
                    >
                      <Ionicons name="time-outline" size={20} color="gray" />
                      <Text style={styles.recentText}>{search}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noResults}>Aucune recherche récente</Text>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginLeft: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  resultsContainer: {
    flex: 1,
  },
  loader: {
    marginTop: 20,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookImage: {
    width: 60,
    height: 80,
    borderRadius: 5,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 10,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookCategory: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
  bookAvailability: {
    fontSize: 14,
    color: '#FF6600',
    marginTop: 2,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: 'gray',
  },
  recentSearchesContainer: {
    padding: 15,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recentText: {
    marginLeft: 10,
    fontSize: 16,
  },
});

export default SearchModal;
