import 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { UserContext } from '../context/UserContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../config';
import { doc, onSnapshot } from 'firebase/firestore';

import EmailVerificationScreen from '../composants/EmailVerificationScreen';
import InitialScreen from '../login/InitialScreen';
import LoginScreen from '../login/LoginScreen';
import SignUpScreen from '../login/SignUpScreen';
import NavApp from './NavApp';

const Stack = createStackNavigator();

const NewNav = () => {
  const [emailHigh, setEmailHigh] = useState('');
  const [docRecent, setDocRecent] = useState([]);
  const [currentUserNewNav, setCurrentUserNewNav] = useState(null);
  const [datUserTest, setDatUserTest] = useState(false);
  const [datUser, setDatUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('NewNav onAuthStateChanged fired, user:', user);

      // Si on change d'utilisateur (ou logout), on nettoie l'ancien snapshot
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        // Reload user to get fresh emailVerified status
        await user.reload();
        setCurrentUserNewNav(user);

        const userDocRef = doc(db, 'BiblioUser', user.email);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setDocRecent(data?.docRecent || []);
            setDatUser(data);
          } else {
            setDocRecent([]);
            setDatUser(null);
          }
          setIsInitialized(true);
        });
      } else {
        setCurrentUserNewNav(null);
        setDocRecent([]);
        setDatUser(null);
        setIsInitialized(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      emailHigh,
      setEmailHigh,
      docRecent,
      setDocRecent,
      currentUserNewNav,
      setCurrentUserNewNav,
      datUserTest,
      setDatUserTest,
      datUser,
      setDatUser,
    }),
    [emailHigh, docRecent, currentUserNewNav, datUserTest, datUser]
  );

  if (!isInitialized) {
    return null; // ou un loader
  }

  return (
    <UserContext.Provider value={contextValue}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Show different screens based on auth state */}
          {!currentUserNewNav ? (
            // Not signed in - show login flow
            <>
              <Stack.Screen name="InitialScreen" component={InitialScreen} />
              <Stack.Screen name="LoginScreen" component={LoginScreen} />
              <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
              <Stack.Screen
                name="EmailVerificationScreen"
                component={EmailVerificationScreen}
              />
            </>
          ) : !currentUserNewNav.emailVerified ? (
            // Signed in but not verified - verification + main app
            <>
              <Stack.Screen
                name="EmailVerificationScreen"
                component={EmailVerificationScreen}
                initialParams={{ email: currentUserNewNav.email }}
              />
              <Stack.Screen name="MainApp" component={NavApp} />
            </>
          ) : (
            // Signed in and verified - show main app
            <Stack.Screen name="MainApp" component={NavApp} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </UserContext.Provider>
  );
};

export default NewNav;
