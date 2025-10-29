// firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo";

const firebaseConfig = {
  apiKey: "AIzaSyC-7xG1TTllRRyMldk4mS7k_8BcjMTAWi8",
  authDomain: "biblio-cc84b.firebaseapp.com",
  projectId: "biblio-cc84b",
  storageBucket: "biblio-cc84b.firebasestorage.app",
  messagingSenderId: "823617403574",
  appId: "823617403574:web:e579c9bd1788f137c24417",
  measurementId: "G-PWEJXF3Q4M"
};

// Initialiser l'application Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialiser Auth
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialiser Firestore et Storage
const db = getFirestore(app);
const storage = getStorage(app);

// Variable pour suivre l'état de l'initialisation
let isInitialized = false;

// Fonction pour initialiser la persistence Firestore
async function initializePersistence() {
  if (isInitialized) return;

  try {
    console.log("Vérification de la connexion réseau...");
    const netState = await NetInfo.fetch();
    
    if (netState.isConnected) {
      console.log("Activation de la persistence Firestore...");
      try {
        await enableIndexedDbPersistence(db);
        console.log("Persistence Firestore activée avec succès");
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code === 'unimplemented') {
          console.warn("Current browser does not support all of IndexedDB features.");
        }
      }
    }
    isInitialized = true;
    console.log("Initialisation de Firebase terminée avec succès");
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la persistence:", error);
    throw error;
  }
}

// Fonction pour obtenir les instances Firebase
async function getFirebaseInstances() {
  if (!isInitialized) {
    await initializePersistence();
  }
  return { auth, db, storage };
}

// Initialiser la persistence au démarrage
initializePersistence().catch(console.error);

export { auth, db, storage, getFirebaseInstances, isInitialized };
