import { useNavigation } from '@react-navigation/native';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import React, { useContext, useState } from 'react';
import { ImageBackground, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../config'; 
import { UserContextNavApp } from '../navigation/NavApp';

// Fonction pour normaliser les chaînes (supprimer les accents)
const normalizeString = (str) => {
  if (!str) return ''; // Retourner une chaîne vide si str est undefined ou null
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim();
};

const BigRect = ({ salle, desc, etagere, exemplaire, image, name, cathegorie, datUser, commentaire, nomBD, type }) => {
  const navigation = useNavigation();  
  const { currentUserdata } = useContext(UserContextNavApp);

  const [modalVisible, setModalVisible] = useState(false);

  const voirProduit = () => {
    // S'assurer que name est défini avant de le normaliser
    const normalizedName = name ? normalizeString(name) : '';
    console.log('Navigation vers Produit:', {
      name: name,
      normalized: normalizedName,
      cathegorie: cathegorie
    });

    navigation.navigate('Produit', {
      salle,
      desc,
      etagere,
      exemplaire,
      image,
      name,
      normalizedName,
      cathegorie,
      datUser,
      commentaire,
      nomBD,
      type,
    });
  };

  const ajouter = async () => {
    try {
      if (currentUserdata?.email) {
        const userRef = doc(db, 'BiblioUser', currentUserdata.email);
        await updateDoc(userRef, {
          docRecentRegarder: arrayUnion({ cathegorieDoc: cathegorie, type }),
        });
      }
      voirProduit();
    } catch (error) {
      console.error("Error adding to Firebase:", error);
    }
  };

  return (
    <View style={styles.contain}>
      <TouchableOpacity onPress={ajouter} style={styles.bookCard}>
        <View style={styles.imageWrapper}>
          <ImageBackground 
            style={styles.container} 
            source={{ uri: image }}
            resizeMode="cover"
            imageStyle={styles.image}
          />
          {exemplaire < 3 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{exemplaire === 0 ? 'Indisponible' : 'Stock limité'}</Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {name || ''}
          </Text>
          <View style={styles.detailsRow}>
            <Text style={styles.category}>{cathegorie}</Text>
            <Text style={styles.exemplaire}>{exemplaire} ex{exemplaire > 1 ? 's' : ''}</Text>
          </View>
        </View>
      </TouchableOpacity>
      
      <Modal
        animationType='slide'
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Signaler ce contenu</Text>
            <TouchableOpacity onPress={() => setModalVisible(!modalVisible)} style={styles.modalButton}>
              <Text style={styles.modalText}>Pas intéressé</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(!modalVisible)} style={styles.modalButton}>
              <Text style={styles.modalText}>Image inappropriée</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(!modalVisible)} style={[styles.modalButton, styles.cancelButton]}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  contain: {
    width: 160,
    margin: 8,
    overflow: 'hidden',
  },
  bookCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  container: {
    height: '100%',
    width: '100%',
  },
  image: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 0,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 10,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    height: 40,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  category: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  exemplaire: {
    fontSize: 12,
    color: '#FF6600',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#f5f5f5',
    width: '100%',
    padding: 12,
    alignSelf: 'center',
    marginVertical: 6,
    borderRadius: 10,
  },
  modalText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#FF6600',
    marginTop: 10,
  },
  cancelText: {
    textAlign: 'center',
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default BigRect;