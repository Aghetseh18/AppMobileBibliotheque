import { View, Text, SafeAreaView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import WebView from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons';
import { useConfig } from '../context/ConfigContext';

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const PageWeb = (props) => {
    const { theme } = useConfig();
    const { chemin } = props.route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Corriger l'URL si nécessaire
    const getCorrectUrl = (url) => {
        // Si l'URL contient openclassrooms.org, la corriger
        if (url.includes('openclassrooms.org')) {
            return url.replace('openclassrooms.org', 'openclassrooms.com');
        }
        return url;
    };

    const correctUrl = getCorrectUrl(chemin);

    //la webview
    const webviewRef = React.useRef(null);
    function webViewgoback() {
        if (webviewRef.current) webviewRef.current.goBack();
    }

    const handleError = () => {
        setError('Impossible de charger la page. Veuillez vérifier votre connexion internet.');
        setIsLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContainer}>
                <View style={[styles.tabBarContainer, { backgroundColor: theme.colors.primary }]}>
                    <TouchableOpacity onPress={() => props.navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                            onPress={() => {
                                setError(null);
                                setIsLoading(true);
                                if (webviewRef.current) {
                                    webviewRef.current.reload();
                                }
                            }}
                        >
                            <Text style={styles.retryButtonText}>Réessayer</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <WebView
                        startInLoadingState={true}
                        ref={webviewRef}
                        source={{ uri: correctUrl }}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        onError={handleError}
                        style={styles.webview}
                    />
                )}

                {isLoading && !error && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                )}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainContainer: {
        backgroundColor: 'white',
        width: WIDTH,
        height: HEIGHT,
        flex: 1,
    },
    tabBarContainer: {
        backgroundColor: "#d3d3d3",
        height: 56,
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: 16,
        justifyContent: "space-between",
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#FF6600',
        padding: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
    }
})

export default PageWeb