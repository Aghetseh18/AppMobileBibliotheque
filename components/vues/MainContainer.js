import { View, Text, SafeAreaView, Image, Dimensions, TouchableOpacity, FlatList, Modal, ScrollView, TextInput, StyleSheet, Button, ActivityIndicator, Linking } from 'react-native'
import React, { createContext, useState, useEffect, useContext } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config'
import { collection, getDocs, doc, updateDoc, query, where, limit, onSnapshot } from 'firebase/firestore'
import { UserContext } from '../context/UserContext';
import { useCartCount } from '../utils/cart';
import { useUnreadChatCount } from '../utils/chat';
import { useNotificationCount } from '../hooks/useNotificationCount';
import { useTranslation } from '../hooks/useTranslation';
import useOrgLogo from '../hooks/useOrgLogo';
import { useConfig } from '../context/ConfigContext';


//Screens
import VueUn from './VueUn'
import PubCar from '../composants/PubCar'
import PubRect from '../composants/PubRect'
import Messages from './Messages'
import Email from '../composants/message/EnhancedEmail'
import ELearningPage from '../elearning/ElearningPage';
import NavElearning from '../navigation/NavElearning';
import Recommend from '../composants/Recommend'
import Produit from '../composants/achats/Produit'
import Panier from '../composants/achats/Panier'
import FichePaie from '../composants/achats/FichePaie'
import Accueil from '../openclassroom/Accueil'
import Departement from '../openclassroom/Departement'
import Semestre from '../openclassroom/Semestre'
import TableMatiere from '../openclassroom/TableMatiere'
import Matiere from '../openclassroom/Matiere'
import Cours from '../openclassroom/Cours'
import Quizz from '../openclassroom/Quizz'
import NavOpenClass from '../navigation/NavOpenClass'
import NavShop from '../navigation/NavShop'
import BigRect from '../composants/BigRect'
import Carre from '../parameter/Carre'
import PageWeb2 from '../composants/PageWeb2'
import Parametre from './Parametre'
import NavParams from '../navigation/NavParams'
import ChatBot from '../composants/chatBot/ChatBot';

// Screen names
const homeName = 'Home'
const detailsName = 'Settings'
const settingsName = 'E-learning'
const search = 'Search'
const messagesName = 'Chat'

//Dimension
const HEIGHT = Dimensions.get('window').height
const WIDTH = Dimensions.get('window').width

const Tab = createBottomTabNavigator();

const MainContainer = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { theme } = useConfig();
  const colors = theme.colors;
  const { emailHigh, currentUserNewNav } = useContext(UserContext);
  const { logoUrl } = useOrgLogo();
  const cartCount = useCartCount(currentUserNewNav?.email);
  const [modal, setModal] = useState(false);
  const [datUser1, setDatUser1] = useState(route.params?.datUser || null);
  const [VuePartCours, setPartVueCours] = useState("");
  const [signalMain, setSignalMain] = useState(false)
  const [data, setData] = useState([]);
  const [loader, setLoader] = useState(true);
  const unreadChatCount = useUnreadChatCount(currentUserNewNav?.email);
  const unreadNotificationCount = useNotificationCount(currentUserNewNav?.email);


  const screenOptions = ({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;
      switch (route.name) {
        case 'Home':
          iconName = focused ? 'home' : 'home-outline';
          break;
        case 'Messages':
          iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          break;
        case 'OpenClass':
          iconName = focused ? 'school' : 'school-outline';
          break;
        case 'Shop':
          iconName = focused ? 'cart' : 'cart-outline';
          break;
        default:
          iconName = 'help-outline';
          break;
      }

      // Ajouter le badge pour l'onglet Messages
      if (route.name === 'Messages' && unreadChatCount > 0) {
        return (
          <View style={styles.tabIconContainer}>
            <Ionicons name={iconName} size={size} color={color} />
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{unreadChatCount}</Text>
            </View>
          </View>
        );
      }

      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.text?.secondary || 'gray',
    tabBarStyle: {
      backgroundColor: colors.surface || '#FFF',
      borderTopColor: colors.border || 'transparent',
    },
    headerStyle: {
      backgroundColor: colors.primary,
    },
    headerTintColor: '#FFF',
  });

  const voirMessage = () => {
    navigation.navigate('Panier', {})
  }

  const handlePress = () => {
    Linking.openURL('https://www.google.com').catch(err => {
      console.error("Erreur lors de l'ouverture de Google :", err);
    });
  };

  function lire() {
    setSignalMain(true)
    navigation.navigate('Email')
  }

  const getData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "BiblioInformatique"));
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push(doc.data());
      });
      setData(items);
      setDatUser1(items);
      setLoader(false);
    } catch (error) {
      console.error("Error getting documents: ", error);
      setLoader(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const annuler = async (dos) => {
    try {
      const userRef = doc(db, "BiblioUser", dos.email);
      await updateDoc(userRef, {
        tabMessages: [""],
        signalMessage: 'ras'
      });
      navigation.navigate('Email');
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  return (
    <React.Fragment>
      <Tab.Navigator
        initialRouteName={homeName}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let rn = route.name;

            if (rn === homeName) {
              iconName = focused ? 'home' : 'home-outline';
            } else if (rn === detailsName) {
              iconName = focused ? 'cog' : 'cog-outline';
            } else if (rn === settingsName) {
              iconName = focused ? 'book' : 'book-outline';
            } else if (rn === search) {
              iconName = focused ? 'search' : 'search-outline';
            } else if (rn === messagesName) {
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF8A50',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        {!signalMain ? (
          <Tab.Screen
            name={homeName}
            component={NavShop}
            options={{
              tabBarLabel: t('tab_home'),
              headerTitle: (props) => (
                <SafeAreaView>
                  <View style={styles.headerContainer}>
                    <View style={styles.logoContainer}>
                      <Image
                        style={styles.logo}
                        source={logoUrl ? { uri: logoUrl } : require('../../assets/enspy.jpg')}
                      />
                      <Text style={styles.title}>{t('app_title')}</Text>
                    </View>
                    <TouchableOpacity onPress={handlePress}>
                      <FontAwesome name="google" size={24} color="blue" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Panier')} style={styles.cartButton}>
                      <Ionicons name="cart-outline" size={24} color="black" />
                      {cartCount > 0 && (
                        <View style={styles.cartBadge}>
                          <Text style={styles.cartBadgeText}>{cartCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notificationButton}>
                      <Ionicons name="notifications-outline" size={24} color="black" />
                      {unreadNotificationCount > 0 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText}>{unreadNotificationCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              ),
              headerTitleAlign: 'center',
              headerTitleStyle: { flex: 1, textAlign: 'center' },
            }}
          />
        ) : (
          <Tab.Screen
            name={homeName}
            component={NavShop}
            options={{
              tabBarLabel: t('tab_home'),
              headerTitle: (props) => (
                <SafeAreaView>
                  <View style={styles.headerContainer}>
                    <View style={styles.logoContainer}>
                      <Image
                        style={styles.logo}
                        source={logoUrl ? { uri: logoUrl } : require('../../assets/enspy.jpg')}
                      />
                      <Text style={styles.title}>{t('app_title_alt')}</Text>
                    </View>
                    <TouchableOpacity onPress={handlePress}>
                      <FontAwesome name="google" size={24} color="blue" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => navigation.navigate('Panier')}
                      style={styles.cartIconContainer}
                    >
                      <Ionicons name="cart-outline" size={24} color="black" />
                      {cartCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{cartCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Notifications')}
                      style={styles.notificationIconContainer}
                    >
                      <Ionicons name="notifications-outline" size={24} color="black" />
                      {unreadNotificationCount > 0 && (
                        <View style={styles.notificationBadgeSmall}>
                          <Text style={styles.notificationBadgeTextSmall}>{unreadNotificationCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              ),
              headerTitleAlign: 'center',
              headerTitleStyle: { flex: 1, textAlign: 'center' },
            }}
          />
        )}

        <Tab.Screen
          name={settingsName}
          component={NavElearning}
          options={{ tabBarLabel: t('tab_elearning') }}
        />
        <Tab.Screen
          name={messagesName}
          component={Email}
          options={{ tabBarLabel: t('tab_chat') }}
        />
        <Tab.Screen
          name={detailsName}
          component={NavParams}
          options={{ tabBarLabel: t('tab_settings') }}
        />
      </Tab.Navigator>

      {/* Chatbot FAB */}
      <TouchableOpacity
        style={styles.chatbotFab}
        onPress={() => navigation.navigate('ChatBot')}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={28} color="#FFF" />
      </TouchableOpacity>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: WIDTH,
    padding: 5,
  },
  messageIcon: {
    width: 35,
    height: 35,
    borderRadius: 50,
    marginRight: 35,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    height: 40,
    width: 40,
    borderRadius: 50,
    marginBottom: 5,
  },
  title: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 20,
    fontFamily: 'San Francisco',
    marginLeft: 5,
    marginRight: 15,
  },
  searchIcon: {
    width: 35,
    height: 35,
    borderRadius: 50,
    opacity: 0.5,
  },
  cartIcon: {
    width: 35,
    height: 35,
    borderRadius: 50,
    marginRight: 15,
    opacity: 0.5,
  },
  // Styles pour le badge du panier dans le header
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Styles pour les badges sur les onglets
  tabIconContainer: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Garder tes anciens styles pour compatibilité
  cartIconContainer: {
    position: 'relative',
    padding: 5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Notification styles
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationIconContainer: {
    position: 'relative',
    padding: 5,
  },
  notificationBadgeSmall: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeTextSmall: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  // Chatbot FAB Styles
  chatbotFab: {
    position: 'absolute',
    bottom: 200, // Positioned higher to avoid blocking
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF8A50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999,
  }
});

export default MainContainer;
