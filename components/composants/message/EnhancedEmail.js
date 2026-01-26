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
import * as Haptics from 'expo-haptics';
import { addNotification, NOTIFICATION_TYPES } from '../../utils/addNotification';
import { useTranslation } from '../../hooks/useTranslation';

const db = getFirestore();
const HEIGHT = Dimensions.get('window').height;
const WIDTH = Dimensions.get('window').width;

// Theme Colors
const PRIMARY_COLOR = '#FF6600'; // Orange
const LIGHT_BG = '#F7F7F9'; // Light Gray Background
const TEXT_DARK = '#333333'; // Dark Text
const TEXT_LIGHT = '#FFFFFF'; // White Text
const TEXT_GRAY = '#64748B'; // Gray Text
const BUBBLE_SENT_BG = '#FF8A50'; // Lighter Orange for sent messages
const BUBBLE_RECEIVED_BG = '#FFFFFF'; // White for received messages

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

  const [isLoading, setIsLoading] = useState(false);

  // Refs et animations
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messagesRef = useRef([]);

  // Effets de base
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
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

        messagesRef.current = userData.messages || [];

        setDat(userData);
        setDatUser(userData);
        setTimeout(() => scrollToBottom(), 100);
      } else {
        const newUserData = { email: datUser.email, messages: [] };

        messagesRef.current = [];

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
            <MaterialIcons name="smart-toy" size={16} color={PRIMARY_COLOR} />
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
                    color={isRead ? "#E0F2FE" : "rgba(255,255,255,0.7)"}
                    style={styles.checkmark1}
                  />
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={isRead ? "#E0F2FE" : "rgba(255,255,255,0.7)"}
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
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <View style={styles.adminAvatar}>
                <MaterialIcons name="local-library" size={30} color={PRIMARY_COLOR} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.adminName}>{t('enspy_library')}</Text>
                <Text style={styles.adminStatus}>
                  {t('support_service')}
                </Text>
              </View>
            </View>
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
                  <ActivityIndicator size="large" color={PRIMARY_COLOR} />
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
                    <MaterialIcons name="smart-toy" size={16} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.botLoadingContent}>
                    <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                    <Text style={styles.botLoadingText}>{t('bot_preparing')}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>

          {/* Input */}
          <View style={styles.inputContainer}>
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
                  <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                ) : (
                  <View style={[styles.sendButtonGradient, { backgroundColor: values.trim() ? PRIMARY_COLOR : '#CBD5E1' }]}>
                    <Ionicons name="send" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </MessageContexte.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_BG },
  header: { paddingHorizontal: 0, paddingVertical: 0, height: 100, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerGradient: { flex: 1, paddingTop: Platform.OS === 'ios' ? 40 : 10, backgroundColor: '#fff' },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  adminAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFEDD5' },
  headerTextContainer: { flex: 1 },
  adminName: { fontSize: 18, fontWeight: 'bold', color: TEXT_DARK },
  adminStatus: { fontSize: 14, color: PRIMARY_COLOR, marginTop: 2 },

  keyboardAvoidingView: { flex: 1 },
  chatContainer: { flex: 1 },
  messagesContainer: { paddingVertical: 20, paddingHorizontal: 15 },
  loadingContainer: { alignItems: 'center', paddingVertical: 50 },
  loadingText: { marginTop: 10, fontSize: 14, color: TEXT_GRAY },
  welcomeContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 30 },
  welcomeIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: PRIMARY_COLOR },
  welcomeTitle: { fontSize: 24, fontWeight: '600', color: TEXT_DARK, marginBottom: 10, textAlign: 'center' },
  welcomeText: { fontSize: 16, color: TEXT_GRAY, textAlign: 'center', lineHeight: 24 },

  // Messages
  messageBubble: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  sentMessage: { justifyContent: 'flex-end', paddingLeft: 50 },
  receivedMessage: { justifyContent: 'flex-start', paddingRight: 50 },
  messageContent: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  sentMessageContent: { backgroundColor: BUBBLE_SENT_BG, borderBottomRightRadius: 4 },
  receivedMessageContent: { backgroundColor: BUBBLE_RECEIVED_BG, borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  botMessageContent: { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' },
  messageText: { fontSize: 15, lineHeight: 20 },
  sentMessageText: { color: TEXT_LIGHT },
  receivedMessageText: { color: TEXT_DARK },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  messageTime: { fontSize: 11 },
  sentMessageTime: { color: 'rgba(255, 255, 255, 0.8)' },
  receivedMessageTime: { color: '#94A3B8' },
  messageStatus: { marginLeft: 5, justifyContent: 'center', alignItems: 'center' },
  doubleCheck: { flexDirection: 'row', alignItems: 'center', position: 'relative', width: 20, height: 16 },
  checkmark1: { position: 'absolute', left: 0 },
  checkmark2: { position: 'absolute', left: 4 },

  // Bot
  botIndicator: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 5, borderWidth: 1, borderColor: '#FFEDD5' },
  botLoadingContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start', paddingRight: 50, marginVertical: 4 },
  botLoadingContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  botLoadingText: { marginLeft: 10, fontSize: 14, color: TEXT_GRAY, fontStyle: 'italic' },

  // Dates
  dateSeparatorContainer: { alignItems: 'center', marginVertical: 10 },
  dateSeparator: { backgroundColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  dateSeparatorText: { fontSize: 12, color: TEXT_GRAY, fontWeight: '500', textAlign: 'center' },

  // Input
  inputContainer: { paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#F1F5F9', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10 },
  messageInput: { flex: 1, maxHeight: 100, fontSize: 16, color: TEXT_DARK, paddingVertical: 5 },
  sendButton: { marginLeft: 10 },
  sendButtonGradient: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

export default EnhancedEmail;