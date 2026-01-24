import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Modal, Alert, Switch } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons, MaterialIcons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../../config'
import { UserContext } from '../context/UserContext'
import { useNavigation } from "@react-navigation/native"
import { useNotificationCount } from '../hooks/useNotificationCount';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../hooks/useTranslation';
import { configService } from '../services/configService';
import { LinearGradient } from 'expo-linear-gradient';


const WIDTH = Dimensions.get('screen').width
const HEIGHT = Dimensions.get('screen').height

export default function Parametre() {
  const navigation = useNavigation()
  const { currentUserNewNav } = useContext(UserContext)
  const { t } = useTranslation();
  const [datUserParams, setDatUserParams] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState('Français')
  const [empruntsCount, setEmpruntsCount] = useState(0);
  const [modalAboutVisible, setModalAboutVisible] = useState(false);
  const [orgConfig, setOrgConfig] = useState(null);

  // Helper to parse OpeningHours which might be a JSON string
  const getParsedHours = () => {
    const hours = orgConfig?.OpeningHours;
    if (!hours) return null;
    if (typeof hours === 'string') {
      try {
        return JSON.parse(hours);
      } catch (e) {
        return { [t('opening_hours')]: hours };
      }
    }
    return hours;
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('--- FETCHING LIVE CONFIG ---');
        const org = await configService.getOrgSettings();
        setOrgConfig(org);
        console.log('LIVE CONFIG LOADED:', org);
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    };
    loadConfig();
  }, []);
  const unreadNotifications = useNotificationCount(currentUserNewNav?.email);



  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('permission_photos_needed') || "Permission refusée");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0] && result.assets[0].uri) {
        if (currentUserNewNav?.email) {
          try {
            await updateDoc(doc(db, "BiblioUser", currentUserNewNav.email), {
              imageUri: result.assets[0].uri
            });
            Alert.alert(t('success'), t('profile_updated') || "Succès");
          } catch (error) {
            console.error("Erreur lors de la mise à jour de l'image:", error);
            Alert.alert(t('error'), t('profile_update_failed') || "Erreur");
          }
        } else {
          Alert.alert(t('error'), t('login_required') || "Connexion requise");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la sélection de l'image:", error);
      Alert.alert(t('error'), t('image_selection_failed') || "Erreur image");
    }
  };

  useEffect(() => {
    if (!currentUserNewNav?.email) {
      console.log("Pas d'email utilisateur disponible");
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onSnapshot(
        doc(db, 'BiblioUser', currentUserNewNav.email),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            setDatUserParams(userData);

            // Calculer le nombre d'emprunts actifs
            let empruntsCount = 0;
            for (let i = 1; i <= 3; i++) {
              if (userData[`etat${i}`] === 'emprunt') {
                empruntsCount++;
              }
            }

            console.log('Nombre d\'emprunts calculé:', empruntsCount);
            setEmpruntsCount(empruntsCount); // Mettre à jour le state

          } else {
            console.log("Aucune donnée utilisateur trouvée");
            setEmpruntsCount(0);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Erreur lors de la récupération des données:", error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Erreur lors de la configuration:", error);
      setLoading(false);
    }
  }, [currentUserNewNav?.email]);

  useEffect(() => {
    loadDarkModePreference();
  }, []);

  useEffect(() => {
    loadLanguagePreference();
  }, []);





  const loadLanguagePreference = async () => {
    try {
      const languageValue = await AsyncStorage.getItem('language');
      if (languageValue !== null) {
        setLanguage(languageValue);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la langue:', error);
    }
  };


  const loadDarkModePreference = async () => {
    try {
      const darkModeValue = await AsyncStorage.getItem('darkMode');
      if (darkModeValue !== null) {
        setIsDarkMode(JSON.parse(darkModeValue));
      }
    } catch (error) {
      console.error('Erreur lors du chargement du mode sombre:', error);
    }
  };

  const toggleDarkMode = async (value) => {
    try {
      setIsDarkMode(value);
      await AsyncStorage.setItem('darkMode', JSON.stringify(value));
      // Pour une implémentation complète, il faudrait un Context global
      Alert.alert(t('val_information'), t('dark_mode_info'));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du mode sombre:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('logout_confirm') || "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm') || "Confirmer",
          style: 'destructive',
          onPress: async () => {
            try {
              // Déconnexion Firebase
              await signOut(auth);
              console.log('Utilisateur déconnecté avec succès');

              // La navigation sera gérée automatiquement par le contexte NavApp
              // qui écoute les changements d'état d'authentification
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert(t('error'), 'Impossible de se déconnecter. Veuillez réessayer.');
            }
          }
        }
      ]
    );
  };

  // Redirection vers la modification des informations personnelles
  const goToEditProfile = () => {
    navigation.navigate('EditProfile', {
      imageM: datUserParams?.imageUri || '',
      nameM: datUserParams?.name || '',
      emailM: datUserParams?.email || '',
      telM: datUserParams?.tel || '',
      departM: datUserParams?.departement || '',
      niveauM: datUserParams?.niveau || ''
    });
  };

  // Redirection vers l'historique des consultations
  const goToHistory = () => {
    navigation.navigate('Historique', { datUser: datUserParams });
  };

  // Redirection vers les emprunts
  const goToBorrowings = () => {
    navigation.navigate('Emprunt', { datUser: datUserParams });
  };

  // Redirection vers l'aide
  const goToHelp = () => {
    navigation.navigate('Aide');
  };

  // Redirection vers les notifications
  const goToNotifications = () => {
    navigation.navigate('Notifications');
  };

  // Redirection vers les paramètres de langue
  const goToLanguageSettings = () => {
    navigation.navigate('LanguageSettings', {
      currentLanguage: language,
      onLanguageChange: (newLanguage) => {
        setLanguage(newLanguage);
        AsyncStorage.setItem('language', newLanguage);
      }
    });
  };

  // Redirection vers l'invitation d'étudiants
  const goToInviteStudent = () => {
    navigation.navigate('InviteStudent');
  };

  // Redirection vers les paramètres de stockage


  // Redirection vers les paramètres de sécurité
  const goToSecurity = () => {
    navigation.navigate('SecuritySettings');
  };

  // Pour changer le mot de passe
  const goToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8A50" />
      </View>
    );
  }

  const renderSettingItem = ({ icon, iconColor, title, subtitle, action, badge, toggle, value }) => (
    <TouchableOpacity
      style={[styles.settingItemRefined, isDarkMode && styles.darkSettingItem]}
      onPress={action}
      disabled={toggle}
    >
      <View style={[styles.settingIconWrapper, { backgroundColor: iconColor + '15' }]}>
        {icon}
      </View>
      <View style={styles.settingMainContent}>
        <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{title}</Text>
        {subtitle && <Text style={styles.settingHelpText}>{subtitle}</Text>}
      </View>
      {badge && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {toggle && (
        <Switch
          value={value}
          onValueChange={action}
          trackColor={{ false: "#D1D1D6", true: "#FF8A5030" }}
          thumbColor={value ? "#FF8A50" : "#F4F4F4"}
          ios_backgroundColor="#D1D1D6"
        />
      )}
      {!toggle && !badge && (
        <MaterialIcons name="arrow-forward-ios" size={16} color="#A1A1A1" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FF8A50" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.darkText]}>{t('settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Profile Card Refined */}
        <LinearGradient
          colors={isDarkMode ? ['#3A3A3C', '#2C2C2E'] : ['#FFF', '#F8F9FA']}
          style={[styles.profileCardRefined, isDarkMode && styles.darkProfileCard]}
        >
          <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
            {datUserParams?.imageUri ? (
              <Image style={styles.profileImageRefined} source={{ uri: datUserParams.imageUri }} />
            ) : (
              <Image style={styles.profileImageRefined} source={require('../../assets/userIc2.png')} />
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileTextContainer}>
            <Text style={[styles.profileNameRefined, isDarkMode && styles.darkText]}>
              {datUserParams?.name || t('no_name')}
            </Text>
            <Text style={styles.profileEmailRefined}>{datUserParams?.email || t('no_email')}</Text>
            <View style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>
                {datUserParams?.departement ? `${datUserParams.departement} • ${t('level')} ${datUserParams?.niveau || 'N/A'}` : t('no_dept')}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={goToEditProfile} style={styles.editIconBtn}>
            <MaterialIcons name="edit" size={20} color="#FF8A50" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t('account')}</Text>

          {renderSettingItem({
            icon: <MaterialIcons name="person-outline" size={20} color="#FF8A50" />,
            iconColor: "#FF8A50",
            title: t('personal_info'),
            action: goToEditProfile
          })}

          {renderSettingItem({
            icon: <MaterialIcons name="lock-outline" size={20} color="#5E60CE" />,
            iconColor: "#5E60CE",
            title: t('change_password'),
            action: goToChangePassword
          })}

          {renderSettingItem({
            icon: <MaterialCommunityIcons name="bookshelf" size={20} color="#4361EE" />,
            iconColor: "#4361EE",
            title: t('my_borrowings'),
            badge: empruntsCount > 0 ? empruntsCount.toString() : null, // Utiliser le state calculé
            action: goToBorrowings
          })}

          {renderSettingItem({
            icon: <MaterialIcons name="history" size={20} color="#3F8EFC" />,
            iconColor: "#3F8EFC",
            title: t('history_consultations'),
            subtitle: datUserParams?.historique?.length > 0 ? `${datUserParams.historique.length} ${t('books_consulted')}` : t('no_books_consulted'),
            action: goToHistory
          })}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t('preferences')}</Text>

          {renderSettingItem({
            icon: <Ionicons name="notifications-outline" size={20} color="#FF5D8F" />,
            iconColor: "#FF5D8F",
            title: t('notifications'),
            badge: unreadNotifications > 0 ? unreadNotifications.toString() : null,
            action: goToNotifications
          })}

          {renderSettingItem({
            icon: <Ionicons name="globe-outline" size={20} color="#02c39a" />,
            iconColor: "#02c39a",
            title: t('language'),
            subtitle: language,
            action: goToLanguageSettings
          })}

          {renderSettingItem({
            icon: <Ionicons name="moon-outline" size={20} color="#6930c3" />,
            iconColor: "#6930c3",
            title: t('dark_mode'),
            toggle: true,
            value: isDarkMode,
            action: () => setIsDarkMode(!isDarkMode)
          })}


        </View>

        {/* Sharing Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t('share')}</Text>

          {renderSettingItem({
            icon: <Feather name="user-plus" size={20} color="#fb8500" />,
            iconColor: "#fb8500",
            title: t('invite_student_setting'),
            action: goToInviteStudent
          })}
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t('help_security')}</Text>

          {renderSettingItem({
            icon: <MaterialIcons name="help-outline" size={20} color="#3a86ff" />,
            iconColor: "#3a86ff",
            title: t('help_support'),
            action: goToHelp
          })}

          {renderSettingItem({
            icon: <MaterialIcons name="security" size={20} color="#38b000" />,
            iconColor: "#38b000",
            title: t('privacy_security'),
            action: goToSecurity
          })}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t('app_info')}</Text>

          {renderSettingItem({
            icon: <MaterialIcons name="info-outline" size={20} color="#FFD166" />,
            iconColor: "#FFD166",
            title: t('about_app'),
            subtitle: t('version') + ' 1.0.0',
            action: () => setModalAboutVisible(true)
          })}
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{t('version')} 1.0.0</Text>
        </View>
      </ScrollView>

      {/* About App Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAboutVisible}
        onRequestClose={() => setModalAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentRefined, isDarkMode && styles.darkModalContent]}>
            <View style={styles.modalHeaderRefined}>
              <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>{t('app_info')}</Text>
              <TouchableOpacity style={styles.closeIconButton} onPress={() => setModalAboutVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? "#FFF" : "#333"} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyRefined} showsVerticalScrollIndicator={false}>
              <LinearGradient
                colors={isDarkMode ? ['#3A3A3C', '#2C2C2E'] : ['#FFFFFF', '#F2F2F7']}
                style={styles.heroSection}
              >
                <View style={styles.appIconWrapper}>
                  <Image
                    source={require('../../assets/ensp.png')}
                    style={styles.aboutAppIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.appIconShadow} />
                </View>
                <Text style={[styles.aboutAppName, isDarkMode && styles.darkText]}>{t('app_title')}</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionBadgeText}>{t('version')} 1.0.0</Text>
                </View>
              </LinearGradient>

              <View style={styles.aboutContentContainer}>
                {/* Location Card */}
                <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
                  <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(255, 138, 80, 0.1)' }]}>
                    <MaterialIcons name="location-on" size={22} color="#FF8A50" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{t('location')}</Text>
                    <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                      {orgConfig?.Address || t('location_val')}
                    </Text>
                  </View>
                </View>

                {/* Contact Card */}
                <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
                  <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(67, 97, 238, 0.1)' }]}>
                    <MaterialIcons name="contact-phone" size={22} color="#4361EE" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{t('contact_details')}</Text>
                    <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>
                      {orgConfig?.Contact?.Phone || t('phone_val')}
                    </Text>
                    <Text style={[styles.infoValue, isDarkMode && styles.darkText, styles.mt2]}>
                      {orgConfig?.Contact?.Email || t('email_val')}
                    </Text>
                  </View>
                </View>

                {/* Rules & Fees Card */}
                <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
                  <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(239, 71, 111, 0.1)' }]}>
                    <MaterialCommunityIcons name="gavel" size={22} color="#EF476F" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{t('borrowing_rules')}</Text>
                    <View style={styles.rulePill}>
                      <Text style={styles.rulePillText}>
                        {orgConfig?.MaximumSimultaneousLoans || 3} {t('tab_books').toLowerCase()} max
                      </Text>
                    </View>
                    <Text style={[styles.infoValue, isDarkMode && styles.darkText, styles.mt4]}>
                      {t('late_fees')}: {orgConfig?.LateReturnPenalties?.[0] || '100 FCFA/jour'}
                    </Text>
                  </View>
                </View>

                {/* Opening Hours Card */}
                <View style={[styles.infoCard, isDarkMode && styles.darkInfoCard]}>
                  <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(17, 138, 178, 0.1)' }]}>
                    <MaterialIcons name="access-time" size={22} color="#118AB2" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{t('opening_hours')}</Text>
                    <View style={styles.hoursGrid}>
                      {getParsedHours() ? (
                        Object.entries(getParsedHours()).map(([day, hours]) => (
                          <View key={day} style={styles.hourRowRefined}>
                            <Text style={[styles.hourDayLabel, isDarkMode && styles.darkMutedText]}>{day}</Text>
                            <View style={styles.hourLine} />
                            <Text style={[styles.hourValueText, isDarkMode && styles.darkText]}>{hours}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.infoValue, isDarkMode && styles.darkText]}>{t('hours_val')}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalAboutVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('close_btn') || 'Fermer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  darkContainer: {
    backgroundColor: "#1A1A1A",
  },
  darkText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileCardRefined: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
    backgroundColor: '#FFF',
  },
  darkProfileCard: {
    backgroundColor: '#1C1C1E',
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImageRefined: {
    width: 75,
    height: 75,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF8A50',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  profileNameRefined: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    marginBottom: 2,
  },
  profileEmailRefined: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  deptBadge: {
    backgroundColor: 'rgba(255, 138, 80, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF8A50',
  },
  editIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItemRefined: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  darkSettingItem: {
    backgroundColor: '#1C1C1E',
  },
  settingIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingMainContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingHelpText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  badgeContainer: {
    backgroundColor: '#EF476F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    padding: 16,
    borderRadius: 18,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.1)',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: '#BDBDBD',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentRefined: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: HEIGHT * 0.85,
  },
  darkModalContent: {
    backgroundColor: '#2C2C2E',
  },
  modalHeaderRefined: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  closeIconButton: {
    padding: 5,
  },
  modalBodyRefined: {
    marginBottom: 10,
  },
  heroSection: {
    paddingVertical: 35,
    alignItems: 'center',
    borderRadius: 24,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  appIconWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  aboutAppIcon: {
    width: 95,
    height: 95,
    zIndex: 2,
  },
  appIconShadow: {
    position: 'absolute',
    bottom: -10,
    width: 70,
    height: 15,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 50,
    alignSelf: 'center',
  },
  aboutAppName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF8A50',
    letterSpacing: 1.5,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 138, 80, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
  },
  versionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8A50',
  },
  aboutContentContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
    alignItems: 'flex-start',
  },
  darkInfoCard: {
    backgroundColor: '#1C1C1E',
    shadowOpacity: 0.3,
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 24,
  },
  rulePill: {
    backgroundColor: '#EF476F',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    marginTop: 6,
    shadowColor: '#EF476F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  rulePillText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  hoursGrid: {
    marginTop: 10,
  },
  hourRowRefined: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hourDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    width: 85,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginHorizontal: 12,
  },
  hourValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#FF8A50',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF8A50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  darkMutedText: { color: '#8E8E93' },
});
