import React, { useContext, useEffect, useState } from 'react';
import { Alert, Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import Dialog from "react-native-dialog";
import { doc, onSnapshot, collection, getDoc, writeBatch, increment, query, where, getDocs } from "firebase/firestore";
import { UserContext } from '../../context/UserContext';
import { db } from '../../../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { addNotification, NOTIFICATION_TYPES } from '../../utils/addNotification';
import { useTranslation } from '../../hooks/useTranslation';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const DEFAULT_IMAGE = require('../../../assets/biblio/math.jpg');

const CathegorieBiblio = ({ cathegorie, donnee }) => {

    const activeReservations = [];

    // Parcourir toutes les propriétés de l'objet donnee
    Object.keys(donnee).forEach(key => {
        if (key.startsWith('etat') && donnee[key] === 'reserv') {
            const index = key.slice(4);
            const detailsKey = `tabEtat${index}`;

            // Vérifier si les détails correspondants existent
            if (donnee[detailsKey] && Array.isArray(donnee[detailsKey])) {
                activeReservations.push({
                    etat: donnee[key],
                    details: donnee[detailsKey],
                    index: index
                });
            }
        }
    });

    return (
        <View style={styles.categoryContainer}>
            <LinearGradient
                colors={['#ff6600', '#fff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.categoryHeader}
            >
                <Text style={styles.categoryTitle}>{cathegorie}</Text>
            </LinearGradient>
            <View style={styles.reservationsContainer}>
                {activeReservations.map((reservation, idx) => (
                    <Cadre
                        key={idx}
                        name={reservation.details[0]}
                        cathegorie={reservation.details[1]}
                        image={reservation.details[2]}
                        exemplaire={reservation.details[3]}
                        nomBD={reservation.details[4]}
                        dateHeure={reservation.details[5]}
                        etatIndex={reservation.index}
                    />
                ))}
            </View>
        </View>
    );
}

const Panier = (props) => {
    const { t } = useTranslation();
    const { currentUserNewNav: currentUserdata } = useContext(UserContext);
    const [dat, setDat] = useState({});
    const [panierLoader, setPanierLoader] = useState(true);

    useEffect(() => {
        if (!db || !currentUserdata?.email) {
            console.log('Pas de connexion à la base de données ou pas d\'email');
            return;
        }

        const userRef = doc(db, "BiblioUser", currentUserdata.email);
        const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                setDat(userData);
            } else {
                setDat({});
            }
            setPanierLoader(false);
        }, (error) => {
            console.error("Erreur lors de la récupération des données:", error);
            setPanierLoader(false);
        });

        return () => unsubscribe();
    }, [currentUserdata?.email]);

    const hasActiveReservations = (data) => {
        // Vérifier dynamiquement si l'utilisateur a des réservations actives
        if (!data) return false;
        return Object.keys(data).some(key => key.startsWith('etat') && data[key] === 'reserv');
    };

    return (
        <ScrollView style={styles.container}>
            {panierLoader ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#00ff00" />
                </View>
            ) : (
                <View>
                    {hasActiveReservations(dat) ? (
                        <CathegorieBiblio donnee={dat} cathegorie={t('my_reservations_title')} />
                    ) : (
                        <View style={styles.emptyCart}>
                            <MaterialIcons name="shopping-basket" size={80} color="#00ff00" />
                            <Text style={styles.emptyCartText}>{t('no_reservations')}</Text>
                            <Text style={styles.emptyCartSubtext}>{t('empty_reservations_placeholder')}</Text>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const Cadre = ({ cathegorie, desc, exemplaire, image, name, matricule, cathegorie2, nomBD, dateHeure, etatIndex }) => {
    const { t, currentLanguage } = useTranslation();
    const { currentUserNewNav: currentUserdata } = useContext(UserContext);
    const [showDialog, setShowDialog] = useState(false);
    const [imageError, setImageError] = useState(false);

    const formatDate = dateHeure ? new Date(dateHeure.seconds * 1000) : new Date();
    const locale = currentLanguage === 'Français' ? 'fr-FR' : 'en-US';
    const date = formatDate.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const heure = formatDate.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Utiliser la constante définie au niveau du module pour l'image par défaut
    const imageSource = !image || imageError ? DEFAULT_IMAGE : { uri: image };

    const annulerReservation = async (etatIndex) => {
        if (!currentUserdata?.email) {
            Alert.alert('Erreur', 'Vous devez être connecté pour annuler une réservation');
            return;
        }

        try {
            const userRef = doc(db, "BiblioUser", currentUserdata.email);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                Alert.alert('Erreur', 'Utilisateur non trouvé');
                return;
            }

            const userData = userDoc.data() || {};

            // Vérifier si l'état correspondant est bien en "reserv"
            if (userData[`etat${etatIndex}`] !== 'reserv') {
                Alert.alert('Erreur', 'Aucune réservation trouvée pour cet emplacement');
                return;
            }

            // Récupérer les informations du livre réservé
            const livreReserve = userData[`tabEtat${etatIndex}`];

            if (!livreReserve || livreReserve.length < 5) {
                Alert.alert('Erreur', 'Données de réservation incomplètes');
                return;
            }

            const nomLivre = livreReserve[0];
            const collectionName = livreReserve[4];

            console.log('Nom du livre:', nomLivre);
            console.log('Collection:', collectionName);

            // Vérifier que la collection existe
            if (!collectionName) {
                Alert.alert('Erreur', 'Information de collection manquante');
                return;
            }

            // Mettre à jour les données utilisateur
            const batch = writeBatch(db);

            // Réinitialiser l'état et le tableau de réservation de l'utilisateur
            batch.update(userRef, {
                [`etat${etatIndex}`]: 'ras',
                [`tabEtat${etatIndex}`]: []
            });

            // Chercher le livre par son nom dans la collection appropriée
            const livresRef = collection(db, collectionName);
            const q = query(livresRef, where("name", "==", nomLivre));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Livre trouvé par requête
                const livreDoc = querySnapshot.docs[0];

                // Incrémenter le nombre d'exemplaires disponibles
                batch.update(livreDoc.ref, {
                    exemplaire: increment(1)
                });
            } else {
                console.log(`Aucun livre trouvé avec le nom "${nomLivre}" dans la collection "${collectionName}"`);
                // Continuer quand même pour au moins libérer la réservation
            }

            await batch.commit();

            await addNotification(
                currentUserdata.email,
                NOTIFICATION_TYPES.ANNULATION,
                t('reservation_cancelled_title'),
                t('reservation_cancelled_msg', { book: nomLivre })
            );

            Alert.alert(t('success'), t('reservation_cancelled_success'));

        } catch (error) {
            console.error('Erreur lors de l\'annulation de la réservation:', error);
            Alert.alert(t('error'), `${t('generic_error')} ${error.message}`);
        }
    };

    return (
        <View style={styles.cardContainer}>
            <View style={styles.card}>
                <View style={styles.imageContainer}>
                    <Image
                        source={imageSource}
                        style={styles.cardImage}
                        onError={() => setImageError(true)}
                    />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{name}</Text>
                    <Text style={styles.cardCategory}>{cathegorie}</Text>
                    <View style={styles.dateTimeContainer}>
                        <Text style={styles.cardDate}>{date}</Text>
                        <Text style={styles.cardTime}>{heure}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => setShowDialog(true)}
                    >
                        <Text style={styles.deleteButtonText}>{t('cancel_reservation_btn')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Dialog.Container visible={showDialog}>
                <Dialog.Title>{t('confirm_cancellation_title')}</Dialog.Title>
                <Dialog.Description>
                    {t('confirm_cancellation_msg')}
                </Dialog.Description>
                <Dialog.Button label={t('no')} onPress={() => setShowDialog(false)} />
                <Dialog.Button
                    label={t('yes_cancel')}
                    onPress={() => {
                        setShowDialog(false);
                        annulerReservation(etatIndex);
                    }}
                />
            </Dialog.Container>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: HEIGHT * 0.5,
    },
    categoryContainer: {
        marginBottom: 20,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 12,
        marginTop: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    categoryHeader: {
        padding: 16,
    },
    categoryTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        fontFamily: 'Roboto',
        letterSpacing: 0.5,
    },
    reservationsContainer: {
        padding: 12,
    },
    cardContainer: {
        marginBottom: 16,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    imageContainer: {
        borderRadius: 8,
    },
    cardImage: {
        width: 100,
        height: 150,
        borderRadius: 8,
    },
    cardContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'space-between'
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#333333',
        fontFamily: 'Roboto',
    },
    cardCategory: {
        fontSize: 15,
        color: '#555555',
        marginBottom: 8,
        fontFamily: 'Roboto',
    },
    dateTimeContainer: {
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 6,
        marginBottom: 10,
    },
    cardDate: {
        fontSize: 14,
        color: '#444444',
        marginBottom: 2,
        fontFamily: 'Roboto',
    },
    cardTime: {
        fontSize: 14,
        color: '#444444',
        fontFamily: 'Roboto',
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 'auto',
        elevation: 2,
    },
    deleteButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: 'Roboto',
    },
    emptyCart: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        height: HEIGHT * 0.7,
    },
    emptyCartText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 10,
        fontFamily: 'Roboto',
    },
    emptyCartSubtext: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        fontFamily: 'Roboto',
    },
});

export default Panier;