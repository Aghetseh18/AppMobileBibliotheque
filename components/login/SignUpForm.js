import { Picker } from '@react-native-picker/picker';
import { Timestamp, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useState, useEffect } from 'react';
import { Alert, Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage, db } from '../../config';
import { UserContext } from '../context/UserContext';
import { Formik } from 'formik';
import * as Yup from 'yup';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

// Niveaux d'étude
const levels = [
    { label: "Sélectionner un niveau", value: "" },
    { label: "Niveau 1", value: "level1" },
    { label: "Niveau 2", value: "level2" },
    { label: "Niveau 3", value: "level3" },
    { label: "Niveau 4", value: "level4" },
    { label: "Niveau 5", value: "level5" }
];

const SignUpForm = ({ navigation }) => {
    const { emailHigh, setEmailHigh } = useContext(UserContext);
    const [selectedLevel, setSelectedLevel] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [image, setImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [loadingDepartments, setLoadingDepartments] = useState(true);

    // Récupération des départements depuis Firestore
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                setLoadingDepartments(true);
                const departmentsCollection = collection(db, 'Departements');
                const departmentsSnapshot = await getDocs(departmentsCollection);
                console.log("Départements récupérés:", departmentsSnapshot.size);

                // Construction du tableau de départements pour le Picker
                let departmentsList = [{ label: "Sélectionner un département", value: "" }];
                departmentsSnapshot.forEach(doc => {
                    const departmentData = doc.data();
                    departmentsList.push({
                        label: departmentData.nom, // Utilisez "nom" au lieu de "name"
                        value: doc.id
                    });
                });

                setDepartments(departmentsList);
            } catch (error) {
                console.error("Erreur lors de la récupération des départements:", error);
                // Fallback vers une liste par défaut en cas d'erreur
                setDepartments([
                    { label: "Sélectionner un département", value: "" },
                    { label: "Génie Civil", value: "genie_civil" },
                    { label: "Génie Informatique", value: "genie_informatique" },
                    { label: "Génie Électrique", value: "genie_electrique" },
                    { label: "Génie Mécanique", value: "genie_mecanique" }
                ]);
            } finally {
                setLoadingDepartments(false);
            }
        };

        fetchDepartments();
    }, []);

    const SignupFormSchema = Yup.object().shape({
        email: Yup.string()
            .email('Veuillez saisir un email valide')
            .required('Email obligatoire')
            .matches(
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                'Format email invalide'
            ),
        username: Yup.string()
            .required('Nom d\'utilisateur obligatoire')
            .min(2, 'Le nom d\'utilisateur doit contenir au moins 2 caractères'),
        matricule: Yup.string()
            .required('Matricule obligatoire')
            .min(5, 'Le matricule doit contenir au moins 5 caractères'),
        tel: Yup.string()
            .required('Numéro de téléphone obligatoire'),
        password: Yup.string()
            .required('Mot de passe obligatoire')
            .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
            .matches(
                /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W_]{6,}$/,
                'Le mot de passe doit contenir au moins une lettre et un chiffre'
            ),
        confirmPassword: Yup.string()
            .required('Confirmation du mot de passe obligatoire')
            .oneOf([Yup.ref('password'), null], 'Les mots de passe ne correspondent pas')
    });

    const getPermissionAndPickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Désolé, nous avons besoin de permissions pour accéder à votre galerie !');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaType: ImagePicker.MediaType.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Erreur lors de la sélection de l\'image:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
        }
    };

    const uploadImage = async () => {
        try {
            if (!image) return null;

            const response = await fetch(image);
            const blob = await response.blob();
            const filename = `profilePictures/${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error('Erreur lors du téléchargement de l\'image:', error);
            return null;
        }
    };

    const onSignup = async (values) => {
        if (!selectedLevel) {
            Alert.alert('Erreur', 'Veuillez sélectionner votre niveau');
            return;
        }

        if (!selectedDepartment) {
            Alert.alert('Erreur', 'Veuillez sélectionner votre département');
            return;
        }

        setIsLoading(true);

        try {
            const { email, password, username, matricule, tel } = values;

            // Créer l'utilisateur avec Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Upload de l'image de profil si elle existe
            const profilePictureUrl = await uploadImage();

            // Créer le document utilisateur dans Firestore avec les données requises
            await setDoc(doc(db, 'BiblioUser', email), {
                name: username,
                matricule: matricule,
                email: email,
                niveau: selectedLevel,
                departement: selectedDepartment,
                tel: tel,
                createdAt: Timestamp.now(),
                lastLoginAt: Timestamp.now(),
                level: 'level1',
                tabEtat1: [],
                tabEtat2: [],
                tabEtat3: [],
                etat1: 'ras',
                etat2: 'ras',
                etat3: 'ras',
                emailVerified: false,
                profilePicture: profilePictureUrl
            });

            setEmailHigh(email);

            // Envoyer un email de vérification en arrière-plan
            sendEmailVerification(user).catch(error => {
                console.error('Erreur lors de l\'envoi de l\'email de vérification:', error);
            });

            // Afficher le message de succès
            Alert.alert(
                'Bienvenue!',
                'Votre compte a été créé avec succès. Un email de vérification vous a été envoyé.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.replace('MainContainer');
                        },
                    },
                ],
                { cancelable: false }
            );

        } catch (error) {
            // Log l'erreur en développement uniquement
            if (__DEV__) {
                console.error('Erreur technique:', error);
            }

            // Messages d'erreur utilisateur
            switch (error.code) {
                case 'auth/email-already-in-use':
                    Alert.alert(
                        'Email déjà utilisé',
                        'Un compte existe déjà avec cet email.',
                        [
                            {
                                text: 'Se connecter',
                                onPress: () => navigation.navigate('LoginScreen', { email: values.email }),
                            },
                            {
                                text: 'Réessayer',
                                style: 'cancel',
                            },
                        ]
                    );
                    break;
                case 'auth/invalid-email':
                    Alert.alert(
                        'Email invalide',
                        'Veuillez entrer une adresse email valide.'
                    );
                    break;
                case 'auth/operation-not-allowed':
                    Alert.alert(
                        'Inscription indisponible',
                        'L\'inscription est temporairement désactivée. Veuillez réessayer ultérieurement.'
                    );
                    break;
                case 'auth/weak-password':
                    Alert.alert(
                        'Mot de passe faible',
                        'Le mot de passe doit contenir au moins 6 caractères.'
                    );
                    break;
                case 'auth/network-request-failed':
                    Alert.alert(
                        'Erreur de connexion',
                        'Veuillez vérifier votre connexion internet et réessayer.'
                    );
                    break;
                default:
                    Alert.alert(
                        'Échec de l\'inscription',
                        'Une erreur est survenue. Veuillez réessayer.'
                    );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/ensp.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerTitle}>Inscription - Bibliothèque ENSPY</Text>
                </View>

                <View style={styles.wrapper}>
                    <TouchableOpacity
                        style={styles.photoContainer}
                        onPress={getPermissionAndPickImage}
                    >
                        {image ? (
                            <Image source={{ uri: image }} style={styles.photo} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Image
                                    source={require('../../assets/userIc2.png')}
                                    style={styles.placeholderIcon}
                                />
                                <View style={styles.addPhotoButton}>
                                    <Text style={styles.addPhotoText}>+</Text>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Formik
                        initialValues={{ email: '', username: '', matricule: '', tel: '', password: '', confirmPassword: '' }}
                        onSubmit={values => onSignup(values)}
                        validationSchema={SignupFormSchema}
                        validateOnMount={true}
                    >
                        {({ handleChange, handleBlur, handleSubmit, values, isValid, errors, touched }) => (
                            <>
                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Informations Personnelles</Text>

                                    <View style={styles.inputField}>
                                        <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholderTextColor="#777"
                                            placeholder="Entrez votre nom d'utilisateur"
                                            autoCapitalize="none"
                                            textContentType="username"
                                            onChangeText={handleChange('username')}
                                            onBlur={handleBlur('username')}
                                            value={values.username}
                                        />
                                        {errors.username && touched.username && (
                                            <Text style={styles.errorText}>{errors.username}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputField}>
                                        <Text style={styles.inputLabel}>Email</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholderTextColor="#777"
                                            placeholder="Entrez votre email"
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            textContentType="emailAddress"
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                            value={values.email}
                                        />
                                        {errors.email && touched.email && (
                                            <Text style={styles.errorText}>{errors.email}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputField}>
                                        <Text style={styles.inputLabel}>Matricule</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholderTextColor="#777"
                                            placeholder="Entrez votre matricule"
                                            autoCapitalize="none"
                                            onChangeText={handleChange('matricule')}
                                            onBlur={handleBlur('matricule')}
                                            value={values.matricule}
                                        />
                                        {errors.matricule && touched.matricule && (
                                            <Text style={styles.errorText}>{errors.matricule}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputField}>
                                        <Text style={styles.inputLabel}>Téléphone</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholderTextColor="#777"
                                            placeholder="Entrez votre numéro de téléphone"
                                            keyboardType="phone-pad"
                                            onChangeText={handleChange('tel')}
                                            onBlur={handleBlur('tel')}
                                            value={values.tel}
                                        />
                                        {errors.tel && touched.tel && (
                                            <Text style={styles.errorText}>{errors.tel}</Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Informations Académiques</Text>

                                    <View style={styles.pickerField}>
                                        <Text style={styles.inputLabel}>Département</Text>
                                        {loadingDepartments ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="small" color="#FF6600" />
                                                <Text style={styles.loadingText}>Chargement des départements...</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.customPickerContainer}>
                                                <Picker
                                                    selectedValue={selectedDepartment}
                                                    onValueChange={(itemValue) => setSelectedDepartment(itemValue)}
                                                    style={styles.picker}
                                                    dropdownIconColor="transparent" // Cacher l'icône native pour utiliser notre propre icône
                                                    mode="dropdown"
                                                >
                                                    {departments.map((dept, index) => (
                                                        <Picker.Item
                                                            key={index}
                                                            label={dept.label || "Élément sans nom"}
                                                            value={dept.value}
                                                            color={dept.value === "" ? "#777" : "#000"}
                                                        />
                                                    ))}
                                                </Picker>
                                                <View style={styles.arrowContainer}>
                                                    <Ionicons name="chevron-down" size={16} color="#555" />
                                                </View>
                                            </View>
                                        )}
                                        {!selectedDepartment && touched.username && !loadingDepartments && (
                                            <Text style={styles.errorText}>Veuillez sélectionner un département</Text>
                                        )}
                                    </View>

                                    {/* Sélection du niveau */}
                                    <View style={styles.pickerField}>
                                        <Text style={styles.inputLabel}>Niveau</Text>
                                        <View style={styles.customPickerContainer}>
                                            <Picker
                                                selectedValue={selectedLevel}
                                                onValueChange={(itemValue) => setSelectedLevel(itemValue)}
                                                style={styles.picker}
                                                dropdownIconColor="transparent" // Cacher l'icône native pour utiliser notre propre icône
                                                mode="dropdown"
                                            >
                                                {levels.map((level, index) => (
                                                    <Picker.Item
                                                        key={index}
                                                        label={level.label}
                                                        value={level.value}
                                                        color={level.value === "" ? "#777" : "#000"}
                                                    />
                                                ))}
                                            </Picker>
                                            <View style={styles.arrowContainer}>
                                                <Ionicons name="chevron-down" size={16} color="#555" />
                                            </View>
                                        </View>
                                        {!selectedLevel && touched.username && (
                                            <Text style={styles.errorText}>Veuillez sélectionner un niveau</Text>
                                        )}
                                    </View>

                                </View>

                                <View style={styles.formSection}>
                                    <Text style={styles.sectionTitle}>Sécurité</Text>

                                    <View style={styles.inputField}>
                                        <Text style={styles.inputLabel}>Mot de passe</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholderTextColor="#777"
                                            placeholder="Entrez votre mot de passe"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            secureTextEntry={true}
                                            textContentType="password"
                                            onChangeText={handleChange('password')}
                                            onBlur={handleBlur('password')}
                                            value={values.password}
                                        />
                                        {errors.password && touched.password && (
                                            <Text style={styles.errorText}>{errors.password}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputField}>
                                        <Text style={styles.inputLabel}>Confirmation du mot de passe</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholderTextColor="#777"
                                            placeholder="Confirmez votre mot de passe"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            secureTextEntry={true}
                                            textContentType="password"
                                            onChangeText={handleChange('confirmPassword')}
                                            onBlur={handleBlur('confirmPassword')}
                                            value={values.confirmPassword}
                                        />
                                        {errors.confirmPassword && touched.confirmPassword && (
                                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                                        )}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        (!isValid || !selectedLevel || !selectedDepartment || isLoading || loadingDepartments) && styles.buttonDisabled
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={!isValid || !selectedLevel || !selectedDepartment || isLoading || loadingDepartments}
                                >
                                    <Text style={styles.buttonText}>{isLoading ? 'Chargement...' : 'S\'inscrire'}</Text>
                                </TouchableOpacity>

                                <View style={styles.loginContainer}>
                                    <Text style={styles.loginText}>Vous avez déjà un compte? </Text>
                                    <TouchableOpacity onPress={() => navigation.goBack()}>
                                        <Text style={styles.loginLink}>Se connecter</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Formik>
                </View>
            </View>
        </KeyboardAwareScrollView>
    );
};

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
        marginBottom: 20,
        paddingTop: 40, // Ajustement pour status bar
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
    },
    formSection: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 8,
    },
    photoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#FF6600'
    },
    photoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FF6600',
        position: 'relative'
    },
    placeholderIcon: {
        width: 50,
        height: 50,
        opacity: 0.5
    },
    addPhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF6600',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    },
    addPhotoText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    inputField: {
        marginBottom: 15,
    },
    pickerField: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: 5,
        color: '#555',
        fontWeight: '500',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: '#FAFAFA',
    },
    pickerItem: {
        fontSize: 14,
        height: 45,
        color: '#333',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
        overflow: 'hidden',
        minHeight: 45,
    },
    picker: {
        height: 50,
        color: '#333',
        width: '100%',
        paddingHorizontal: 12,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        height: 45,
    },
    loadingText: {
        marginLeft: 10,
        color: '#555',
        fontSize: 14,
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
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    loginText: {
        color: '#555',
    },
    loginLink: {
        color: '#FF6600',
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: 5,
    },
    customPickerContainer: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
        overflow: 'hidden',
        minHeight: 50,
        position: 'relative',
        justifyContent: 'center',
    },
    arrowContainer: {
        position: 'absolute',
        right: 12,
        top: '50%',
        marginTop: -8,
        zIndex: -1, // S'assurer que l'icône est derrière le Picker pour permettre la sélection
    },
});

export default SignUpForm;