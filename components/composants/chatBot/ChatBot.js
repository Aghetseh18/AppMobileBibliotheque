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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import run from '../../../gemini'; // Import de votre fonction Gemini
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config';

const ChatBot = ({ navigation, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef(null);

    // Message d'accueil initial
    useEffect(() => {
        const welcomeMessage = {
            id: Date.now(),
            text: "Bonjour ! Je suis votre assistant virtuel de la bibliothèque. Comment puis-je vous aider aujourd'hui ?",
            isBot: true,
            timestamp: new Date(),
            type: 'bot'
        };
        setMessages([welcomeMessage]);
    }, []);

    // Auto-scroll vers le bas
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    // Prompts système pour contextualiser le bot
    const getSystemPrompt = (userMessage) => {
        return `Tu es un assistant virtuel pour une bibliothèque universitaire. 
    Contexte : Tu aides des étudiants avec leurs questions sur :
    - La recherche de livres et ressources
    - Les procédures d'emprunt et de réservation
    - Les horaires et services de la bibliothèque
    - L'aide aux recherches académiques
    - Les ressources numériques disponibles
    
    Instructions :
    - Réponds de manière professionnelle mais amicale
    - Sois concis et précis
    - Si tu ne connais pas une information spécifique à cette bibliothèque, indique que l'étudiant peut contacter la bibliothécaire
    - Propose des solutions pratiques
    - Utilise un ton professionnel mais accessible
    
    Question de l'étudiant : ${userMessage}`;
    };

    // Gestion de l'envoi de message
    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage = {
            id: Date.now(),
            text: inputText.trim(),
            isBot: false,
            timestamp: new Date(),
            type: 'user'
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);
        setIsTyping(true);

        try {
            const lowerInput = userMessage.text.toLowerCase();
            let additionalContext = "";

            // Simple intent detection for search
            if (lowerInput.includes('cherche') || lowerInput.includes('recherche') || lowerInput.includes('livre') || lowerInput.includes('mémoire')) {
                // Perform search
                const books = await searchBooks(lowerInput);
                const theses = await searchTheses(lowerInput);

                if (books.length > 0) {
                    additionalContext += `\nLivres trouvés dans la base de données :\n${books.map(b => `- ${b.name} (${b.cathegorie})`).join('\n')}`;
                }
                if (theses.length > 0) {
                    additionalContext += `\nMémoires trouvés dans la base de données :\n${theses.map(t => `- ${t.name} (${t.département})`).join('\n')}`;
                }

                if (books.length === 0 && theses.length === 0) {
                    additionalContext += "\nAucun document exact trouvé dans la base de données pour cette recherche.";
                }
            }

            // Préparer le prompt avec contexte
            const contextualPrompt = getSystemPrompt(userMessage.text + additionalContext);

            // Appel à l'API Gemini
            const botResponse = await run(contextualPrompt);

            // Message de réponse du bot
            const botMessage = {
                id: Date.now() + 1,
                text: botResponse,
                isBot: true,
                timestamp: new Date(),
                type: 'bot'
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('Erreur Gemini:', error);

            // Message d'erreur de fallback
            const errorMessage = {
                id: Date.now() + 1,
                text: "Désolé, je rencontre des difficultés techniques. Veuillez contacter directement la bibliothécaire ou réessayer dans quelques instants.",
                isBot: true,
                timestamp: new Date(),
                type: 'error'
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    };

    // Search functions
    const searchBooks = async (queryText) => {
        // This is a simplified search. In a real app, use structured queries or Algolia.
        // For now, we fetch a subset and filter locally or use simple constraints if possible.
        // Since firestore filtering is limited without indexes, we'll do a basic check here or just tell the AI we don't have full search capability yet if too complex.
        // Let's assume we can pass some context about "available categories" at least.
        return [];
        // TODO: Implement actual firebase query if needed, but for now passing context to AI is key.
        // Actually, let's try to fetch some books if the query is specific.
    };

    const searchTheses = async (queryText) => {
        return [];
    };

    // Formater l'heure
    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Composant Message
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
                    <Text style={[
                        styles.messageText,
                        isBot ? styles.botMessageText : styles.userMessageText,
                        isError && styles.errorMessageText
                    ]}>
                        {message.text}
                    </Text>

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

    // Indicateur de frappe
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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
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
                automaticallyAdjustKeyboardInsets
            >
                {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                ))}

                {isTyping && <TypingIndicator />}
            </ScrollView>

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
});

export default ChatBot;