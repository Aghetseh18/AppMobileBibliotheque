import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import math from '../../assets/biblio/math.jpg';
import { API_URL } from '../../apiConfig';

const similarBooks = [
        {
            "cathegorie": "Genie Civile",
            "commentaire": [
                {
                    "heure": "Mon, 30 Jan 2023 04:17:22 GMT",
                    "nomUser": "ewoki ebouele",
                    "note": "4",
                    "texte": "tres bon livre"
                }
            ],
            "desc": ".le meilleur",
            "etagere": "5 droite",
            "exemplaire": 8,
            "id": "Béton Armé 2",
            "image": "https://imagizer.imageshack.com/img922/3606/Ie8xYd.jpg",
            "name": "Béton Armé 2",
            "nomBD": "Béton Armé 2",
            "salle": ""
        },
        {
            "cathegorie": "Genie Informatique",
            "commentaire": [
                {
                    "heure": "Sat, 27 Jan 2024 09:03:40 GMT",
                    "nomUser": "",
                    "note": 0,
                    "texte": ""
                }
            ],
            "desc": "",
            "etagere": "",
            "exemplaire": 0,
            "id": "D ED",
            "image": null,
            "name": "D ED",
            "nomBD": "D ED",
            "salle": ""
        },
        {
            "cathegorie": "Genie Civile",
            "commentaire": [
                {
                    "heure": "Fri, 21 Jun 2024 12:23:30 GMT",
                    "nomUser": "",
                    "note": 0,
                    "texte": ""
                }
            ],
            "desc": "",
            "etagere": "3",
            "exemplaire": 1,
            "id": "Etude des structures",
            "image": "https://www.google.com/imgres?q=5%20livres%20utilises%20pour%20le%20g%C3%A9ni%C3%A9%20civil&imgurl=https%3A%2F%2Fqph.cf2.quoracdn.net%2Fmain-qimg-2664851ef4ce113a50a31f95a89685ec-pjlq&imgrefurl=https%3A%2F%2Ffr.quora.com%2FQuels-livres-conseilleriez-vous-%25C3%25A0-un-ing%25C3%25A9nieur-en-g%25C3%25A9nie-civil&docid=0l8FEaWTV2ckuM&tbnid=WtwBmiJAsObI4M&vet=12ahUKEwiP65Ly1uyGAxUPSDABHWJJBTIQM3oECBgQAA..i&w=602&h=860&hcb=2&ved=2ahUKEwiP65Ly1uyGAxUPSDABHWJJBTIQM3oECBgQAA",
            "name": "Etude des structures",
            "nomBD": "Etude des structures",
            "salle": "",
            "type": ""
        }];

export default function SimilarBooksView() {
  const [title, setBookName] = useState('');
  const [similarBooks, setSimilarBooks] = useState(similarBooks);
  const [loading, setLoading] = useState(false);

  const fetchSimilarBooks = async () => {
    if (!title.trim()) {
      alert('Veuillez entrer un titre de livre.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/similarbooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
        
      });
      
      if (!response.ok) throw new Error('Erreur lors de la récupération des livres similaires.');
      console.log(response)

      const data = await response.json();
      setSimilarBooks(data.books || []);
    } catch (error) {
      console.error('Erreur:', error);
      console.log(error)
      alert('Impossible de récupérer les livres similaires. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };
  console.log(similarBooks)

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => {
        console.log('Livre sélectionné:', item.id);
      }}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.bookImage}
        defaultSource={math}
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.bookAuthor}>{item.desc}</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.borrowCount}>{item.exemplaire} exemplaires</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
    >
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Rechercher des livres similaires</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Entrez le titre du livre"
          value={title}
          onChangeText={setBookName}
        />
        <TouchableOpacity style={styles.searchButton} onPress={fetchSimilarBooks}>
          <Text style={styles.searchButtonText}>{loading ? 'Recherche...' : 'Rechercher'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={similarBooks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && similarBooks.length === 0 ? (
            <Text style={styles.noResultsText}>Aucun livre trouvé.</Text>
          ) : null
        }
      />
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 15,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  textInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  searchButton: {
    marginLeft: 10,
    backgroundColor: '#F16522',
    borderRadius: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bookInfo: {
    padding: 10,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  borrowCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  noResultsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
});