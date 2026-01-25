import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useOrgLogo from '../hooks/useOrgLogo';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const LandingPage = ({ navigation }) => {
    const { logoUrl } = useOrgLogo();

    // Animations
    const fadeAnim = new Animated.Value(0);
    const slideAnim = new Animated.Value(50);

    useEffect(() => {
        // Démarrer l'animation après le chargement du composant
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            })
        ]).start();

        // Navigation automatique après un délai (optionnel)
        // setTimeout(() => navigation.navigate('InitialScreen'), 3000);
    }, []);

    const handleGetStarted = () => {
        navigation.navigate('InitialScreen');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
                style={styles.background}
            />

            <View style={styles.contentContainer}>
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Image
                        source={logoUrl ? { uri: logoUrl } : require('../../assets/enspy.jpg')}
                        style={styles.logo}
                        resizeMode="contain"
                    />

                    <Animated.Text
                        style={[
                            styles.title,
                            { opacity: fadeAnim }
                        ]}
                    >
                        Bibliothèque ENSPY
                    </Animated.Text>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.featuresContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>📚</Text>
                        <Text style={styles.featureText}>Accédez à des milliers de ressources académiques</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>🔍</Text>
                        <Text style={styles.featureText}>Recherche avancée par catégorie et auteur</Text>
                    </View>

                    <View style={styles.featureItem}>
                        <Text style={styles.featureIcon}>📱</Text>
                        <Text style={styles.featureText}>Interface intuitive et moderne</Text>
                    </View>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.buttonContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleGetStarted}
                    >
                        <Text style={styles.buttonText}>Commencer</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: WIDTH,
        height: HEIGHT,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    logo: {
        width: WIDTH * 0.4,
        height: HEIGHT * 0.15,
        borderRadius: 20,
        overflow: 'hidden',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 20,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    featuresContainer: {
        marginVertical: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        padding: 15,
        borderRadius: 12,
    },
    featureIcon: {
        fontSize: 24,
        marginRight: 15,
    },
    featureText: {
        color: 'white',
        fontSize: 16,
        flex: 1,
        fontWeight: '500',
    },
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    button: {
        width: WIDTH * 0.7,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    buttonText: {
        color: '#1a2a6c',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default LandingPage;
