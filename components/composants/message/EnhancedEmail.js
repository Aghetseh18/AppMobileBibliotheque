// components/composants/message/EnhancedEmail.js
// Version PROPRE et COHÉRENTE

import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
// LinearGradient removed - using solid colors instead
import { BlurView } from 'expo-blur';
import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  Timestamp,
  onSnapshot,
  setDoc,
  getFirestore,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../../../config';
import { UserContext } from '../../context/UserContext';
import MessageBubble from './MessageBubble';
import ChatBackground from './ChatBackground';
import * as Haptics from 'expo-haptics';
import { addNotification, NOTIFICATION_TYPES } from '../../utils/addNotification';
import { useTranslation } from '../../hooks/useTranslation';


// IMPORT de votre fonction Gemini (Removed)
// import { runLibraryBot } from '../../../gemini';

const db = getFirestore();
const HEIGHT = Dimensions.get('window').height;
const WIDTH = Dimensions.get('window').width;

const MessageContexte = createContext({
  signale: true,
  setSignale: () => { }
});

const EnhancedEmail = ({ navigation }) => {
  const { t } = useTranslation();
  // États principaux
  const { datUser, setDatUser, datUserTest, setDatUserTest } = useContext(UserContext);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [values, setValues] = useState("");
  const [dat, setDat] = useState(0);
  const [data, setData] = useState([]);
  const [loader, setLoader] = useState(true);
  const [signale, setSignale] = useState(true);

  // États bot (Removed)
  // const [botEnabled, setBotEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Refs et animations
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messagesRef = useRef([]); // Ref pour suivre les messages sans problème de closure

  // Effets de base
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setCurrentUserEmail(currentUser);
    });
  }, []);

  useEffect(() => {
    setTimeout(() => setDatUserTest(false), 500);
  }, []);

  // Fonctions Firebase
  function subscriber() {
    if (!datUser?.email) return;

    const docRef = doc(db, 'BiblioUser', datUser.email);
    onSnapshot(docRef, async (documentSnapshot) => {
      if (documentSnapshot.exists()) {
        const userData = documentSnapshot.data();
        if (!userData.messages) userData.messages = [];

        // Utiliser la Ref pour la comparaison (évite les problèmes de closure/stale state)
        const previousMessages = messagesRef.current || [];
        const currentMessages = userData.messages || [];

        const newReceivedMessages = currentMessages.filter(msg => {
          if (msg.recue !== "R") return false;
          return !previousMessages.some(prevMsg =>
            prevMsg.heure?.seconds === msg.heure?.seconds &&
            prevMsg.texte === msg.texte &&
            prevMsg.recue === "R"
          );
        });

        // Ne notifier que si ce n'est PAS le premier chargement (messagesRef a déjà des données)
        // ET qu'il y a effectivement de nouveaux messages
        if (newReceivedMessages.length > 0 && messagesRef.current.length > 0) {
          const latestMessage = newReceivedMessages[newReceivedMessages.length - 1];
          const messagePreview = latestMessage.texte.length > 50
            ? latestMessage.texte.substring(0, 50) + '...'
            : latestMessage.texte;

          try {
            await addNotification(
              datUser.email,
              NOTIFICATION_TYPES.MESSAGE,
              'Nouveau message reçu',
              `"${messagePreview}"`
            );
          } catch (notifError) {
            console.log('Erreur notification (ignorée):', notifError.message);
          }
        }

        // Mettre à jour la Ref et le State
        messagesRef.current = userData.messages || [];

        setDat(userData);
        setDatUser(userData);
        setTimeout(() => scrollToBottom(), 100);
      } else {
        const newUserData = { email: datUser.email, messages: [] };

        messagesRef.current = []; // Reset ref

        setDoc(docRef, newUserData);
        setDat(newUserData);
        setDatUser(newUserData);
      }
    });
  }

  function getData() {
    const colRef = collection(db, 'BiblioUser');
    onSnapshot(colRef, (querySnapshot) => {
      const items = [];
      querySnapshot.forEach((doc) => items.push(doc.data()));
      setData(items);
      setLoader(false);
    });
  }

  useEffect(() => {
    getData();
    subscriber();
  }, []);

  // Fonction principale d'envoi
  async function ajouter() {
    if (!currentUserEmail?.email || !values.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const washingtonRef = doc(db, "BiblioUser", currentUserEmail.email);
    const dt = Timestamp.fromDate(new Date());
    const messageId = dt.nanoseconds.toString();

    try {
      // 1. Message utilisateur
      await updateDoc(washingtonRef, {
        messages: arrayUnion({
          id: messageId,
          "recue": "E",
          "texte": values.trim(),
          "heure": dt,
          "lu": false
        })
      });

      await res();

      // 2. Réponse bot si activé (Removed)
      /* 
      if (botEnabled) {
         ... bot logic removed ...
      } 
      */

      setValues("");
      scrollToBottom();
    } catch (error) {
      console.error("Error adding message:", error);
      setIsLoading(false);
    }
  }

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const res = async function () {
    try {
      const docRef = doc(db, 'MessagesEnvoyé', values);
      await setDoc(docRef, {
        email: datUser.email,
        messages: values,
        nom: datUser.email,
        lue: false
      });
    } catch (error) {
      console.error("Error in res:", error);
    }
  };

  // Fonctions d'affichage
  const formatTime = (timestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const locale = datUser?.language === 'en' ? 'en-US' : 'fr-FR';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if dates match (ignoring time)
    if (date.toDateString() === today.toDateString()) return t('today');
    if (date.toDateString() === yesterday.toDateString()) return t('yesterday');

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    const locale = datUser?.language === 'en' ? 'en-US' : 'fr-FR';

    if (date >= weekStart) {
      return date.toLocaleDateString(locale, { weekday: 'long' });
    }

    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const shouldShowDate = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.heure.seconds * 1000);
    const previousDate = new Date(previousMessage.heure.seconds * 1000);
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  // Composants
  const DateSeparator = ({ date }) => (
    <View style={styles.dateSeparatorContainer}>
      <View style={styles.dateSeparator}>
        <Text style={styles.dateSeparatorText}>{formatDate(date)}</Text>
      </View>
    </View>
  );

  const MessageBubbleEnhanced = ({ message, time, isReceived, isRead }) => {
    const isBot = message.includes('Bonjour !') || message.includes('Bonsoir !') ||
      message.includes('Comment puis-je') || message.includes('BiblioApp') ||
      message.includes('bibliothécaire') || message.includes('Je rencontre des difficultés') ||
      message.includes('How can I') || message.includes('Hello') || message.includes('techincal difficulties');

    return (
      <View style={[styles.messageBubble, isReceived ? styles.receivedMessage : styles.sentMessage]}>
        {isBot && isReceived && (
          <View style={styles.botIndicator}>
            <MaterialIcons name="smart-toy" size={16} color="#FF8A50" />
          </View>
        )}

        <View style={[
          styles.messageContent,
          isReceived ? styles.receivedMessageContent : styles.sentMessageContent,
          isBot && styles.botMessageContent
        ]}>
          <Text style={[
            styles.messageText,
            isReceived ? styles.receivedMessageText : styles.sentMessageText
          ]}>
            {message}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isReceived ? styles.receivedMessageTime : styles.sentMessageTime
            ]}>
              {time}
            </Text>

            {!isReceived && (
              <View style={styles.messageStatus}>
                <View style={styles.doubleCheck}>
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={isRead ? "#4FC3F7" : "#9CA3AF"}
                    style={styles.checkmark1}
                  />
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={isRead ? "#4FC3F7" : "#9CA3AF"}
                    style={styles.checkmark2}
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  async function markMessageAsRead(messageId) {
    if (!datUser?.email) return;

    try {
      const userRef = doc(db, "BiblioUser", datUser.email);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const messages = userData.messages || [];
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) return { ...msg, lu: true };
        return msg;
      });

      await updateDoc(userRef, { messages: updatedMessages });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }

  useEffect(() => {
    if (datUser?.messages && datUser.messages.length > 0) {
      const lastMessage = datUser.messages[datUser.messages.length - 1];
      if (!lastMessage.lu && lastMessage.recue === "R" && lastMessage.id) {
        markMessageAsRead(lastMessage.id);
      }
    }
  }, [datUser?.messages]);

  return (
    <MessageContexte.Provider value={{ signale, setSignale }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ChatBackground />

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerGradient}>
            <BlurView intensity={20} style={styles.headerContent}>
              <View style={styles.adminAvatar}>
                <MaterialIcons name="local-library" size={30} color="#fff" />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.adminName}>{t('enspy_library')}</Text>
                <Text style={styles.adminStatus}>
                  {t('support_service')}
                </Text>
              </View>
            </BlurView>
          </View>
        </Animated.View>

        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        >
          {/* Messages */}
          <Animated.View style={[styles.chatContainer, { opacity: fadeAnim }]}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.messagesContainer}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {datUserTest ? null : !datUser ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#22D3EE" />
                  <Text style={styles.loadingText}>{t('loading_conversation')}</Text>
                </View>
              ) : (
                <>
                  {datUser.messages?.length > 0 ? (
                    datUser.messages.map((dev, index) => {
                      const previousMessage = index > 0 ? datUser.messages[index - 1] : null;
                      const showDate = shouldShowDate(dev, previousMessage);

                      return (
                        <React.Fragment key={index}>
                          {showDate && <DateSeparator date={dev.heure} />}
                          <MessageBubbleEnhanced
                            message={dev.texte}
                            time={formatTime(dev.heure)}
                            isReceived={dev.recue === "R"}
                            isRead={dev.lu}
                          />
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim }]}>
                      <View style={styles.welcomeIconContainer}>
                        <MaterialIcons name="local-library" size={40} color="#fff" />
                      </View>
                      <Text style={styles.welcomeTitle}>{t('welcome_chat')}</Text>
                      <Text style={styles.welcomeText}>
                        {t('welcome_staff_msg')}
                      </Text>
                    </Animated.View>
                  )}
                </>
              )}

              {/* Indicateur de chargement bot */}
              {isLoading && (
                <View style={styles.botLoadingContainer}>
                  <View style={styles.botIndicator}>
                    <MaterialIcons name="smart-toy" size={16} color="#FF8A50" />
                  </View>
                  <View style={styles.botLoadingContent}>
                    <ActivityIndicator size="small" color="#FF8A50" />
                    <Text style={styles.botLoadingText}>{t('bot_preparing')}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>

          {/* Input */}
          <BlurView intensity={30} tint="light" style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder={t('write_message')}
                placeholderTextColor="#94A3B8"
                onChangeText={(text) => {
                  setValues(text);
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
                value={values}
                multiline
                maxLength={500}
                editable={!isLoading}
                onContentSizeChange={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
              />
              <TouchableOpacity
                onPress={ajouter}
                style={styles.sendButton}
                disabled={!values.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={[styles.sendButtonGradient, { backgroundColor: values.trim() ? '#22D3EE' : '#1E293B' }]}>
                    <Ionicons name="send" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </MessageContexte.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 0, paddingVertical: 0, height: 120 },
  headerGradient: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 30, backgroundColor: '#0EA5E9' },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  adminAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: { flex: 1 },
  adminName: { fontSize: 18, fontWeight: 'bold', color: '#E2E8F0' },
  adminStatus: { fontSize: 14, color: 'rgba(226, 232, 240, 0.75)', marginTop: 2 },
  botToggle: { flexDirection: 'row', alignItems: 'center' },
  switch: { marginLeft: 8, transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  keyboardAvoidingView: { flex: 1 },
  chatContainer: { flex: 1 },
  messagesContainer: { paddingVertical: 20, paddingHorizontal: 15 },
  loadingContainer: { alignItems: 'center', paddingVertical: 50 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#93C5FD', fontStyle: 'italic' },
  welcomeContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
  welcomeIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#22D3EE' },
  welcomeTitle: { fontSize: 24, fontWeight: '600', color: '#E2E8F0', marginBottom: 10, textAlign: 'center' },
  welcomeText: { fontSize: 16, color: '#CBD5E1', textAlign: 'center', lineHeight: 24 },

  // Messages
  messageBubble: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  sentMessage: { justifyContent: 'flex-end', paddingLeft: 50 },
  receivedMessage: { justifyContent: 'flex-start', paddingRight: 50 },
  messageContent: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  sentMessageContent: { backgroundColor: '#E0F2FE', borderBottomRightRadius: 4, color: '#0F172A' },
  receivedMessageContent: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#334155', borderBottomLeftRadius: 4 },
  botMessageContent: { backgroundColor: 'rgba(14, 165, 233, 0.08)', borderColor: 'rgba(14, 165, 233, 0.4)' },
  messageText: { fontSize: 15, lineHeight: 20 },
  sentMessageText: { color: '#0F172A' },
  receivedMessageText: { color: '#E2E8F0' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  messageTime: { fontSize: 11 },
  sentMessageTime: { color: 'rgba(15, 23, 42, 0.65)' },
  receivedMessageTime: { color: 'rgba(226, 232, 240, 0.6)' },
  messageStatus: { marginLeft: 5, justifyContent: 'center', alignItems: 'center' },
  doubleCheck: { flexDirection: 'row', alignItems: 'center', position: 'relative', width: 20, height: 16 },
  checkmark1: { position: 'absolute', left: 0 },
  checkmark2: { position: 'absolute', left: 4 },

  // Bot
  botIndicator: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#22D3EE', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 5 },
  botLoadingContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start', paddingRight: 50, marginVertical: 4 },
  botLoadingContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B162B', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#1E293B', borderBottomLeftRadius: 4 },
  botLoadingText: { marginLeft: 10, fontSize: 14, color: '#93C5FD', fontStyle: 'italic' },
  botInfo: { fontSize: 11, color: 'rgba(226, 232, 240, 0.7)', textAlign: 'center', marginTop: 8 },

  // Dates
  dateSeparatorContainer: { alignItems: 'center', marginVertical: 10 },
  dateSeparator: { backgroundColor: '#0B162B', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#1E293B' },
  dateSeparatorText: { fontSize: 12, color: '#93C5FD', fontWeight: '500', textAlign: 'center' },

  // Input
  inputContainer: { paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#1E293B' },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(148, 163, 184, 0.08)', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#1E293B' },
  messageInput: { flex: 1, maxHeight: 100, fontSize: 16, color: '#E2E8F0', paddingVertical: 5 },
  sendButton: { marginLeft: 10 },
  sendButtonGradient: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

export default EnhancedEmail;