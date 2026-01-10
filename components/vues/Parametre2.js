import { View, Text, Image, TouchableOpacity, Dimensions, TextInput, StyleSheet, Button, Pressable } from 'react-native'
import React, { useEffect, useState } from 'react'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { Ionicons } from '@expo/vector-icons';
import { db, storage } from '../../config'
import * as ImagePicker from 'expo-image-picker'
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, updateDoc } from "firebase/firestore"
import { v4 } from "uuid"
import Dialog from "react-native-dialog"

const WIDTH = Dimensions.get('screen').width
const HEIGHT = Dimensions.get('screen').height

const Parametre2 = (props) => {
  const { imageM, nameM, emailM, telM, departM, niveauM } = props.route.params
  const [name, setname] = useState(nameM || "")
  const [tel, settel] = useState(telM || '')
  const [niveau, setniveau] = useState(niveauM || '')
  const [depart, setdepart] = useState(departM || '')
  const [imageUser, setImageUser] = useState(imageM || '')
  const [changeImage, setChangeImage] = useState(false)
  const [visible, setVisible] = useState(false)
  const [termine, setTerminer] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [image2, setImage2] = useState(null)

  useEffect(() => {
    (async () => {
      const gallerieStatus = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (gallerieStatus.status !== 'granted') {
        alert('Désolé, nous avons besoin des permissions pour accéder à la galerie!');
      }
    })()
  }, [])

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5
      });

      if (!result.canceled && result.assets[0]) {
        setImage2(result.assets[0].uri)
        setChangeImage(true)
      }
    } catch (error) {
      console.error("Erreur lors de la sélection de l'image:", error);
      alert("Impossible de sélectionner l'image");
    }
  }

  async function uploadImage(imageUri) {
    if (!imageUri) return null;

    try {
      const response = await fetch(imageUri)
      const blobFile = await response.blob()
      const reference = ref(storage, `photoprofil2/${"pp" + v4()}`)
      const result = await uploadBytes(reference, blobFile)
      const url = await getDownloadURL(result.ref)
      return url
    } catch (err) {
      console.error("Erreur lors de l'upload de l'image:", err)
      return null
    }
  }

  const handleSave = async () => {
    try {
      setUploading(true)
      let imageUrl = imageUser

      if (changeImage && image2) {
        const newImageUrl = await uploadImage(image2)
        if (newImageUrl) {
          imageUrl = newImageUrl
        }
      }

      const userRef = doc(db, 'BiblioUser', emailM)
      await updateDoc(userRef, {
        name: name || nameM,
        niveau: niveau || niveauM,
        tel: tel || telM,
        departement: depart || departM,
        ...(imageUrl ? { imageUri: imageUrl } : {})
      })

      alert("Profil mis à jour avec succès!")
      props.navigation.goBack()
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error)
      alert("Erreur lors de la mise à jour du profil")
    } finally {
      setUploading(false)
      setVisible(false)
    }
  }

  function modifnAME(val) {
    setTerminer(true)
    setname(val)
  }

  function modifNivo(val) {
    setTerminer(true)
    setniveau(val)
  }

  function modifTel(val) {
    setTerminer(true)
    settel(val)
  }

  function modifDepart(val) {
    setTerminer(true)
    setdepart(val)
  }

  return (
    <KeyboardAwareScrollView>
      {termine ?
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', margin: 10, marginLeft: 10, marginRight: 10 }}>
          <TouchableOpacity onPress={() => props.navigation.goBack()}>
            <Text style={{ fontWeight: '500', fontSize: 13, color: '#DC143C', marginLeft: 15 }}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setVisible(true)} disabled={uploading}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: '#1E90FF', marginRight: 15 }}>
              {uploading ? 'Mise à jour...' : 'Terminer'}
            </Text>
          </TouchableOpacity>
        </View>
        : null
      }

      <View>
        <View style={{ flexDirection: 'column', width: WIDTH * 0.98, margin: 10, backgroundColor: '#DCDCDC', borderRadius: 20, marginLeft: 5, padding: 10, elevation: 10 }}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={pickImage}
              style={{
                height: 100,
                width: 100,
                borderRadius: 50,
                alignSelf: 'center',
                backgroundColor: 'gray',
                position: 'relative'
              }}
            >
              {(changeImage && image2) || imageUser ? (
                <Image
                  style={{
                    height: 100,
                    width: 100,
                    borderRadius: 50,
                    alignSelf: 'center'
                  }}
                  source={{ uri: changeImage ? image2 : imageUser }}
                />
              ) : null}
              <View style={{
                position: 'absolute',
                bottom: 5,
                right: 5,
                backgroundColor: '#FF8A50',
                borderRadius: 15,
                padding: 8,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={{ margin: 10 }}>
              <Text style={{ flexWrap: 'wrap', marginTop: 20, fontSize: 15 }}>Saisissez votre nom et ajoutez une photo</Text>
              <Text>de profil (Optionnelle)</Text>
            </View>
          </View>

          <View style={{ height: 1, width: WIDTH * 0.9, alignSelf: 'center', backgroundColor: '#fff', marginTop: 10 }}></View>
          <TextInput
            placeholder={nameM || "Votre nom"}
            value={name}
            onChangeText={modifnAME}
            style={styles.input}
          />
          <View style={{ height: 1, width: WIDTH * 0.9, alignSelf: 'center', backgroundColor: '#fff', marginTop: 4 }}></View>
        </View>

        <Text style={{ fontSize: 12, marginTop: 15, marginLeft: 20 }}>DEPARTEMENT</Text>
        <View style={{ flexDirection: 'column', width: WIDTH * 0.98, margin: 10, backgroundColor: '#DCDCDC', borderRadius: 20, marginLeft: 5, padding: 10 }}>
          <TextInput
            placeholder={departM || "Votre département"}
            value={depart}
            onChangeText={modifDepart}
            style={styles.input}
          />
        </View>

        <Text style={{ fontSize: 12, marginTop: 15, marginLeft: 20 }}>NIVEAU</Text>
        <View style={{ flexDirection: 'column', width: WIDTH * 0.98, margin: 10, backgroundColor: '#DCDCDC', borderRadius: 20, marginLeft: 5, padding: 10 }}>
          <TextInput
            placeholder={niveauM || "Votre niveau"}
            value={niveau}
            onChangeText={modifNivo}
            style={styles.input}
          />
        </View>

        <Text style={{ fontSize: 12, marginTop: 15, marginLeft: 20 }}>TELEPHONE</Text>
        <View style={{ flexDirection: 'column', width: WIDTH * 0.98, margin: 10, backgroundColor: '#DCDCDC', borderRadius: 20, marginLeft: 5, padding: 10 }}>
          <TextInput
            placeholder={telM || "Votre téléphone"}
            value={tel}
            onChangeText={modifTel}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={{ fontSize: 12, marginTop: 15, marginLeft: 20 }}>ADRESSE EMAIL</Text>
        <View style={{ flexDirection: 'column', width: WIDTH * 0.98, margin: 10, backgroundColor: '#DCDCDC', borderRadius: 20, marginLeft: 5, padding: 10, elevation: 5 }}>
          <Text style={{ fontWeight: '700', marginLeft: 10, color: 'gray' }}>{emailM}</Text>
        </View>
      </View>

      <Dialog.Container visible={visible}>
        <Dialog.Title>Confirmation</Dialog.Title>
        <Dialog.Description>
          Voulez-vous enregistrer les modifications ?
        </Dialog.Description>
        <Dialog.Button label="Non" onPress={() => setVisible(false)} />
        <Dialog.Button label="Oui" onPress={handleSave} />
      </Dialog.Container>
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  input: {
    color: '#000',
    margin: 5,
    fontSize: 14
  }
})

export default Parametre2