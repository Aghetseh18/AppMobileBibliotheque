import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ELearningPage from '../elearning/ElearningPage';
import MemoireDetails from '../elearning/MemoireDetails';
import Produit from '../composants/achats/Produit';

const Stack = createStackNavigator();

const NavElearning = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ElearningHome" component={ELearningPage} />
            <Stack.Screen name="MemoireDetails" component={MemoireDetails} />
            <Stack.Screen name="Produit" component={Produit} />
        </Stack.Navigator>
    );
};

export default NavElearning;
