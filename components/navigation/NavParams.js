import React from 'react'
import Parametre from '../vues/Parametre'
import EditProfile from '../vues/EditProfile'
import ChangePassword from "../vues/ChangePassword"
import Emprunt from "../composants/achats/Emprunt"
import { createStackNavigator } from '@react-navigation/stack'
import Historique from "../vues/Historique"
import Notifications from "../vues/Notifications"
import VueUn from "../vues/VueUn"
import LanguageSettings from "../vues/LanguageSettings"

import InviteStudent from "../vues/InviteStudent"
import Aide from "../vues/Aide"
import SecuritySettings from "../vues/SecuritySettings"

const Stack = createStackNavigator()

const screenOptions = { headerShown: false }

const NavParams = () => {
    return (
        <Stack.Navigator screenOptions={screenOptions} initialRouteName='Parametre'>
            <Stack.Screen name='Parametre' component={Parametre} />
            <Stack.Screen name='EditProfile' component={EditProfile} />
            <Stack.Screen name='ChangePassword' component={ChangePassword} />
            <Stack.Screen name='Emprunt' component={Emprunt} />
            <Stack.Screen name='VueUn' component={VueUn} />
            <Stack.Screen name='Historique' component={Historique} />
            <Stack.Screen name='Notifications' component={Notifications} />
            <Stack.Screen name='LanguageSettings' component={LanguageSettings} />

            <Stack.Screen name='InviteStudent' component={InviteStudent} />
            <Stack.Screen name='Aide' component={Aide} />
            <Stack.Screen name='SecuritySettings' component={SecuritySettings} />
        </Stack.Navigator>
    )
}

export default NavParams