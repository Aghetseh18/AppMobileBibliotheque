import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import run, { runLibraryBot } from '../../../gemini'; // Import de votre fonction Gemini
import { AssistantApi } from '../../utils/AssistantApi';
import { useConfig } from '../../context/ConfigContext';

const assistant = new AssistantApi();

console.log('Markdown component import check:', Markdown ? 'Defined' : 'Undefined');

const formatTime = (timestamp) => {
    try {
        if (!timestamp) return "";
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return "";
    }
};

const MessageBubble = ({ message }) => {
    const isBot = message.isBot;
    const isError = message.type === 'error';

    return (
        <View style={[
            styles.messageBubble,
            isBot ? styles.botMessage : styles.userMessage
        ]}>
            {isBot && (
                <View style={styles.botAvatar}>
                    <MaterialIcons
                        name="support-agent"
                        size={16}
                        color="#fff"
                    />
                </View>
            )}

            <View style={[
                styles.messageContent,
                isBot ? styles.botMessageContent : styles.userMessageContent,
                isError && styles.errorMessageContent
            ]}>
                {isBot ? (
                    <Markdown
                        style={{
                            body: { color: '#1F2937', fontSize: 16, lineHeight: 22 },
                            paragraph: { marginBottom: 10 },
                            bullet_list: { marginBottom: 10 },
                            ordered_list: { marginBottom: 10 },
                            bullet_list_item: { marginBottom: 5 },
                            ordered_list_item: { marginBottom: 5 },
                            strong: { fontWeight: 'bold', color: '#000' }
                        }}
                    >
                        {message.text}
                    </Markdown>
                ) : (
                    <Text style={[
                        styles.messageText,
                        isBot ? styles.botMessageText : styles.userMessageText,
                        isError && styles.errorMessageText
                    ]}>
                        {message.text}
                    </Text>
                )}

                <Text style={[
                    styles.messageTime,
                    isBot ? styles.botMessageTime : styles.userMessageTime
                ]}>
                    {formatTime(message.timestamp)}
                </Text>
            </View>
        </View>
    );
};

const ChatBot = ({ navigation, currentUser }) => {
    const { orgSettings } = useConfig();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [quickSuggestions, setQuickSuggestions] = useState([]);

    const isInitialized = useRef(false);
    const scrollViewRef = useRef(null);

    // Initialisation - Une seule fois
    useEffect(() => {
        const initBot = async () => {
            // Si déjà initialisé ou si on a déjà des messages (persistance), on ne fait rien
            if (isInitialized.current || messages.length > 0) return;

            const orgName = orgSettings?.Name || "la bibliothèque";

            // Welcome message
            const welcomeMessage = {
                id: Date.now(),
                text: `Bonjour ! Je suis votre assistant virtuel de ${orgName}. Comment puis-je vous aider aujourd'hui ?`,
                isBot: true,
                timestamp: new Date(),
                type: 'bot'
            };

            setMessages([welcomeMessage]);
            isInitialized.current = true;

            // Load quick suggestions
            try {
                const suggestions = await assistant.getQuickSuggestions();
                setQuickSuggestions(suggestions);
            } catch (e) {
                console.error("Failed to load suggestions", e);
            }
        };

        if (orgSettings) {
            initBot();
        }
    }, [orgSettings]);

    // Auto-scroll vers le bas lors de nouveaux messages
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollToEnd({ animated: true });
            }, 150);
        }
    };

    // Gestion de l'envoi de message
    const handleSendMessage = async () => {
        const textToSend = inputText.trim();
        if (!textToSend || isLoading) return;

        // 1. Log et Réinitialisation immédiate du champ
        console.log('[ChatBot] Handling send:', textToSend);
        setInputText('');

        // 2. Création du message utilisateur
        const userMsg = {
            id: `user-${Date.now()}-${Math.random()}`,
            text: textToSend,
            isBot: false,
            timestamp: new Date(),
            type: 'user'
        };

        // 3. Mise à jour de l'UI (Priorité haute)
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);
        setIsTyping(true);

        try {
            // 4. Récupération du contexte RAG (Firestore)
            const context = await assistant.queryKnowledgeBase(textToSend, orgSettings);

            // 5. Tentative de réponse structurée simple
            const simpleResp = await assistant.getAssistantResponse(textToSend);
            if (simpleResp && !context.matchFound) {
                const assistantMsg = {
                    id: `bot-${Date.now()}`,
                    text: simpleResp,
                    isBot: true,
                    timestamp: new Date(),
                    type: 'bot'
                };
                setMessages(prev => [...prev, assistantMsg]);
                setIsLoading(false);
                setIsTyping(false);
                return;
            }

            // 6. Appel Gemini AI
            const botResp = await runLibraryBot(textToSend, messages, context);

            const botMsg = {
                id: `bot-${Date.now()}`,
                text: botResp,
                isBot: true,
                timestamp: new Date(),
                type: 'bot'
            };

            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error('[ChatBot] Error in flow:', error);
            const errorMsg = {
                id: `err-${Date.now()}`,
                text: "Désolé, une erreur technique est survenue. Réessayez plus tard.",
                isBot: true,
                timestamp: new Date(),
                type: 'error'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };




    const TypingIndicator = () => (
        <View style={[styles.messageBubble, styles.botMessage]}>
            <View style={styles.botAvatar}>
                <MaterialIcons name="support-agent" size={16} color="#fff" />
            </View>
            <View style={[styles.messageContent, styles.botMessageContent, styles.typingContent]}>
                <View style={styles.typingIndicator}>
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                </View>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#FF8A50" />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Assistant Bibliothèque</Text>
                    <Text style={styles.headerSubtitle}>Réponse automatique</Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerButton}>
                        <MaterialIcons name="help-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}

                {isTyping && <TypingIndicator />}
            </ScrollView>

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickActionsContent}
                >
                    {quickSuggestions.length > 0 ? quickSuggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.quickActionButton}
                            onPress={() => setInputText(suggestion.query)}
                        >
                            <Text style={styles.quickActionText}>{suggestion.text}</Text>
                        </TouchableOpacity>
                    )) : (
                        [
                            "Chercher un livre",
                            "Chercher un mémoire",
                            "Horaires d'ouverture",
                            "Comment emprunter ?",
                            "Livre informatique",
                            "Mémoire IA"
                        ].map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.quickActionButton}
                                onPress={() => setInputText(action)}
                            >
                                <Text style={styles.quickActionText}>{action}</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Zone de saisie */}
            <BlurView intensity={30} tint="light" style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.messageInput}
                        placeholder="Posez votre question..."
                        placeholderTextColor="#9CA3AF"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        editable={!isLoading}
                        onSubmitEditing={handleSendMessage}
                        blurOnSubmit={false}
                    />

                    <TouchableOpacity
                        onPress={handleSendMessage}
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || isLoading) && styles.sendButtonDisabled
                        ]}
                        disabled={!inputText.trim() || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <LinearGradient
                                colors={inputText.trim() ? ['#FF8A50', '#FF6B35'] : ['#ccc', '#aaa']}
                                style={styles.sendButtonGradient}
                            >
                                <Ionicons name="send" size={20} color="#fff" />
                            </LinearGradient>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Disclaimer */}
                <Text style={styles.disclaimer}>
                    Réponses générées automatiquement • Contactez la bibliothécaire pour plus d'aide
                </Text>
            </BlurView>
        </KeyboardAvoidingView>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    backButton: {
        marginRight: 15,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#10B981',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerButton: {
        padding: 8,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    messagesContent: {
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    messageBubble: {
        flexDirection: 'row',
        marginVertical: 4,
        alignItems: 'flex-end',
    },
    userMessage: {
        justifyContent: 'flex-end',
        paddingLeft: 50,
    },
    botMessage: {
        justifyContent: 'flex-start',
        paddingRight: 50,
    },
    botAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF8A50',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageContent: {
        maxWidth: '80%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    userMessageContent: {
        backgroundColor: '#FF8A50',
        borderBottomRightRadius: 4,
    },
    botMessageContent: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderBottomLeftRadius: 4,
    },
    errorMessageContent: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userMessageText: {
        color: '#fff',
    },
    botMessageText: {
        color: '#1F2937',
    },
    errorMessageText: {
        color: '#DC2626',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    userMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    botMessageTime: {
        color: '#9CA3AF',
    },
    typingContent: {
        paddingVertical: 12,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9CA3AF',
        marginHorizontal: 2,
    },
    inputContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    messageInput: {
        flex: 1,
        maxHeight: 100,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 5,
    },
    sendButton: {
        marginLeft: 10,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disclaimer: {
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 8,
    },
    // Quick Actions Styles
    quickActionsContainer: {
        paddingVertical: 10,
        backgroundColor: '#f8f9fa',
    },
    quickActionsContent: {
        paddingHorizontal: 15,
    },
    quickActionButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    quickActionText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
});

export default ChatBot;