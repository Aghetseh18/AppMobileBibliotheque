import { View, Text, SafeAreaView, Image, Dimensions } from 'react-native'
import React from 'react'
import { useConfig } from '../context/ConfigContext'

const HEIGHT = Dimensions.get('window').height
const WIDTH = Dimensions.get('window').width


const Messages = () => {
  return (
    <SafeAreaView>
      <View style={{ height: HEIGHT * 0.15, width: WIDTH, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#E8E8E8' }}>
        <View style={{ height: '100%', width: '47%', justifyContent: 'center', backgroundColor: '#F5F5F5' }}>
          <Image style={{ height: 35, width: 35, alignSelf: 'center' }} source={require('../../assets/image/cahier.png')} />
          <Text style={{ fontFamily: 'San Francisco', fontWeight: '700', textAlign: 'center' }}>Commandes</Text>
          <Text style={{ fontFamily: 'Roboto', textAlign: 'center', margin: 3, fontSize: 12 }}>restez informé sur le statut de vos commandes</Text>
        </View>

        <View style={{ height: '100%', width: '47%', justifyContent: 'center', backgroundColor: '#F5F5F5' }}>
          <Image style={{ height: 35, width: 35, alignSelf: 'center' }} source={require('../../assets/image/audio.png')} />
          <Text style={{ fontFamily: 'San Francisco', fontWeight: '700', textAlign: 'center' }}>Nouvelles</Text>
          <Text style={{ fontFamily: 'Roboto', textAlign: 'center', margin: 3, fontSize: 12 }}>soyez le premier au courant des mises à jour...</Text>
        </View>
      </View>
      <Text style={{ color: 'gray', fontSize: 10, textDecorationLine: 'line-through', textDecorationStyle: 'solid', textAlign: 'center', textDecorationColor: '#DCDCDC' }}>-                                                                                     -</Text>
      <View style={{ flexDirection: 'row', margin: 5 }}>
        <Image style={{ height: 35, width: 35, margin: 5, marginTop: 7 }} source={require('../../assets/image/coeur2.png')} />
        <View style={{ width: 250 }}>
          <Text style={{ fontFamily: 'San Francisco', marginTop: 5, fontWeight: '800', }}>SHEINGals</Text>
          <Text style={{ fontFamily: 'Roboto', marginTop: 3, }}>Des nouveaux j'aime, commentaires et abonnés</Text>
        </View>
      </View>

      <Text style={{ color: 'gray', fontSize: 10, textDecorationLine: 'line-through', textDecorationStyle: 'solid', textAlign: 'center', textDecorationColor: '#DCDCDC' }}>-                                                                                     -</Text>
      <View style={{ flexDirection: 'row', margin: 5 }}>
        <Image style={{ height: 35, width: 35, margin: 5, marginTop: 7 }} source={require('../../assets/image/coeur2.png')} />
        <View style={{ width: 250 }}>
          <Text style={{ fontFamily: 'San Francisco', marginTop: 5, fontWeight: '800', }}>Activités</Text>
          <Text style={{ fontFamily: 'Roboto', marginTop: 3, }}>Des1 nouveaux j'aime, commentaires et abonnés</Text>
        </View>
      </View>

      <Text style={{ color: 'gray', fontSize: 10, textDecorationLine: 'line-through', textDecorationStyle: 'solid', textAlign: 'center', textDecorationColor: '#DCDCDC' }}>-                                                                                     -</Text>
      <View style={{ flexDirection: 'row', margin: 5 }}>
        <Image style={{ height: 35, width: 35, margin: 5, marginTop: 7 }} source={require('../../assets/image/coeur2.png')} />
        <View style={{ width: 250 }}>
          <Text style={{ fontFamily: 'San Francisco', marginTop: 5, fontWeight: '800', }}>SHEINGals</Text>
          <Text style={{ fontFamily: 'Roboto', marginTop: 3, }}>Des1 nouveaux j'aime, commentaires et abonnés</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default Messages