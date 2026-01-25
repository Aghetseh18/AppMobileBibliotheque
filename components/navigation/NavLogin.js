import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import SignUpScreen from '../login/SignUpScreen';
import LoginScreen from '../login/LoginScreen';
import InitialScreen from '../login/InitialScreen';
import EmailVerificationScreen from '../composants/EmailVerificationScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: 'white' }
};

const NavLogin = () => {
  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName='InitialScreen'
    >
      <Stack.Screen name='InitialScreen' component={InitialScreen} />
      <Stack.Screen name='LoginScreen' component={LoginScreen} />
      <Stack.Screen name='SignUpScreen' component={SignUpScreen} />
      <Stack.Screen name='EmailVerificationScreen' component={EmailVerificationScreen} />
    </Stack.Navigator>
  );
};

export default NavLogin;