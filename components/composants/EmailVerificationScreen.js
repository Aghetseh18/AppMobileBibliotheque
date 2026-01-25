import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { auth } from '../../config';
import { UserContext } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification, signOut } from 'firebase/auth';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const EmailVerificationScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const { setEmailHigh } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const user = auth.currentUser;
  const checkIntervalRef = useRef(null);

  // Timer for resend button
  useEffect(() => {
    if (timeLeft > 0 && !canResend) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, canResend]);

  // Handle navigation when shouldNavigate becomes true
  useEffect(() => {
    if (shouldNavigate && !isNavigating) {
      setIsNavigating(true);
      
      // Small delay to ensure clean state
      setTimeout(() => {
        if (navigation && navigation.replace) {
          console.log('Navigating to InitialScreen...');
          navigation.replace('MainApp');
        }
      }, 100);
    }
  }, [shouldNavigate, isNavigating, navigation]);

  // Auto-check email verification status every 5 seconds
  useEffect(() => {
    // Start auto-checking
    checkIntervalRef.current = setInterval(() => {
      checkEmailVerification(false); // false = don't show loading
    }, 5000);

    // Initial check
    checkEmailVerification(false);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  const checkEmailVerification = async (showAlerts = true) => {
    try {
      if (showAlerts) {
        setIsLoading(true);
      }

      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        if (showAlerts) {
          Alert.alert(
            'Session expirée',
            'Votre session est fermée. Veuillez vous reconnecter.',
            [
              { 
                text: 'Aller au login', 
                onPress: () => {
                  setTimeout(() => {
                    navigation.replace('LoginScreen', { email });
                  }, 100);
                }
              },
              { text: 'Annuler', style: 'cancel' }
            ],
            { cancelable: true }
          );
        }
        return;
      }

      // Refresh user data from Firebase
      await currentUser.reload();

      if (currentUser.emailVerified) {
        // Clear the interval since verification is done
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        
        setVerificationStatus('verified');
        setEmailHigh(email);
        
        if (showAlerts) {
          Alert.alert(
            'Succès!',
            'Votre email a été vérifié avec succès!',
            [
              {
                text: 'Continuer',
                onPress: () => {
                  setShouldNavigate(true);
                },
              },
            ],
            { cancelable: false }
          );
        } else {
          // Auto-navigate without alert if auto-check detected verification
          setShouldNavigate(true);
        }
      } else {
        setVerificationStatus('pending');
        if (showAlerts) {
          Alert.alert(
            'Email non vérifié',
            'Veuillez cliquer sur le lien de vérification dans votre email puis réessayer ici.'
          );
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      if (showAlerts) {
        Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      if (showAlerts) {
        setIsLoading(false);
      }
    }
  };

  const handleResendEmail = async () => {
    if (!canResend || resendLoading) return;

    try {
      setResendLoading(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non trouvé. Veuillez vous reconnecter.');
        return;
      }

      await sendEmailVerification(currentUser);
      
      // Reset timer
      setTimeLeft(60);
      setCanResend(false);
      
      Alert.alert(
        'Email renvoyé!',
        'Un nouvel email de vérification a été envoyé. Veuillez vérifier votre boîte de réception.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors du renvoi de l\'email:', error);
      
      let errorMessage = 'Impossible de renvoyer l\'email. Veuillez réessayer.';
      
      switch (error.code) {
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
          setTimeLeft(300); // 5 minutes cooldown
          setCanResend(false);
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erreur de connexion. Vérifiez votre internet.';
          break;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTimeout(() => {
        navigation.replace('LoginScreen', { email });
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter. Veuillez réessayer.');
    }
  };

  const handleBackToSignup = () => {
    navigation.goBack();
  };

  const handleContinueToApp = () => {
    setShouldNavigate(true);
  };

  return (
    <KeyboardAwareScrollView style={{ backgroundColor: '#F7F7F9' }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/ensp.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Vérification Email</Text>
        </View>

        <View style={styles.wrapper}>
          <View style={styles.iconContainer}>
            {verificationStatus === 'verified' ? (
              <Ionicons name="checkmark-circle-outline" size={80} color="#34C759" />
            ) : (
              <Ionicons name="mail-outline" size={80} color="#FF6600" />
            )}
          </View>

          <View style={styles.contentSection}>
            <Text style={styles.title}>
              {verificationStatus === 'verified' 
                ? 'Email Vérifié!' 
                : 'Vérifiez votre Email'}
            </Text>
            
            <Text style={styles.subtitle}>
              {verificationStatus === 'verified'
                ? 'Votre email a été vérifié avec succès.'
                : 'Un email de vérification a été envoyé à:'}
            </Text>
            
            <Text style={styles.email}>{email}</Text>

            {verificationStatus !== 'verified' && (
              <>
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionText}>
                    • Ouvrez votre boîte email{'\n'}
                    • Cliquez sur le lien de vérification{'\n'}
                    • Revenez à cette application
                  </Text>
                  
                  <Text style={styles.autoCheckText}>
                    (Vérification automatique toutes les 5 secondes)
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={() => checkEmailVerification(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Vérifier maintenant</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {verificationStatus === 'verified' && (
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={handleContinueToApp}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Continuer vers l'application</Text>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Vous n'avez pas reçu l'email? </Text>
              <TouchableOpacity
                onPress={handleResendEmail}
                disabled={!canResend || resendLoading}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (!canResend || resendLoading) && styles.resendLinkDisabled,
                  ]}
                >
                  {resendLoading
                    ? 'Envoi...'
                    : canResend
                    ? "Renvoyer l'email"
                    : `Renvoyer dans ${timeLeft}s`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={[styles.footerButton, styles.backButton]}
                onPress={handleBackToSignup}
              >
                <Ionicons name="chevron-back" size={20} color="#FF6600" />
                <Text style={styles.backButtonText}>Retour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutButtonText}>Se déconnecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F9',
    minHeight: HEIGHT,
  },
  header: {
    backgroundColor: '#FF6600',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  wrapper: {
    marginHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
    marginTop: 20,
  },
  contentSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6600',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  instructionsBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6600',
    padding: 15,
    marginBottom: 20,
    borderRadius: 6,
  },
  instructionText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#FF6600',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#FFAA7F',
  },
  buttonText: {
    fontWeight: '600',
    color: '#fff',
    fontSize: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  resendText: {
    color: '#555',
    fontSize: 14,
  },
  resendLink: {
    color: '#FF6600',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resendLinkDisabled: {
    color: '#CCCCCC',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#FF6600',
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  successButton: {
    backgroundColor: '#34C759',
  },
  autoCheckText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutButtonText: {
    color: '#FF3B30',
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default EmailVerificationScreen;