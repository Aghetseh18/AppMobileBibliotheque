import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  signInWithCredential
} from "firebase/auth";
import React, { useContext, useState } from 'react';
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { auth, db } from '../../config';
import { UserContext } from '../context/UserContext';
import { Formik } from 'formik';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Yup from 'yup';
import { updateDoc, doc, Timestamp, setDoc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons as MaterialIcon, FontAwesome5 as FontAwesomeIcon } from '@expo/vector-icons';



const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

// Couleurs modernes
const PRIMARY_COLOR = '#F16522';
const SECONDARY_COLOR = '#FF8A50';
const BG_COLOR = 'rgba(255, 255, 255, 0.92)';
const TEXT_COLOR = '#333333';
const LIGHT_GRAY = '#F9FAFB';

const LoginForm = ({ navigation }) => {
  const { emailHigh, setEmailHigh } = useContext(UserContext);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = (email) => {
    if (!email) {
      Alert.alert('Information requise', 'Veuillez entrer votre email pour réinitialiser votre mot de passe');
      return;
    }

    setIsLoading(true);
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setIsLoading(false);
        Alert.alert(
          'Email Envoyé',
          'Un email de réinitialisation de mot de passe a été envoyé à votre adresse.',
          [{ text: 'OK' }]
        );
      })
      .catch((error) => {
        setIsLoading(false);
        if (__DEV__) {
          console.error('Erreur d\'envoi d\'email de réinitialisation:', error);
        }
        if (error.code === 'auth/user-not-found') {
          Alert.alert('Compte introuvable', 'Aucun compte n\'existe avec cet email');
        } else {
          Alert.alert('Échec', 'Échec de l\'envoi de l\'email. Veuillez réessayer');
        }
      });
  };

  // Méthode simplifiée pour la connexion sociale
  const handleSocialLogin = async (provider) => {
    Alert.alert(
      "Connexion externe",
      "Pour vous connecter avec ce service, l'application doit ouvrir votre navigateur. Continuer?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Continuer",
          onPress: () => {
            Alert.alert(
              "Information",
              "Cette fonctionnalité nécessite une configuration supplémentaire côté serveur. Veuillez utiliser la connexion par email pour le moment."
            );
            // Ici, vous implémenteriez la redirection vers le flux OAuth
            // Cette partie nécessiterait react-native-app-auth ou une solution similaire
          }
        }
      ]
    );
  };

  const LoginFormSchema = Yup.object().shape({
    email: Yup.string()
      .email('Veuillez entrer un email valide')
      .required('Email requis'),
    password: Yup.string()
      .required('Mot de passe requis')
      .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  });

  const onLogin = async (values) => {
    try {
      setIsLoading(true);
      const { email, password } = values;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Vérifier si l'email est vérifié
        if (!user.emailVerified) {
          setIsLoading(false);
          Alert.alert(
            'Validation requise',
            'Veuillez vérifier votre email avant de vous connecter',
            [
              {
                text: 'Renvoyer l\'email',
                onPress: async () => {
                  await sendEmailVerification(user);
                  Alert.alert('Email envoyé', 'Veuillez vérifier votre boîte de réception');
                },
              },
              {
                text: 'Fermer',
                style: 'cancel',
              },
            ]
          );
          return;
        }

        // Vérifier si l'utilisateur existe dans Firestore
        const userDocRef = doc(db, 'BiblioUser', email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          // Mettre à jour les informations de connexion
          await updateDoc(userDocRef, {
            lastLoginAt: Timestamp.now()
          });
        } else {
          // Créer un document utilisateur s'il n'existe pas
          await setDoc(userDocRef, {
            email: email,
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now()
          });
        }

        setEmailHigh(email);
        setIsLoading(false);
        navigation.navigate('MainContainer');
      } catch (error) {
        setIsLoading(false);
        if (__DEV__) {
          console.error('Erreur technique:', error);
        }

        switch (error.code) {
          case 'auth/wrong-password':
            Alert.alert(
              'Mot de passe incorrect',
              'Vous avez saisi un mot de passe incorrect',
              [
                {
                  text: 'Réinitialiser',
                  onPress: () => handleForgotPassword(values.email),
                },
                {
                  text: 'Réessayer',
                  style: 'cancel',
                },
              ]
            );
            break;
          case 'auth/user-not-found':
            Alert.alert(
              'Compte introuvable',
              'Aucun utilisateur avec cet email n\'existe dans notre système',
              [
                {
                  text: 'Créer un compte',
                  onPress: () => navigation.navigate('SignUpScreen'),
                },
                {
                  text: 'Réessayer',
                  style: 'cancel',
                },
              ]
            );
            break;
          case 'auth/too-many-requests':
            Alert.alert(
              'Trop de tentatives',
              'Votre compte a été temporairement désactivé en raison de nombreuses tentatives de connexion. Veuillez réessayer plus tard ou réinitialiser votre mot de passe.'
            );
            break;
          case 'auth/network-request-failed':
            Alert.alert(
              'Problème de connexion',
              'Veuillez vérifier votre connexion internet et réessayer.'
            );
            break;
          default:
            Alert.alert(
              'Échec de connexion',
              'Veuillez vérifier vos identifiants et réessayer.'
            );
        }
      }
    } catch (error) {
      setIsLoading(false);
      if (__DEV__) {
        console.error('Erreur technique:', error);
      }
      Alert.alert(
        'Erreur',
        'Une erreur s\'est produite lors de la connexion. Veuillez réessayer.'
      );
    }
  };

  return (
    <LinearGradient
      colors={['rgba(241, 101, 34, 0.15)', 'rgba(255, 255, 255, 0.9)']}
      style={styles.container}
    >
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollView}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Bienvenue</Text>
            <Text style={styles.subtitle}>Connectez-vous pour accéder à la bibliothèque</Text>

            <Formik
              initialValues={{ email: '', password: '' }}
              onSubmit={values => onLogin(values)}
              validationSchema={LoginFormSchema}
              validateOnMount={true}
            >
              {({ handleChange, handleBlur, handleSubmit, values, isValid, errors, touched }) => (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <MaterialIcon name="email" size={20} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholderTextColor="#777"
                      placeholder="Email"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      value={values.email}
                    />
                  </View>
                  {touched.email && errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}

                  <View style={styles.inputContainer}>
                    <MaterialIcon name="lock" size={20} color="#777" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholderTextColor="#777"
                      placeholder="Mot de passe"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      value={values.password}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.showPasswordButton}
                    >
                      <MaterialIcon name={showPassword ? "visibility-off" : "visibility"} size={20} color="#777" />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.forgotPasswordButton]}
                    onPress={() => handleForgotPassword(values.email)}
                  >
                    <Text style={styles.forgotPasswordText}>Mot de passe oublié?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      !isValid && styles.buttonDisabled,
                      isValid && styles.buttonEnabled
                    ]}
                    onPress={handleSubmit}
                    disabled={!isValid || isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Se connecter</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Nouveau sur la plateforme? </Text>
                    <TouchableOpacity onPress={() => navigation.push('SignUpScreen')}>
                      <Text style={styles.signupLink}>Créer un compte</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Formik>
          </View>
        </SafeAreaView>
      </KeyboardAwareScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: BG_COLOR,
    borderRadius: 20,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: LIGHT_GRAY,
    height: 56,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    color: TEXT_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -8,
    paddingLeft: 4,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    height: 56,
    justifyContent: 'center',
  },
  buttonEnabled: {
    backgroundColor: PRIMARY_COLOR,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  showPasswordButton: {
    paddingRight: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#777',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 16,
  },
  socialIconButton: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIconGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  signupText: {
    color: '#777',
  },
  signupLink: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});

export default LoginForm;
