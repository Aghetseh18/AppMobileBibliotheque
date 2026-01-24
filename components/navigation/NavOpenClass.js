import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
const Stack = createStackNavigator()

import Accueil from '../openclassroom/Accueil'
import Departement from '../openclassroom/Departement'
import Matiere from '../openclassroom/Matiere'
import Cours from '../openclassroom/Cours'
import Semestre from '../openclassroom/Semestre'
import TableMatiere from '../openclassroom/TableMatiere'
import Quizz from '../openclassroom/Quizz'
import VideoCours from '../openclassroom/VideoCours'
import CoursInscrit from '../openclassroom/CoursInscrit'
import PageWeb2 from '../openclassroom/PageWeb2'
import SmallRect2 from '../openclassroom/SmallRect2'
import Cours2 from '../openclassroom/Cours2'
import CoursInscrit2 from '../openclassroom/CoursInscrit2'
import CoursInscrit3 from '../openclassroom/CoursInscrit3'
import CoursInscrit4 from '../openclassroom/CoursInscrit4'
import SimilarBooksView from '../vues/SimilarBooksView'

const screenOptions = {
    headerShown: false,
}



const NavOpenClass = () => (
    <Stack.Navigator initialRouteName='Accueil' screenOptions={screenOptions}>
        <Stack.Screen name='Accueil' component={Accueil} />
        <Stack.Screen name='Departement' component={Departement} />
        <Stack.Screen name='Semestre' component={Semestre} />
        <Stack.Screen name='TableMatiere' component={TableMatiere} />
        <Stack.Screen name='Matiere' component={Matiere} />
        <Stack.Screen name='Cours' component={Cours} />
        <Stack.Screen name='Cours2' component={Cours2} />
        <Stack.Screen name='CoursInscrit' component={CoursInscrit} />
        <Stack.Screen name='CoursInscrit2' component={CoursInscrit2} />
        <Stack.Screen name='CoursInscrit3' component={CoursInscrit3} />
        <Stack.Screen name='CoursInscrit4' component={CoursInscrit4} />
        <Stack.Screen name='Quizz' component={Quizz} />
        <Stack.Screen name='VideoCours' component={VideoCours} />
        <Stack.Screen name='PageWeb2' component={PageWeb2} />
        <Stack.Screen name='SmallRect2' component={SmallRect2} />
        <Stack.Screen name="SimilarBooks" component={SimilarBooksView} />

    </Stack.Navigator>
)

export default NavOpenClass