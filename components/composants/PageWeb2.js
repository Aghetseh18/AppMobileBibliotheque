import { View, Text, SafeAreaView, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import WebView from 'react-native-webview'
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Dimensions.get('window').height;

const PageWeb2 = () => {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const webviewRef = React.useRef(null);

    const webViewgoback = () => {
        if (webviewRef.current) webviewRef.current.goBack();
    };

    const handleNavigationStateChange = (navState) => {
        setIsLoading(navState.loading);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.browserBackButton}
                    onPress={webViewgoback}
                >
                    <Ionicons name="chevron-back" size={24} color="#007AFF" />
                </TouchableOpacity>

                <View style={styles.headerTitle}>
                    <Text style={styles.headerText}></Text>
                </View>
            </View>

            <View style={styles.webViewContainer}>
                <WebView
                    ref={webviewRef}
                    source={{ uri: "https://www.google.cm" }}
                    startInLoadingState={true}
                    onNavigationStateChange={handleNavigationStateChange}
                    renderLoading={() => (
                        <ActivityIndicator
                            style={styles.loader}
                            size="large"
                            color="#007AFF"
                        />
                    )}
                />
                {isLoading && (
                    <ActivityIndicator
                        style={styles.loader}
                        size="large"
                        color="#007AFF"
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#fff'
    },
    backButton: {
        padding: 8,
        marginRight: 8
    },
    browserBackButton: {
        padding: 8,
        marginRight: 8
    },
    headerTitle: {
        flex: 1,
        alignItems: 'center'
    },
    headerText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000'
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: '#fff'
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)'
    }
});

export default PageWeb2;