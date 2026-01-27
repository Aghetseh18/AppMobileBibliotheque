import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View, Alert, Modal, SafeAreaView, TextInput, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Swiper from 'react-native-swiper';
import React, { useContext, useEffect, useState } from 'react';
import { UserContextNavApp } from '../../navigation/NavApp';
import { API_URL } from '../../../apiConfig';
import { collection, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, Timestamp, onSnapshot, getDoc, query, getDocs, increment, writeBatch, setDoc, limit, where } from "firebase/firestore";
import { RecommendationService } from '../../services/RecommendationService';
import { useFirebase } from '../../context/FirebaseContext';
import BigRect from '../BigRect';
import PubCar from '../PubCar';
import PubRect from '../PubRect';
import { addNotification, NOTIFICATION_TYPES } from '../../utils/addNotification';
import { useTranslation } from '../../hooks/useTranslation';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;


// Fonction pour normaliser les chaînes (supprimer les accents)
const normalizeString = (str) => {
  if (!str) return '';
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim();
};

const Produit = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { salle, desc, etagere, exemplaire, image, name, cathegorie, commentaire, nomBD, type: bookType } = route.params || {};
  const normalizedName = name ? normalizeString(name) : '';
  const { currentUserdata } = useContext(UserContextNavApp);
  const { isFirebaseReady, db } = useFirebase();
  const type = bookType || cathegorie;
  const TITRE = name || '';

  const [dt, setDt] = useState(Timestamp.now());
  const [modalDescription, setModalDescription] = useState(false);
  const [modalComm, setModalComm] = useState(false);
  const [values, setValues] = useState("");
  const [valuesNote, setValuesNote] = useState("0");
  const [showAllComments, setShowAllComments] = useState(false);
  const [nomUser, setNomUser] = useState('');
  const [dat, setDat] = useState(0);
  const [comment, setComment] = useState(Array.isArray(commentaire) ? commentaire : []);
  const [datd, setDatd] = useState();
  const [mes, setMes] = useState();
  const [data, setData] = useState([]);
  const [loader, setLoader] = useState(true);
  const [bookDescription, setBookDescription] = useState(desc || '');
  const [similarBooks, setSimilarBooks] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [currentExemplaire, setCurrentExemplaire] = useState(exemplaire);
  const [isReserving, setIsReserving] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});

  const ajouterRecent = async () => {
    if (!currentUserdata?.email) {
      Alert.alert('Erreur', 'Vous devez être connecté pour réserver un livre');
      return;
    }
    if (currentExemplaire <= 0) {
      Alert.alert(t('error'), t('no_location_available')); // Or create a specific key for 'Aucun exemplaire disponible' if not reusing
      return;
    }

    setIsReserving(true);

    try {
      if (!name || !cathegorie) {
        console.error('Données manquantes:', { name, cathegorie, type });
        Alert.alert('Erreur', 'Données du livre incomplètes');
        return;
      }

      const userRef = doc(db, "BiblioUser", currentUserdata.email);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: currentUserdata.email,
          tabMessages: [],
          signalMessage: 'ras',
          docRecent: [],
          searchHistory: [],
          etat1: 'ras',
          etat2: 'ras',
          etat3: 'ras',
          tabEtat1: [],
          tabEtat2: [],
          tabEtat3: []
        });
      }

      const userData = userDoc.data() || {};
      const activeReservations = [userData.etat1, userData.etat2, userData.etat3].filter(etat => etat === 'reserv').length;

      if (activeReservations >= 3) {
        Alert.alert(t('reservation_limit_reached'), t('reservation_limit_msg'));
        return;
      }

      const isAlreadyReserved = [userData.tabEtat1, userData.tabEtat2, userData.tabEtat3].some(tabEtat => {
        if (Array.isArray(tabEtat) && tabEtat.length > 0) {
          return normalizeString(tabEtat[0]) === normalizedName;
        }
        return false;
      });

      if (isAlreadyReserved) {
        Alert.alert(t('already_reserved_title'), t('already_reserved_msg'));
        return;
      }

      let etatIndex = -1;
      for (let i = 1; i <= 3; i++) {
        const etatValue = userData[`etat${i}`];
        if (!etatValue || etatValue === 'ras' || etatValue === '') {
          etatIndex = i;
          break;
        }
      }

      if (etatIndex === -1) {
        Alert.alert('Erreur', 'Aucun emplacement disponible');
        return;
      }

      const collections = ['BiblioBooks'];
      let bookFound = false;

      for (const collectionName of collections) {
        const q = query(collection(db, collectionName));
        const querySnapshot = await getDocs(q);

        for (const bookDoc of querySnapshot.docs) {
          const bookData = bookDoc.data();

          if (normalizeString(bookData.name) === normalizedName) {
            if (bookData.exemplaire > 0) {
              const batch = writeBatch(db);

              batch.update(bookDoc.ref, {
                exemplaire: increment(-1)
              });

              const updateData = {
                [`etat${etatIndex}`]: 'reserv',
                [`tabEtat${etatIndex}`]: [
                  name,
                  cathegorie,
                  image,
                  bookData.exemplaire - 1,
                  collectionName,
                  Timestamp.now(),
                  bookDoc.id
                ],
                docRecent: arrayUnion({
                  cathegorieDoc: cathegorie,
                  type: type
                })
              };

              batch.update(userRef, updateData);
              await batch.commit();

              await addNotification(
                currentUserdata.email,
                NOTIFICATION_TYPES.RESERVATION,
                t('reservation_confirmed_notif_title'),
                t('reservation_confirmed_notif_msg', { book: name })
              );

              Alert.alert(t('reservation_confirmed_title'), t('reservation_confirmed_msg', { index: etatIndex }));
              bookFound = true;
              break;
            } else {
              Alert.alert('Erreur', 'Aucun exemplaire disponible');
              return;
            }
          }
        }
        if (bookFound) break;
      }

      if (!bookFound) {
        Alert.alert('Erreur', 'Livre non trouvé dans la base de données');
      }

    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsReserving(false);
    }
  };

  useEffect(() => {
    setCurrentExemplaire(exemplaire);
  }, [exemplaire]);

  useEffect(() => {
    const loadComments = async () => {
      if (!isFirebaseReady || !db) return;

      try {
        let bookData = null;

        // Try fetching by nomBD first (assuming it's the document ID)
        if (nomBD) {
          const docRef = doc(db, 'BiblioBooks', nomBD);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            bookData = docSnap.data();
          }
        }

        // Fallback: If not found by ID (or if nomBD was a collection name), search by name in BiblioBooks
        if (!bookData && name) {
          console.log(`Searching for book by name in BiblioBooks: ${name}`);
          const q = query(collection(db, 'BiblioBooks'), where('name', '==', name), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            bookData = querySnapshot.docs[0].data();
            console.log('Book found by name in BiblioBooks');
          }
        }

        if (bookData) {
          setCurrentExemplaire(bookData.exemplaire || 0); // Update availability from DB
          if (bookData.commentaire && Array.isArray(bookData.commentaire)) {
            setComment(bookData.commentaire);
          } else {
            setComment([]);
          }
        } else {
          setCurrentExemplaire(0);
          setComment([]);
        }
      } catch (error) {
        console.error("Erreur chargement commentaires:", error);
        setComment([]);
      }
    };

    if (isFirebaseReady && db) {
      loadComments();
      fetchSimilarBooks();
    }
  }, [nomBD, isFirebaseReady, db]);

  useEffect(() => {
    const addToHistory = async () => {
      if (!currentUserdata?.email || !isFirebaseReady || !db || !name) return;

      try {
        const userRef = doc(db, "BiblioUser", currentUserdata.email);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: currentUserdata.email,
            historique: [],
            tabMessages: [],
            signalMessage: 'ras',
            docRecent: [],
            searchHistory: [],
            reservations: []
          });
        }

        const userData = userDoc.data() || {};
        const currentHistory = Array.isArray(userData.historique) ? userData.historique : [];

        const newHistoryItem = {
          cathegorieDoc: cathegorie || 'Non catégorisé',
          type: type || cathegorie || 'Non catégorisé',
          image: image || null,
          nameDoc: name,
          desc: desc || '',
          dateVue: Timestamp.now()
        };

        const exists = currentHistory.some(item =>
          item && item.nameDoc === newHistoryItem.nameDoc &&
          item.cathegorieDoc === newHistoryItem.cathegorieDoc
        );

        if (!exists) {
          const newHistory = [newHistoryItem, ...currentHistory].slice(0, 20);
          await updateDoc(userRef, {
            historique: newHistory
          });
        }
      } catch (error) {
        console.error("Error adding to history:", error);
      }
    };

    addToHistory();
  }, [currentUserdata?.email, cathegorie, type, image, name, desc, isFirebaseReady, db]);

  const handleAddComment = async () => {
    if (!currentUserdata?.email) {
      Alert.alert('Erreur', 'Vous devez être connecté pour laisser un avis');
      return;
    }

    if (!valuesNote || valuesNote === '0') {
      Alert.alert('Erreur', 'Veuillez donner une note');
      return;
    }

    if (!values.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire');
      return;
    }

    try {
      const userRef = doc(db, 'BiblioUser', currentUserdata.email);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert('Erreur', 'Profil utilisateur non trouvé');
        return;
      }

      const userName = userSnap.data().name;

      let actualBookRef = null;

      // Try by nomBD (ID) in BiblioBooks first
      if (nomBD) {
        const bookRef = doc(db, 'BiblioBooks', nomBD);
        const bookSnap = await getDoc(bookRef);
        if (bookSnap.exists()) {
          actualBookRef = bookRef;
        }
      }

      // Fallback: search by name in BiblioBooks
      if (!actualBookRef && name) {
        const q = query(collection(db, 'BiblioBooks'), where('name', '==', name), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          actualBookRef = querySnapshot.docs[0].ref;
        }
      }

      // Last resort: search in all other collections if still not found
      if (!actualBookRef) {
        const allCollections = ['BiblioGE', 'BiblioGI', 'BiblioGM', 'BiblioGT', 'BiblioInformatique'];
        for (const collName of allCollections) {
          const q = query(collection(db, collName), where('name', '==', name), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            actualBookRef = querySnapshot.docs[0].ref;
            break;
          }
        }
      }

      if (!actualBookRef) {
        Alert.alert('Erreur', 'Livre non trouvé pour l\'ajout du commentaire');
        return;
      }

      const newComment = {
        nomUser: userName,
        note: valuesNote,
        texte: values.trim(),
        heure: Timestamp.now(),
        userId: currentUserdata.uid
      };

      await updateDoc(actualBookRef, {
        commentaire: arrayUnion(newComment)
      });

      setComment(prev => Array.isArray(prev) ? [...prev, newComment] : [newComment]);
      setValues("");
      setValuesNote("0");
      setModalComm(false);

      Alert.alert("Succès", "Commentaire ajouté !");
    } catch (error) {
      console.error("Erreur ajout commentaire:", error);
      Alert.alert("Erreur", "Impossible d'ajouter le commentaire: " + error.message);
    }
  };

  const fetchSimilarBooks = async () => {
    if (!name) return;
    setLoadingSimilar(true);

    try {
      console.log(`[Produit] Fetching similar from API for: ${name}`);
      const data = await RecommendationService.getSimilarDocuments(name);

      const recommendations = (data.similar_documents || [])
        .map(doc => ({
          id: doc.id || Math.random().toString(), // API might not return ID matching firestore
          title: doc.titre || doc.title || doc.name, // Handle various naming conventions
          category: doc.cathegorie || doc.category || 'Non catégorisé',
          image: doc.image || null,
          description: doc.desc || doc.description || '',
          exemplaire: doc.exemplaire || 0, // Ensure these fields exist in API output or fallback
          collection: doc.collection || 'BiblioBooks',
          pdfUrl: doc.pdfUrl || doc.url || null
        }))
        // CHANGE: Filter out theses. Keep only if NO pdfUrl and collection is NOT BiblioThesis
        .filter(doc => {
          const isThesis = !!doc.pdfUrl ||
            doc.collection === 'BiblioThesis' ||
            (doc.category && doc.category.toLowerCase().includes('memoire'));
          return !isThesis;
        });

      setSimilarBooks(recommendations.slice(0, 5));
    } catch (error) {
      console.error('Erreur recherche livres similaires (API):', error);
      setSimilarBooks([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const calculateAverageRating = () => {
    if (!comment || !Array.isArray(comment) || comment.length === 0) return 0;
    const sum = comment.reduce((acc, curr) => acc + Number(curr?.note || 0), 0);
    return (sum / comment.length).toFixed(1);
  };

  const calculateRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (!comment || !Array.isArray(comment) || comment.length === 0) return distribution;

    comment.forEach(c => {
      const note = Number(c?.note || 0);
      if (note >= 1 && note <= 5) {
        distribution[note] = (distribution[note] || 0) + 1;
      }
    });
    return distribution;
  };

  const toggleCommentExpansion = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  return (
    <React.Fragment>
      <ScrollView>
        <Swiper style={styles.wrapper} showsButtons={true}>
          <View style={styles.slide1}>
            <Image style={{ width: WIDTH * 0.8, height: HEIGHT * 0.5, resizeMode: 'contain' }} source={{ uri: image }} />
          </View>
          <View style={styles.slide2}>
            <Image style={{ width: WIDTH * 0.8, height: HEIGHT * 0.5, resizeMode: 'contain' }} source={require('../../../assets/ensp.png')} />
          </View>
        </Swiper>

        <View style={styles.bookDetailsContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.bookTitle}>{TITRE}</Text>
            <View style={styles.exemplairesContainer}>
              <Text style={[
                styles.exemplairesText,
                currentExemplaire > 0 ? styles.disponible : styles.nonDisponible
              ]}>
                {currentExemplaire > 0
                  ? `${currentExemplaire} exemplaire${currentExemplaire > 1 ? 's' : ''} disponible${currentExemplaire > 1 ? 's' : ''}`
                  : 'Indisponible'
                }
              </Text>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Catégorie:</Text>
            <Text style={styles.infoValue}>{cathegorie}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.empruntButton,
              (currentExemplaire === 0 || isReserving) && styles.empruntButtonDisabled
            ]}
            onPress={ajouterRecent}
            disabled={currentExemplaire === 0 || isReserving}
          >
            <Text style={styles.empruntButtonText}>
              {isReserving ? t('reserving_btn') : currentExemplaire === 0 ? t('unavailable') : t('reserve_btn')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionTitle}>{t('description_title')}</Text>
            <TouchableOpacity onPress={() => setModalDescription(true)} style={styles.seeMoreButton}>
              <Text style={styles.seeMoreText}>{t('see_more')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.descriptionText}>
            {bookDescription ? (bookDescription.length > 150 ? `${bookDescription.slice(0, 150)}...` : bookDescription) : "Aucune description disponible"}
          </Text>
        </View>

        <View style={styles.locationContainer}>
          <Text style={styles.locationTitle}>Emplacement</Text>
          <View style={styles.locationDetails}>
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>{t('room_label')}</Text>
              <Text style={styles.locationValue}>{salle}</Text>
            </View>
            <View style={styles.locationDivider} />
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>{t('shelf_label')}</Text>
              <Text style={styles.locationValue}>{etagere}</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewsContainer}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsTitle}>{t('reviews_title')}</Text>
            <TouchableOpacity style={styles.addReviewButton} onPress={() => setModalComm(true)}>
              <Text style={styles.addReviewButtonText}>{t('give_review')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingSummary}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRating}>{calculateAverageRating()}</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={styles.starIcon}>
                    {star <= Math.round(calculateAverageRating()) ? '★' : '☆'}
                  </Text>
                ))}
              </View>
              <Text style={styles.totalReviews}>{comment?.length || 0} {t('reviews_count')}</Text>
            </View>

            <View style={styles.ratingBarsContainer}>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = calculateRatingDistribution()[rating] || 0;
                const percentage = (comment?.length || 0) > 0 ? (count / comment.length) * 100 : 0;
                return (
                  <View key={rating} style={styles.ratingBarRow}>
                    <Text style={styles.ratingNumber}>{rating}</Text>
                    <View style={styles.ratingBarBackground}>
                      <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                    </View>
                    <Text style={styles.ratingCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.recentReviews}>
            <Text style={styles.recentReviewsTitle}>Commentaires récents</Text>
            {comment && Array.isArray(comment) && comment.length > 0 ? (
              <>
                {comment.slice(0, 3).map((review, index) => (
                  <View key={index} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>{review?.nomUser || 'Utilisateur'}</Text>
                        <Text style={styles.reviewDate}>
                          {review?.heure?.seconds ? new Date(review.heure.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.reviewRating}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Text key={star} style={styles.reviewStarIcon}>
                            {star <= Number(review?.note || 0) ? '★' : '☆'}
                          </Text>
                        ))}
                      </View>
                    </View>
                    <View>
                      <Text style={styles.reviewText}>
                        {expandedComments[index] || (review?.texte || '').length <= 100
                          ? (review?.texte || '')
                          : (review?.texte || '').slice(0, 100) + '...'}
                      </Text>
                      {(review?.texte || '').length > 100 && (
                        <TouchableOpacity onPress={() => toggleCommentExpansion(index)} style={styles.seeMoreButton}>
                          <Text style={styles.seeMoreText}>
                            {expandedComments[index] ? 'Voir moins' : 'Voir plus'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                {showAllComments && comment.length > 3 && (
                  <View style={styles.additionalComments}>
                    {comment.slice(3).map((review, index) => (
                      <View key={index} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewerInfo}>
                            <Text style={styles.reviewerName}>{review?.nomUser || 'Utilisateur'}</Text>
                            <Text style={styles.reviewDate}>
                              {review?.heure?.seconds ? new Date(review.heure.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.reviewRating}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={styles.reviewStarIcon}>
                                {star <= Number(review?.note || 0) ? '★' : '☆'}
                              </Text>
                            ))}
                          </View>
                        </View>
                        <Text style={styles.reviewText}>{review?.texte || ''}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {comment.length > 3 && (
                  <TouchableOpacity style={styles.seeAllReviewsButton} onPress={() => setShowAllComments(!showAllComments)}>
                    <Text style={styles.seeAllReviewsText}>
                      {showAllComments ? t('see_less_reviews') : t('see_more_reviews', { count: comment.length - 3 })}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.noReviews}>Aucun avis pour le moment</Text>
            )}
          </View>
        </View>

        <View style={styles.similarBooksContainer}>
          <View style={styles.similarBooksHeader}>
            <Text style={styles.similarBooksTitle}>{t('similar_books')}</Text>
          </View>
          {loadingSimilar ? (
            <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
          ) : similarBooks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarBookScroll}>
              {similarBooks.map((book, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.similarBookCard}
                  onPress={() => navigation.navigate('Produit', {
                    name: book.title,
                    cathegorie: book.category,
                    image: book.image,
                    desc: book.description,
                    exemplaire: book.exemplaire
                  })}
                >
                  <Image source={{ uri: book.image }} style={styles.similarBookImage} defaultSource={require('../../../assets/biblio/math.jpg')} />
                  <View style={styles.similarBookInfo}>
                    <Text style={styles.similarBookTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={styles.similarBookCategory}>{book.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noSimilarBooks}>{t('no_similar_books')}</Text>
          )}
        </View>

      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalComm} onRequestClose={() => setModalComm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('rate_modal_title')}</Text>
              <View style={styles.ratingInput}>
                <Text style={styles.ratingLabel}>{t('rating_label')}</Text>
                <View style={styles.starRatingContainer}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity key={rating} onPress={() => setValuesNote(rating.toString())}>
                      <Text style={[styles.starRatingIcon, { color: rating <= parseInt(valuesNote) ? '#FFD700' : '#ddd' }]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TextInput style={styles.commentInput} placeholder={t('write_review_placeholder')} multiline numberOfLines={4} value={values} onChangeText={setValues} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setModalComm(false); setValues(''); setValuesNote('0'); }}>
                  <Text style={styles.cancelButtonText}>{t('cancel_btn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleAddComment}>
                  <Text style={styles.submitButtonText}>{t('submit_btn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal animationType='slide' transparent={true} visible={modalDescription} onRequestClose={() => setModalDescription(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('full_description')}</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalDescriptionText}>{bookDescription || t('no_description')}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalDescription(false)}>
              <Text style={styles.modalCloseButtonText}>{t('close_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </React.Fragment>
  )
}



const styles = StyleSheet.create({
  wrapper: {
    height: 450
  },
  slide1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  slide2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  slide3: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  text: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold'
  },
  input: {
    borderWidth: 1,
    height: 250,
    padding: 10,
    width: 350,
    borderRadius: 20,
    color: '#000',
    marginLeft: 30,

  },
  search: {
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 15
  },
  input2: {
    borderWidth: 1,
    height: 40,
    padding: 10,
    width: 350,
    borderRadius: 20,
    color: '#000',
    marginLeft: 30,

  },
  search2: {
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 15
  },
  bookDetailsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  titleContainer: {
    marginBottom: 15,
  },
  bookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  exemplairesContainer: {
    marginTop: 5,
  },
  exemplairesText: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  disponible: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  nonDisponible: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  empruntButton: {
    backgroundColor: '#FF6600',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
  },
  empruntButtonDisabled: {
    backgroundColor: '#ccc',
  },
  empruntButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  locationTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Roboto',
    marginBottom: 15,
  },
  locationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  locationItem: {
    flex: 1,
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  locationValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  locationDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  descriptionTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'San Francisco',
  },
  seeMoreButton: {
    padding: 5,
  },
  seeMoreText: {
    color: '#FF6600',
    fontSize: 15,
  },
  descriptionText: {
    color: '#666',
    fontSize: 15,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: '80%',
  },
  modalDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#FF6600',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  modalCloseButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },

  // ... (previous styles remain the same)

  similarBooksContainer: {
    backgroundColor: '#FFF',
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  similarBooksHeader: {
    marginBottom: 15,
  },
  similarBooksTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  similarBookScroll: {
    paddingBottom: 15,
  },
  similarBookCard: {
    width: 160,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  similarBookImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  similarBookInfo: {
    padding: 12,
    backgroundColor: '#fff',
  },
  similarBookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  similarBookCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noSimilarBooks: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  loader: {
    marginVertical: 20,
  },

  reviewsContainer: {
    backgroundColor: '#fff',
    marginTop: 15,
    padding: 15,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  reviewsTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'San Francisco',
  },
  addReviewButton: {
    backgroundColor: '#FF6600',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addReviewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ratingSummary: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 20,
  },
  averageRatingContainer: {
    alignItems: 'center',
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    paddingRight: 15,
  },
  averageRating: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  starIcon: {
    color: '#FFD700',
    fontSize: 18,
    marginHorizontal: 1,
  },
  totalReviews: {
    color: '#666',
    fontSize: 12,
  },
  ratingBarsContainer: {
    flex: 2,
    paddingLeft: 15,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  ratingNumber: {
    width: 15,
    fontSize: 12,
    color: '#666',
  },
  ratingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  ratingCount: {
    width: 20,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  recentReviews: {
    marginTop: 20,
  },
  recentReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  reviewCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontWeight: '600',
    fontSize: 14,
  },
  reviewDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewStarIcon: {
    color: '#FFD700',
    fontSize: 14,
    marginLeft: 1,
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noReviews: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  seeAllReviewsButton: {
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  seeAllReviewsText: {
    color: '#FF6600',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingInput: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  starRatingIcon: {
    fontSize: 35,
    marginHorizontal: 5,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  submitButton: {
    backgroundColor: '#FF6600',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
})

export default Produit