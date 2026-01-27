import React, { useContext, useEffect, useState, useMemo } from 'react';
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
import { RecommendationService } from '../services/RecommendationService';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from '../hooks/useTranslation';
import { useConfig } from '../context/ConfigContext';

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
  const { orgSettings } = useConfig();
  const config = { orgSettings }; // Keep variable for logging if needed
  console.log("DEBUG orgSettings:", JSON.stringify(orgSettings, null, 2));

  // Dynamic Colors
  const colors = useMemo(() => ({
    ...COLORS,
    primary: orgSettings?.Theme?.Primary || COLORS.primary,
    primaryLight: orgSettings?.Theme?.Primary ? orgSettings.Theme.Primary + 'CC' : COLORS.primaryLight,
    secondary: orgSettings?.Theme?.Secondary || COLORS.secondary,
    background: COLORS.background, // User didn't override background in JSON
  }), [orgSettings]);
  const { t } = useTranslation();
  const [dataWeb, setDataWeb] = useState([]);
  const [loaderWeb, setLoaderWeb] = useState(true);
  const [activeTab, setActiveTab] = useState('departement');
  const [popularBooks, setPopularBooks] = useState([]);
  const [userRecommendations, setUserRecommendations] = useState([]);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [memoireData, setMemoireData] = useState([]);
  const [memoireLoader, setMemoireLoader] = useState(true);
  const [departementsData, setDepartementsData] = useState([]);

  // Helper: Get Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('good_morning');
    if (hour < 16) return t('good_afternoon');
    return t('good_evening');
  };

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

  const fetchDepartements = () => {
    try {
      const q = query(collection(db, 'Departements'));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDepartementsData(items);
      });
    } catch (error) {
      console.error(error);
      return () => { };
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
    const qLivres = query(collection(db, 'OnlineCourses'), orderBy('name', 'asc'));
    const unsubscribeLivres = onSnapshot(qLivres, (s) => {
      const items = [];
      s.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          ...data,
          name: data.name || data.title || 'Untitled',
          image: data.image,
          chemin: data.chemin || data.url || data.link || '',
        });
      });
      console.log('OnlineCourses items:', items.length);
      setDataWeb(items);
      setLoaderWeb(false);
    });

    // Fetch departments
    const unsubscribeDepartements = fetchDepartements();
    const unsubscribeMemoires = fetchMemoires();

    return () => {
      unsubscribeLivres();
      if (unsubscribeMemoires) unsubscribeMemoires();
      if (unsubscribeDepartements) unsubscribeDepartements();
    };
  }, [currentUserNewNav?.email]);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        // 1. Popular Docs
        const popular = await RecommendationService.getPopularDocuments();
        // Map API response to UI format if needed
        const mappedPopular = (popular || []).map(item => ({
          ...item,
          id: item.id || Math.random().toString(),
          title: item.title || item.name || 'Untitled',
          category: item.category || item.cathegorie || 'Général',
          image: item.image || null,
          description: item.description || item.desc || '',
          exemplaire: item.exemplaire || 0,
          pdfUrl: item.pdfUrl || item.url || null,
          collection: item.collection || (item.pdfUrl ? 'BiblioThesis' : 'BiblioBooks'), // Heuristic
        }));
        setPopularBooks(mappedPopular);

        // 2. Personalized (if user logged in)
        if (currentUserNewNav?.email) {
          const personal = await RecommendationService.getPersonalizedRecommendations(currentUserNewNav.email);
          const mappedPersonal = (personal.recommendations || []).map(item => ({
            ...item,
            id: item.id || Math.random().toString(),
            title: item.title || item.name || 'Untitled',
            category: item.category || item.cathegorie || 'Général',
            image: item.image || null,
            description: item.description || item.desc || '',
            exemplaire: item.exemplaire || 0,
            pdfUrl: item.pdfUrl || item.url || null,
            collection: item.collection || (item.pdfUrl ? 'BiblioThesis' : 'BiblioBooks'),
          }));
          setUserRecommendations(mappedPersonal);
        }
      } catch (error) {
        console.error("Error loading recommendations:", error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    if (datUser?.email || currentUserNewNav?.email) {
      loadRecommendations();
    }
  }, [currentUserNewNav?.email, datUser?.email]);

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
          <Image
            source={orgSettings?.Logo ? { uri: orgSettings.Logo } : require('../../assets/ensp.png')}
            style={[styles.loginLogo, { tintColor: colors.primary }]}
            resizeMode="contain"
          />
          <Text style={styles.loginTitle}>{orgSettings?.Name || t('welcome')}</Text>
          <Text style={styles.loginSubtitle}>{t('login_subtitle')}</Text>
          <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={() => props.navigation.navigate('LoginScreen')}>
            <Text style={styles.loginButtonText}>{t('login_btn')}</Text>
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
          <View style={[styles.badgeContainer, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{Math.round(item.similarity_score || 0)}% {t('match')}</Text>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header / Hero Section Refined */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={styles.headerContainer}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerGreeting}>{getGreeting()}</Text>
            <Text style={styles.headerUsername}>
              {datUser?.name || datUser?.nom || 'Utilisateur'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButtonContainer}
            onPress={() => props.navigation.navigate('Profile')}
          >
            <Image
              source={datUser?.imageUri ? { uri: datUser.imageUri } : require('../../assets/userIc2.png')}
              style={styles.profileAvatarHeader}
            />
            <View style={styles.onlineBadge} />
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
            title={t('e_learning')}
            icon={<FontAwesome name="graduation-cap" size={20} color={colors.primary} style={styles.sectionIcon} />}
            subtitle={t('e_learning_sub')}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {dataWeb.map((e, index) => <WebResourceCard key={index} item={e} />)}
          </ScrollView>
        </View>

        {/* Recommendations */}
        {(userRecommendations.length > 0) && (
          <View style={styles.section}>
            <SectionHeader
              title={t('for_you')}
              icon={<MaterialIcons name="recommend" size={22} color={colors.primary} style={styles.sectionIcon} />}
              subtitle={t('for_you_sub')}
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
                    nomBD: book.id, commentaire: book.commentaire || []
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
              title={t('trends')}
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
                    nomBD: book.id, commentaire: book.commentaire || []
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
              <Text style={[styles.tabText, activeTab === 'departement' && styles.activeTabText]}>{t('tab_books')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'memoire' && styles.activeTab]}
              onPress={() => setActiveTab('memoire')}
            >
              <Text style={[styles.tabText, activeTab === 'memoire' && styles.activeTabText]}>{t('tab_theses')}</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'departement' ? (
            <View style={[styles.gridContainer, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }]}>
              {departementsData.map((dept, index) => (
                <View key={dept.id || index} style={{ margin: 10 }}>
                  <Cercle
                    id={dept.id}
                    datUser={datUser}
                    // If image is URL, pass uri object. If it's a local require (unlikely from DB), handle appropriately. 
                    // Assuming DB stores URLs.
                    image={dept.image ? { uri: dept.image } : imgInfo}
                    cathegorie={dept.name || dept.nom || dept.id || 'N/A'}
                    props={props}
                  />
                </View>
              ))}
              {departementsData.length === 0 && (
                <Text style={{ padding: 20, color: COLORS.text.secondary }}>{t('no_data') || 'Aucun département trouvé'}</Text>
              )}
            </View>
          ) : (
            <View style={[styles.gridContainer, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }]}>
              {memoireLoader ? (
                <View style={{ padding: 40 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                (() => {
                  const uniqueCats = [...new Set(memoireData.map(m => m.département || m.cathegorie).filter(Boolean))].sort();
                  if (uniqueCats.length === 0) return <Text style={{ padding: 20, color: COLORS.text.secondary }}>{t('no_data') || 'Aucun mémoire trouvé'}</Text>;

                  return uniqueCats.map((cat, index) => {
                    const dept = departementsData.find(d =>
                      (d.name && d.name.toLowerCase() === cat.toLowerCase()) ||
                      (d.nom && d.nom.toLowerCase() === cat.toLowerCase())
                    );
                    const image = dept?.image ? { uri: dept.image } : imgMemGI;

                    return (
                      <View key={index} style={{ margin: 10 }}>
                        <Cercle
                          id={index}
                          datUser={datUser}
                          image={image}
                          cathegorie={cat}
                          onPress={() => handleMemoireClick(cat)}
                        />
                      </View>
                    );
                  });
                })()
              )}
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
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25
  },
  headerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  headerUsername: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text.white,
    letterSpacing: 0.2,
  },
  profileButtonContainer: {
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 25,
    padding: 2,
  },
  profileAvatarHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  searchPlaceholderText: {
    marginLeft: 12,
    color: COLORS.text.light,
    fontSize: 15,
    fontWeight: '500',
  },
  filterBtn: {
    backgroundColor: 'rgba(255, 102, 0, 0.1)',
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainScrollView: {
    flex: 1,
    marginTop: 0,
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    paddingHorizontal: 22,
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  sectionIcon: {
    marginRight: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginLeft: 34, // Correct alignment
    opacity: 0.8,
  },
  horizontalList: {
    paddingLeft: 18,
    paddingRight: 30,
    paddingBottom: 15,
  },

  // Cards Refined
  card: {
    width: 160,
    marginRight: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImageContainer: {
    height: 200,
    width: '100%',
    position: 'relative'
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    opacity: 0.7,
  },

  // Web Resources
  webCard: {
    marginHorizontal: 8,
    alignItems: 'center',
    width: 80
  },
  webIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  webIcon: {
    width: 34,
    height: 34
  },
  webTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: -0.2,
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
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },
  gridContainer: {
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
});

export default VueUn;