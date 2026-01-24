import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../../config';
import MainContainer from '../vues/MainContainer';
import NavLogin from './NavLogin';

export const UserContextNavApp = createContext();
const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
};

const NavApp = () => {
  const [currentUserdata, setCurrentUserdata] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalArchive, setModalArchive] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('NavApp onAuthStateChanged fired, user:', user);
      setCurrentUserdata(user);
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, []);

  if (loadingData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0096F6" />
      </View>
    );
  }

  return (
    <UserContextNavApp.Provider
      value={{
        currentUserdata,
        modalVisible,
        setModalVisible,
        modalArchive,
        setModalArchive,
      }}
    >
      <Stack.Navigator screenOptions={screenOptions}>
        {!currentUserdata ? (
          <Stack.Screen
            name="NavLogin"
            component={NavLogin}
            options={{
              animationTypeForReplace: !currentUserdata ? 'pop' : 'push',
            }}
          />
        ) : (
          <Stack.Screen name="MainContainer" component={MainContainer} />
        )}
      </Stack.Navigator>
    </UserContextNavApp.Provider>
  );
};

export default NavApp;