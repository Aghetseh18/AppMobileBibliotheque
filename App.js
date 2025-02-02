import * as Font from 'expo-font';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import NewNav from './components/navigation/NewNav';
import { UserContextProvider } from './components/context/UserContext';
import { FirebaseProvider } from './components/context/FirebaseContext';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Georgia': require('./assets/fonts/Georgia.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error("Erreur lors du chargement des polices:", error);
        // Continuer même si la police ne se charge pas
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FirebaseProvider>
      <UserContextProvider>
        <NewNav />
      </UserContextProvider>
    </FirebaseProvider>
  );
}

 {/*<NavApp />*/}

 
 const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
