import { View, Button, ActivityIndicator, Image } from 'react-native';
import React, { useState } from 'react';
import firebase from '../../config';
import * as ImagePicker from 'expo-image-picker';

const Carre = () => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        alert('Désolé, nous avons besoin de la permission d\'accéder à votre galerie!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images, // Spécifier seulement les images
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Compromis entre qualité et taille
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      alert('Erreur lors de la sélection de l\'image');
    }
  };

  const uploadImage = async () => {
    if (!image) {
      alert('Veuillez d\'abord sélectionner une image');
      return;
    }

    setUploading(true);

    try {
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          console.log('Erreur de requête:', e);
          reject(new TypeError('Échec de la requête réseau'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', image, true);
        xhr.send(null);
      });


      const fileName = `image_${new Date().getTime()}`;
      const ref = firebase.storage().ref().child(`Pictures/${fileName}`);

      const uploadTask = ref.put(blob);

      uploadTask.on(
        firebase.storage.TaskEvent.STATE_CHANGED,
        (snapshot) => {

          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Progression: ${progress.toFixed(2)}%`);
        },
        (error) => {
          setUploading(false);
          console.error('Erreur d\'upload:', error);
          alert('Erreur lors de l\'upload de l\'image');
          blob.close();
        },
        () => {
          uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
            setUploading(false);
            console.log("URL de téléchargement:", downloadURL);

            alert('Image téléchargée avec succès!');
            blob.close();
          });
        }
      );
    } catch (error) {
      setUploading(false);
      console.error('Erreur générale:', error);
      alert('Une erreur s\'est produite. Veuillez réessayer.');
    }
  };

  return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: 200, height: 200, marginBottom: 20, borderRadius: 10 }}
        />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
        <Button title="Sélectionner une image" onPress={pickImage} />

        {uploading ? (
          <ActivityIndicator size="small" color="black" />
        ) : (
          <Button
            title="Télécharger l'image"
            onPress={uploadImage}
            disabled={!image}
          />
        )}
      </View>
    </View>
  );
};

export default Carre;