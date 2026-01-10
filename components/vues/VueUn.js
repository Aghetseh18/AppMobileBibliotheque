import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import assets with consistent naming
import imgElec from '../../assets/biblio/elec.jpg';
import imgInfo from '../../assets/biblio/info.jpg';
import imgMath from '../../assets/biblio/math.jpg';
import imgMeca from '../../assets/biblio/meca.jpg';
import imgPhysik from '../../assets/biblio/physik.jpg';
import imgTelcom from '../../assets/biblio/telcom.jpg';
import imgMemGI from '../../assets/memoire1.jpg';
import imgMemGC from '../../assets/memoire2.jpg';
import imgMemGInd from '../../assets/memoire3.jpg';
import imgMemGEle from '../../assets/memoire4.jpg';
import imgMemGM from '../../assets/memoire5.jpg';
import imgMemGTel from '../../assets/memoire6.jpg';

// Firebase imports
import { db } from '../../config';
import { collection, onSnapshot, orderBy, query, getDocs, doc, getDoc } from 'firebase/firestore';

// Component imports
import BigRect from '../composants/BigRect';
import Cercle from '../composants/Cercle';
import SmallRect from '../composants/SmallRect';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../../apiConfig';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

// Constants
const { width: WIDTH, height: HEIGHT } = Dimensions.get('screen');

// Modern Color Palette
const COLORS = {
  primary: '#FF6600',       // Main brand color
  primaryLight: '#FF8533',  // Lighter variation for gradients
  secondary: '#2D3436',     // Dark text
  accent: '#FF4757',        // Accent for alerts/badges
  background: '#F8F9FA',    // Clean off-white background
  surface: '#FFFFFF',       // Card background
  text: {
    primary: '#2D3436',
    secondary: '#636E72',
    light: '#B2BEC3',
    white: '#FFFFFF',
    muted: '#9E9E9E'
  },
  success: '#00B894',
  info: '#0984E3',
  warning: '#FDG76C',
  error: '#D63031',
  divider: 'rgba(0,0,0,0.05)',
  shadow: '#000000'
};

const VueUn = (props) => {
  // Context and state
  const { currentUserNewNav, datUser, datUserTest } = useContext(UserContext) || {};
  const [dataWeb, setDataWeb] = useState([]);
  const [loaderWeb, setLoaderWeb] = useState(true);
  const [activeTab, setActiveTab] = useState('departement');
  const [popularBooks, setPopularBooks] = useState([]);
  const [userRecommendations, setUserRecommendations] = useState([]);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [memoireData, setMemoireData] = useState([]);
  const [memoireLoader, setMemoireLoader] = useState(true);

  // Helper: Get Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // ... (Keep existing fetch logic) ...
  // Network helper function
  const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const fetchUserRecommendations = async (email) => {
    if (!email) return;
    try {
      setLoadingRecommendations(true);
      const response = await fetch(`${API_URL}/recommendations/similar-users/${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.recommendations) {
        setUserRecommendations(data.recommendations);
        setSimilarUsers(data.similar_users || []);
      } else {
        setUserRecommendations([]);
        setSimilarUsers([]);
      }
    } catch (error) {
      console.error('Erreur recommendations:', error);
      setUserRecommendations([]);
      setSimilarUsers([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const fetchPopularBooks = async () => {
    try {
      const collections = ['BiblioBooks'];
      let allBooks = [];
      for (const collectionName of collections) {
        const booksRef = collection(db, collectionName);
        const querySnapshot = await getDocs(booksRef);
        querySnapshot.forEach((doc) => {
          const bookData = doc.data();
          if (bookData && bookData.name && bookData.commentaire) {
            const ratings = bookData.commentaire.map(c => Number(c.note)).filter(note => !isNaN(note));
            const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
            allBooks.push({
              id: doc.id,
              title: bookData.name,
              category: bookData.cathegorie,
              image: bookData.image,
              description: bookData.desc,
              exemplaire: bookData.exemplaire,
              averageRating,
              numberOfRatings: ratings.length
            });
          }
        });
      }
      const popular = allBooks.sort((a, b) => b.averageRating - a.averageRating).slice(0, 10);
      setPopularBooks(popular);
    } catch (error) {
      console.error('Erreur livres populaires:', error);
      setPopularBooks([]);
    }
  };

  const fetchSimilarUsersRecommendations = async (email) => {
    // Kept same logic as original file, just compacted for brevity in this view
    if (!email) return;
    try {
      setLoadingRecommendations(true);
      const usersRef = collection(db, "BiblioUser");
      const usersSnapshot = await getDocs(usersRef);
      const userRef = doc(db, "BiblioUser", email);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;
      const userData = userDoc.data();
      const userHistory = userData.historique || [];
      const userCategories = new Set(userHistory.map(item => item.cathegorieDoc));
      const userBooks = new Set(userHistory.map(item => item.nameDoc));
      let allSimilarUsers = [];
      let bookRecommendations = new Map();
      usersSnapshot.forEach(doc => {
        if (doc.id !== email) {
          const otherUserData = doc.data();
          const otherUserHistory = otherUserData.historique || [];
          const otherUserCategories = new Set(otherUserHistory.map(item => item.cathegorieDoc));
          const commonCategories = [...userCategories].filter(cat => otherUserCategories.has(cat));
          const categorySimScore = commonCategories.length / Math.max(userCategories.size, otherUserCategories.size);
          const commonBooks = otherUserHistory.filter(item => userBooks.has(item.nameDoc)).length;
          const bookSimScore = commonBooks / Math.max(userHistory.length, otherUserHistory.length);
          const similarityScore = (categorySimScore * 0.6) + (bookSimScore * 0.4);
          if (similarityScore > 0.2) {
            allSimilarUsers.push({ email: doc.id, similarity: similarityScore, history: otherUserHistory });
            otherUserHistory.forEach(item => {
              if (!userBooks.has(item.nameDoc)) {
                const key = item.nameDoc;
                const current = bookRecommendations.get(key) || {
                  count: 0, similaritySum: 0, title: item.nameDoc, category: item.cathegorieDoc,
                  image: item.image, description: item.desc, type: item.type
                };
                current.count++; current.similaritySum += similarityScore;
                bookRecommendations.set(key, current);
              }
            });
          }
        }
      });
      const recommendations = Array.from(bookRecommendations.values())
        .map(book => ({ ...book, similarity_score: (book.similaritySum / book.count) * 100 }))
        .sort((a, b) => b.similarity_score - a.similarity_score).slice(0, 10);
      setSimilarUsers(allSimilarUsers);
      setUserRecommendations(recommendations);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const fetchMemoires = () => {
    try {
      const memoireRef = collection(db, 'BiblioThesis');
      const q = query(memoireRef, orderBy('name', 'asc'));

      return onSnapshot(q, (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            ...data,
            // Mapping explicit des champs demandés par l'utilisateur
            abstract: data.abstract,
            annee: data.annee,
            commentaire: data.commentaire,
            createdAt: data.createdAt,
            département: data.département,
            etagere: data.etagere,
            image: data.image,
            keywords: data.keywords,
            matricule: data.matricule,
            name: data.name,
            pdfUrl: data.pdfUrl,
            superviseur: data.superviseur,
            theme: data.theme,
          });
        });
        console.log(items);
        setMemoireData(items);
        setMemoireLoader(false);
      });
    } catch (error) {
      setMemoireLoader(false);
      return () => { };
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingRecommendations(true);
        await Promise.all([
          fetchPopularBooks(),
          currentUserNewNav?.email ? fetchSimilarUsersRecommendations(currentUserNewNav.email) : Promise.resolve()
        ]);
      } catch (error) { console.error(error); } finally { setLoadingRecommendations(false); }
    };
    loadData();
  }, [currentUserNewNav?.email]);

  useEffect(() => {
    if (!currentUserNewNav?.email) {
      setLoaderWeb(false); setMemoireLoader(false); return;
    }
    const qLivres = query(collection(db, 'BiblioWeb'), orderBy('name', 'asc'));
    const unsubscribeLivres = onSnapshot(qLivres, (s) => {
      const items = []; s.forEach((d) => items.push(d.data())); setDataWeb(items); setLoaderWeb(false);
    });
    const unsubscribeMemoires = fetchMemoires();
    return () => { unsubscribeLivres(); if (unsubscribeMemoires) unsubscribeMemoires(); };
  }, [currentUserNewNav?.email]);

  const handleMemoireClick = (categorieMemoire) => {
    const memoiresFiltres = memoireData.filter(memoire =>
      memoire.département === categorieMemoire || memoire.cathegorie === categorieMemoire
    );
    props.navigation.navigate('Cathegorie', {
      cathegorie: categorieMemoire, datUser: datUser, isMemoire: true, memoireData: memoiresFiltres
    });
  };

  // Redirect to login if no user
  if (!currentUserNewNav?.email) {
    return (
      <View style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loginContent}>
          <Image source={require('../../assets/ensp.png')} style={styles.loginLogo} resizeMode="contain" />
          <Text style={styles.loginTitle}>Bienvenue</Text>
          <Text style={styles.loginSubtitle}>Connectez-vous pour accéder à votre bibliothèque personnelle</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => props.navigation.navigate('LoginScreen')}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // UI Components
  const SectionHeader = ({ title, icon, subtitle }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );

  const BookCard = ({ item, onPress, isRecommendation = false }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        {isRecommendation && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{Math.round(item.similarity_score || 0)}% Match</Text>
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardCategory} numberOfLines={1}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  const WebResourceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.webCard}
      onPress={() => props.navigation.navigate("PageWeb", { chemin: item.chemin, name: item.name })}
    >
      <View style={styles.webIconContainer}>
        <Image source={{ uri: item.image }} style={styles.webIcon} resizeMode="contain" />
      </View>
      <Text style={styles.webTitle} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header / Hero Section */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()},</Text>
            <Text style={styles.headerUsername}>
              {datUser?.name || datUser?.nom || 'Utilisateur'}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => props.navigation.navigate('Profile')}>
            <FontAwesome name="user-circle" size={36} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.mainScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* E-Learning Section */}
        <View style={styles.section}>
          <SectionHeader
            title="E-Learning"
            icon={<FontAwesome name="graduation-cap" size={20} color={COLORS.primary} style={styles.sectionIcon} />}
            subtitle="Formez-vous avec les meilleures plateformes"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {dataWeb.map((e, index) => <WebResourceCard key={index} item={e} />)}
          </ScrollView>
        </View>

        {/* Recommendations */}
        {(userRecommendations.length > 0) && (
          <View style={styles.section}>
            <SectionHeader
              title="Pour vous"
              icon={<MaterialIcons name="recommend" size={22} color={COLORS.primary} style={styles.sectionIcon} />}
              subtitle="Basé sur vos lectures récentes"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {userRecommendations.map((book, index) => (
                <BookCard
                  key={index}
                  item={book}
                  isRecommendation={true}
                  onPress={() => props.navigation.navigate('Produit', {
                    name: book.title, desc: book.description || '', image: book.image,
                    cathegorie: book.category, type: book.type || '', salle: book.salle || '',
                    etagere: book.etagere || '', exemplaire: book.exemplaire || 0,
                    nomBD: 'BiblioInformatique', commentaire: book.commentaire || []
                  })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Popular */}
        {(popularBooks.length > 0) && (
          <View style={styles.section}>
            <SectionHeader
              title="Tendances"
              icon={<Ionicons name="trending-up" size={22} color={COLORS.primary} style={styles.sectionIcon} />}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {popularBooks.map((book, index) => (
                <BookCard
                  key={index}
                  item={book}
                  onPress={() => props.navigation.navigate('Produit', {
                    name: book.title, desc: book.description || '', image: book.image,
                    cathegorie: book.category, type: book.type || '', salle: book.salle || '',
                    etagere: book.etagere || '', exemplaire: book.exemplaire || 0,
                    nomBD: 'BiblioInformatique', commentaire: book.commentaire || []
                  })}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories / Departments Switcher */}
        <View style={styles.section}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'departement' && styles.activeTab]}
              onPress={() => setActiveTab('departement')}
            >
              <Text style={[styles.tabText, activeTab === 'departement' && styles.activeTabText]}>LIVRES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'memoire' && styles.activeTab]}
              onPress={() => setActiveTab('memoire')}
            >
              <Text style={[styles.tabText, activeTab === 'memoire' && styles.activeTabText]}>MÉMOIRES</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'departement' ? (
            <View style={styles.gridContainer}>
              <View style={styles.row}>
                <Cercle id="" datUser={datUser} image={imgMeca} cathegorie="Genie Mecanique" props={props} />
                <Cercle id="" datUser={datUser} image={imgInfo} cathegorie="Genie Informatique" props={props} />
                <Cercle id="" datUser={datUser} image={imgMath} cathegorie="Mathematique" props={props} />
              </View>
              <View style={styles.row}>
                <Cercle id="" datUser={datUser} image={imgElec} cathegorie="Genie Electrique" props={props} />
                <Cercle id="" datUser={datUser} image={imgPhysik} cathegorie="Physique" props={props} />
                <Cercle id="" datUser={datUser} image={imgTelcom} cathegorie="Genie Telecom" props={props} />
              </View>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => handleMemoireClick('Genie Informatique')}>
                  <Cercle id="" datUser={datUser} image={imgMemGI} cathegorie="Memoire GI" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMemoireClick('Genie Civil')}>
                  <Cercle id="" datUser={datUser} image={imgMemGC} cathegorie="Memoire GC" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMemoireClick('Genie Mecanique')}>
                  <Cercle id="" datUser={datUser} image={imgMemGM} cathegorie="Memoire GM" />
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <TouchableOpacity onPress={() => handleMemoireClick('INDUSTRIEL')}>
                  <Cercle id="" datUser={datUser} image={imgMemGInd} cathegorie="Memoire GInd" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMemoireClick('Genie electrique')}>
                  <Cercle id="" datUser={datUser} image={imgMemGEle} cathegorie="Genie electrique" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMemoireClick('Genie Telecom')}>
                  <Cercle id="" datUser={datUser} image={imgMemGTel} cathegorie="Memoire GTel" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 30
  },
  loginContent: {
    alignItems: 'center',
    width: '100%'
  },
  loginLogo: {
    width: 120,
    height: 120,
    marginBottom: 30,
    tintColor: COLORS.primary
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 10
  },
  loginSubtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.white
  },
  // Header
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 60,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500'
  },
  headerUsername: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchText: {
    marginLeft: 10,
    color: COLORS.text.light,
    fontSize: 15
  },

  // Content
  mainScrollView: {
    flex: 1,
    marginTop: -10
  },
  section: {
    marginTop: 25,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 15
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginLeft: 5
  },
  sectionIcon: {
    marginRight: 6
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: 32 // Align with title text
  },
  horizontalList: {
    paddingHorizontal: 15,
    paddingBottom: 10
  },

  // Cards
  card: {
    width: 150,
    marginHorizontal: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4
  },
  cardImageContainer: {
    height: 200,
    width: '100%',
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
    lineHeight: 18
  },
  cardCategory: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },

  // Web Resources
  webCard: {
    marginHorizontal: 8,
    alignItems: 'center',
    width: 80
  },
  webIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.background
  },
  webIcon: {
    width: 30,
    height: 30
  },
  webTitle: {
    fontSize: 11,
    color: COLORS.text.primary,
    textAlign: 'center'
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary
  },
  activeTabText: {
    color: COLORS.text.white
  },

  // Grid
  gridContainer: {
    paddingHorizontal: 15
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center', // Changed to center since we have exactly 3 items mostly
    marginBottom: 15,
    flexWrap: 'wrap',
    gap: 15 // Use gap for spacing between circles
  }
});

export default VueUn;