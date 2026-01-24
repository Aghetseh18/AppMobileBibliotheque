import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View, Alert, Modal, SafeAreaView, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import Swiper from 'react-native-swiper';
import React, { useContext, useEffect, useState } from 'react';
import { UserContextNavApp } from '../navigation/NavApp';
import { useTranslation } from '../hooks/useTranslation';
import { doc, updateDoc, arrayUnion, Timestamp, getDoc, collection, query, getDocs } from "firebase/firestore";
import { useFirebase } from '../context/FirebaseContext';
import { Ionicons } from '@expo/vector-icons';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const normalizeString = (str) => {
    if (!str) return '';
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .trim();
};

const MemoireDetails = ({ route, navigation }) => {
    const { t } = useTranslation();
    const {
        name,
        cathegorie,
        image,
        desc,
        nomBD,
        datUser,
        annee,
        superviseur,
        keywords,
        pdfUrl,
        matricule,
        theme,
        commentaire: initialComments
    } = route.params || {};

    const TITRE = name || '';
    const { currentUserdata } = useContext(UserContextNavApp);
    const { isFirebaseReady, db } = useFirebase();

    const [comment, setComment] = useState(Array.isArray(initialComments) ? initialComments : []);
    const [modalComm, setModalComm] = useState(false);
    const [values, setValues] = useState("");
    const [valuesNote, setValuesNote] = useState("0");
    const [showAllComments, setShowAllComments] = useState(false);
    const [modalDescription, setModalDescription] = useState(false);
    const [expandedComments, setExpandedComments] = useState({});

    // Similar memoires state
    const [similarMemoires, setSimilarMemoires] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);

    useEffect(() => {
        const loadComments = async () => {
            if (!isFirebaseReady || !db || !nomBD) return;

            try {
                const docRef = doc(db, 'BiblioThesis', nomBD);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.commentaire && Array.isArray(data.commentaire)) {
                        setComment(data.commentaire);
                    } else {
                        setComment([]);
                    }
                }
            } catch (error) {
                console.error("Erreur chargement commentaires:", error);
            }
        };

        if (isFirebaseReady && db) {
            loadComments();
            fetchSimilarMemoires();
        }
    }, [nomBD, isFirebaseReady, db]);

    const calculateSimilarity = (str1, str2) => {
        if (!str1 || !str2) return 0;
        const s1 = normalizeString(str1).split(' ').filter(Boolean);
        const s2 = normalizeString(str2).split(' ').filter(Boolean);
        if (s1.length === 0 || s2.length === 0) return 0;
        const commonWords = s1.filter(word => s2.includes(word));
        return commonWords.length / Math.max(s1.length, s2.length);
    };

    const fetchSimilarMemoires = async () => {
        if (!name || !isFirebaseReady || !db) return;
        setLoadingSimilar(true);

        try {
            const q = query(collection(db, 'BiblioThesis'));
            const querySnapshot = await getDocs(q);
            let allMemoires = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Avoid including the current memoire
                if (data && (data.name || data.theme) && doc.id !== nomBD && data.name !== name) {
                    allMemoires.push({
                        id: doc.id,
                        title: data.name || data.theme || 'Sans titre',
                        category: data.departement || data.cathegorie || 'Non classé',
                        image: data.image || null,
                        desc: data.desc || data.description || '',
                        originalId: doc.id,
                        // Pass other fields needed for navigation
                        annee: data.annee,
                        superviseur: data.superviseur,
                        keywords: data.keywords,
                        pdfUrl: data.pdfUrl,
                        matricule: data.matricule,
                        theme: data.theme,
                        createdAt: data.createdAt
                    });
                }
            });

            // Calculate score based on name similarity and matching category/department
            const scoredMemoires = allMemoires.map(m => ({
                ...m,
                score: calculateSimilarity(name, m.title) * 0.6 + (normalizeString(m.category) === normalizeString(cathegorie) ? 0.4 : 0)
            }));

            const recommendations = scoredMemoires
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

            setSimilarMemoires(recommendations);

        } catch (error) {
            console.error("Erreur chargement mémoires similaires:", error);
        } finally {
            setLoadingSimilar(false);
        }
    };

    const handleAddComment = async () => {
        if (!currentUserdata?.email) {
            Alert.alert(t('error'), t('error_login_review'));
            return;
        }

        if (!valuesNote || valuesNote === '0') {
            Alert.alert(t('error'), t('error_missing_rating'));
            return;
        }

        if (!values.trim()) {
            Alert.alert(t('error'), t('error_missing_comment'));
            return;
        }

        try {
            const userRef = doc(db, 'BiblioUser', currentUserdata.email);
            const userSnap = await getDoc(userRef);
            const userName = userSnap.exists() ? userSnap.data().name : 'Utilisateur';

            const newComment = {
                nomUser: userName,
                note: valuesNote,
                texte: values.trim(),
                heure: Timestamp.now(),
                userId: currentUserdata.uid
            };

            const docRef = doc(db, 'BiblioThesis', nomBD);
            await updateDoc(docRef, {
                commentaire: arrayUnion(newComment)
            });

            setComment(prev => [...prev, newComment]);
            setValues("");
            setValuesNote("0");
            setModalComm(false);

            setModalComm(false);

            Alert.alert(t('success'), t('success_review_added'));
        } catch (error) {
            console.error("Erreur ajout commentaire:", error);
            Alert.alert(t('error'), t('error_review_add'));
        }
    };

    const handleDownload = () => {
        if (pdfUrl) {
            Linking.openURL(pdfUrl).catch(err => {
                console.error("Erreur ouverture PDF:", err);
                Alert.alert(t('error'), t('error_pdf_open'));
            });
        } else {
            Alert.alert("Info", t('info_no_pdf'));
        }
    };

    const calculateAverageRating = () => {
        if (!comment || comment.length === 0) return 0;
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

    const toggleCommentExpansion = (index) => {
        setExpandedComments(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{TITRE || t('thesis_details_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Swiper style={styles.wrapper} showsButtons={true} activeDotColor="#FF6600">
                    <View style={styles.slide1}>
                        {image ? (
                            <Image style={{ width: WIDTH * 0.8, height: HEIGHT * 0.5, resizeMode: 'contain' }} source={{ uri: image }} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="school-outline" size={80} color="#ccc" />
                            </View>
                        )}
                    </View>
                    <View style={styles.slide2}>
                        <Image style={{ width: WIDTH * 0.8, height: HEIGHT * 0.5, resizeMode: 'contain' }} source={require('../../assets/ensp.png')} />
                    </View>
                </Swiper>

                <View style={styles.bookDetailsContainer}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.bookTitle}>{TITRE}</Text>
                        <View style={styles.exemplairesContainer}>
                            <Text style={[styles.exemplairesText, styles.disponible]}>
                                {pdfUrl ? t('available_online') : t('consultation_on_site')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>{t('subject_label')}</Text>
                        <Text style={styles.infoValue}>{theme || cathegorie || t('uncategorized')}</Text>
                    </View>

                    {pdfUrl && (
                        <TouchableOpacity style={styles.empruntButton} onPress={handleDownload}>
                            <Text style={styles.empruntButtonText}>{t('read_document')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.descriptionContainer}>
                    <View style={styles.descriptionHeader}>
                        <Text style={styles.descriptionTitle}>{t('abstract_title')}</Text>
                        {desc && desc.length > 150 && (
                            <TouchableOpacity onPress={() => setModalDescription(true)} style={styles.seeMoreButton}>
                                <Text style={styles.seeMoreText}>{t('see_more')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.descriptionText}>
                        {desc ? (desc.length > 150 ? `${desc.slice(0, 150)}...` : desc) : t('unavailable')}
                    </Text>
                </View>

                <View style={styles.locationContainer}>
                    <Text style={styles.locationTitle}>{t('academic_info')}</Text>
                    <View style={styles.locationDetails}>
                        <View style={styles.locationItem}>
                            <Text style={styles.locationLabel}>{t('year_label')}</Text>
                            <Text style={styles.locationValue}>{annee || 'N/A'}</Text>
                        </View>
                        <View style={styles.locationDivider} />
                        <View style={styles.locationItem}>
                            <Text style={styles.locationLabel}>{t('matricule_label')}</Text>
                            <Text style={styles.locationValue}>{matricule || 'N/A'}</Text>
                        </View>
                    </View>
                    {superviseur && (
                        <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                            <Text style={styles.locationLabel}>{t('supervisor_label')}</Text>
                            <Text style={[styles.locationValue, { fontSize: 16 }]}>{superviseur}</Text>
                        </View>
                    )}
                    {keywords && (
                        <View style={{ marginTop: 15 }}>
                            <Text style={styles.locationLabel}>{t('keywords_label')}</Text>
                            <View style={styles.keywordsList}>
                                {Array.isArray(keywords) ? keywords.map((kw, i) => (
                                    <View key={i} style={styles.keywordBadge}>
                                        <Text style={styles.keywordText}>{kw}</Text>
                                    </View>
                                )) : <Text style={styles.infoValue}>{keywords}</Text>}
                            </View>
                        </View>
                    )}
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
                            <Text style={styles.totalReviews}>{comment.length} {t('reviews_count')}</Text>
                        </View>

                        <View style={styles.ratingBarsContainer}>
                            {[5, 4, 3, 2, 1].map((rating) => {
                                const count = calculateRatingDistribution()[rating] || 0;
                                const percentage = comment.length > 0 ? (count / comment.length) * 100 : 0;
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
                        <Text style={styles.recentReviewsTitle}>{t('recent_reviews')}</Text>
                        {comment.length > 0 ? (
                            <>
                                {comment.slice(0, 3).map((review, index) => (
                                    <View key={index} style={styles.reviewCard}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.reviewerInfo}>
                                                <Text style={styles.reviewerName}>{review?.nomUser || 'Utilisateur'}</Text>
                                                <Text style={styles.reviewDate}>
                                                    {review?.heure?.seconds ? new Date(review.heure.seconds * 1000).toLocaleDateString() : ''}
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
                                        <Text style={styles.reviewText}>
                                            {expandedComments[index] || (review?.texte || '').length <= 100
                                                ? review.texte
                                                : (review.texte || '').slice(0, 100) + '...'}
                                        </Text>
                                        {(review?.texte || '').length > 100 && (
                                            <TouchableOpacity onPress={() => toggleCommentExpansion(index)} style={styles.seeMoreButton}>
                                                <Text style={styles.seeMoreText}>{expandedComments[index] ? t('see_less') : t('see_more')}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}

                                {showAllComments && comment.slice(3).map((review, index) => (
                                    <View key={index + 3} style={styles.reviewCard}>
                                        <View style={styles.reviewHeader}>
                                            <View style={styles.reviewerInfo}>
                                                <Text style={styles.reviewerName}>{review?.nomUser || 'Utilisateur'}</Text>
                                                <Text style={styles.reviewDate}>
                                                    {review?.heure?.seconds ? new Date(review.heure.seconds * 1000).toLocaleDateString() : ''}
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
                                        <Text style={styles.reviewText}>{review.texte}</Text>
                                    </View>
                                ))}

                                {comment.length > 3 && (
                                    <TouchableOpacity style={styles.seeAllReviewsButton} onPress={() => setShowAllComments(!showAllComments)}>
                                        <Text style={styles.seeAllReviewsText}>
                                            {showAllComments ? t('see_less_reviews') : t('see_more_reviews', { count: comment.length - 3 })}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <Text style={styles.noReviews}>{t('no_reviews_yet')}</Text>
                        )}
                    </View>
                </View>

                {/* Similar Memoires */}
                <View style={styles.similarBooksContainer}>
                    <View style={styles.similarBooksHeader}>
                        <Text style={styles.similarBooksTitle}>{t('similar_theses')}</Text>
                    </View>
                    {loadingSimilar ? (
                        <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />
                    ) : similarMemoires.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarBookScroll}>
                            {similarMemoires.map((memoire, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.similarBookCard}
                                    onPress={() => navigation.push('MemoireDetails', {
                                        name: memoire.title,
                                        cathegorie: memoire.category,
                                        image: memoire.image,
                                        desc: memoire.desc,
                                        nomBD: memoire.originalId,
                                        annee: memoire.annee,
                                        superviseur: memoire.superviseur,
                                        keywords: memoire.keywords,
                                        pdfUrl: memoire.pdfUrl,
                                        matricule: memoire.matricule,
                                        theme: memoire.theme,
                                        createdAt: memoire.createdAt
                                    })}
                                >
                                    {memoire.image ? (
                                        <Image source={{ uri: memoire.image }} style={styles.similarBookImage} />
                                    ) : (
                                        <View style={[styles.similarBookImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
                                            <Ionicons name="school" size={40} color="#ccc" />
                                        </View>
                                    )}
                                    <View style={styles.similarBookInfo}>
                                        <Text style={styles.similarBookTitle} numberOfLines={2}>{memoire.title}</Text>
                                        <Text style={styles.similarBookCategory} numberOfLines={1}>{memoire.category}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.noSimilarBooks}>Aucun mémoire similaire trouvé</Text>
                    )}
                </View>

            </ScrollView>

            {/* Modal Commentaire */}
            <Modal animationType="slide" transparent={true} visible={modalComm} onRequestClose={() => setModalComm(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('rate_modal_title')}</Text>
                        <View style={styles.ratingInput}>
                            <Text style={styles.ratingLabel}>{t('rating_label')}</Text>
                            <View style={styles.starRatingContainer}>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <TouchableOpacity key={n} onPress={() => setValuesNote(n.toString())}>
                                        <Text style={[styles.starRatingIcon, { color: n <= Number(valuesNote) ? '#FFD700' : '#ddd' }]}>★</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <TextInput
                            style={styles.commentInput}
                            placeholder={t('write_review_placeholder')}
                            multiline
                            numberOfLines={4}
                            value={values}
                            onChangeText={setValues}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalComm(false)}>
                                <Text style={styles.cancelButtonText}>{t('cancel_btn')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleAddComment}>
                                <Text style={styles.submitButtonText}>{t('submit_btn')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Modal Description */}
            <Modal animationType="slide" transparent={true} visible={modalDescription} onRequestClose={() => setModalDescription(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('full_abstract')}</Text>
                        <ScrollView style={styles.modalScrollView}>
                            <Text style={styles.modalDescriptionText}>{desc}</Text>
                        </ScrollView>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalDescription(false)}>
                            <Text style={styles.modalCloseButtonText}>{t('close_btn')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10
    },
    backButton: {
        padding: 5
    },
    scrollContent: {
        paddingBottom: 40,
    },
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
    placeholderImage: {
        width: WIDTH * 0.8,
        height: HEIGHT * 0.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
        borderRadius: 20,
    },
    bookDetailsContainer: {
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 10,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
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
        alignSelf: 'flex-start',
    },
    disponible: {
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
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
    empruntButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    descriptionContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
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
    locationContainer: {
        backgroundColor: '#fff',
        padding: 15,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    locationTitle: {
        fontSize: 17,
        fontWeight: '800',
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
        textAlign: 'center'
    },
    locationDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 15,
    },
    keywordsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 5
    },
    keywordBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    keywordText: {
        color: '#1976d2',
        fontSize: 13,
    },
    reviewsContainer: {
        backgroundColor: '#fff',
        marginTop: 5,
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
    // Modal Styles matching Produit.js
    modalOverlay: {
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
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
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
    loader: {
        marginVertical: 20,
    },
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
});

export default MemoireDetails;
