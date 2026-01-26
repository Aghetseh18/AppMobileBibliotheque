import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let unsubscribeSnapshot;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);

            if (user) {
                try {
                    // Resolve the correct user document (Email first, then UID fallback)
                    let userDocRef = doc(db, 'BiblioUser', user.email);
                    let userDocSnap = await getDoc(userDocRef);

                    if (!userDocSnap.exists()) {
                        userDocRef = doc(db, 'BiblioUser', user.uid);
                        userDocSnap = await getDoc(userDocRef);
                    }

                    if (userDocSnap.exists()) {
                        // Setup real-time listener for user data using the resolved reference
                        unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
                            if (snapshot.exists()) {
                                const biblioUser = { ...snapshot.data(), id: user.uid };

                                // ⭐ CHECK IF USER IS BLOCKED
                                if (biblioUser.etat === 'bloc') {
                                    console.warn('⚠️ User is blocked, forcing logout and redirection');

                                    // In React Native, we use AsyncStorage instead of localStorage
                                    const blockData = {
                                        isBlocked: true,
                                        reason: biblioUser.blockedReason || 'Violation des règles de la bibliothèque',
                                        blockedAt: biblioUser.blockedAt && biblioUser.blockedAt.toDate
                                            ? biblioUser.blockedAt.toDate().toISOString()
                                            : biblioUser.blockedAt
                                    };

                                    AsyncStorage.setItem('userBlockStatus', JSON.stringify(blockData));

                                    setCurrentUser(null);
                                    firebaseSignOut(auth);
                                    return;
                                }

                                setCurrentUser(biblioUser);
                                AsyncStorage.removeItem('userBlockStatus');
                            } else {
                                setCurrentUser(null);
                            }
                        }, (err) => {
                            console.error('Firestore snapshot error:', err);
                        });
                    } else {
                        console.warn('❌ User document not found in BiblioUser collection');
                        setCurrentUser(null);
                    }

                } catch (err) {
                    console.error('Error loading user data:', err);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = undefined;
                }
            }

            setIsLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const signIn = async (email, password) => {
        try {
            setIsLoading(true);
            setError(null);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user data immediately to check for block status
            let userDocRef = doc(db, 'BiblioUser', email);
            let userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                userDocRef = doc(db, 'BiblioUser', user.uid);
                userDocSnap = await getDoc(userDocRef);
            }

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                // ⭐ IMMEDIATELY CHECK IF USER IS BLOCKED AFTER LOGIN
                if (userData.etat === 'bloc') {
                    // Log out immediately
                    await firebaseSignOut(auth);
                    setCurrentUser(null);

                    const blockReason = userData.blockedReason || 'Violation des règles de la bibliothèque';

                    const blockData = {
                        isBlocked: true,
                        reason: blockReason,
                        blockedAt: userData.blockedAt && userData.blockedAt.toDate
                            ? userData.blockedAt.toDate().toISOString()
                            : userData.blockedAt
                    };

                    await AsyncStorage.setItem('userBlockStatus', JSON.stringify(blockData));

                    throw new Error(`Votre compte est bloqué. Raison: ${blockReason}`);
                }

                // Use generic success matching structure if needed elsewhere, 
                // but here we just rely on state updates
                await AsyncStorage.removeItem('userBlockStatus');
            }

        } catch (err) {
            console.error("Login Error:", err);
            // If it's a blocking error, keep the error message
            if (err.message && err.message.includes('bloqué')) {
                setError(err.message);
            } else {
                // For other errors, use generic message
                setError(err.message || 'Erreur de connexion');
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (email, password, additionalData = {}) => {
        try {
            setIsLoading(true);
            setError(null);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document
            // Note: Depending on your app logic, you might want to create the doc here
            // For now, we assume the user creation is handled, or we minimally create it
            // if it doesn't exist, similar to your legacy logic if needed.
            // But typically signUp just creates Auth user.

            return user;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setIsLoading(true);
            await firebaseSignOut(auth);
            setCurrentUser(null);
            await AsyncStorage.removeItem('userBlockStatus');
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const updateProfile = async (data) => {
        try {
            // If we need to update Firebase Auth profile (displayName, photoURL)
            if (auth.currentUser) {
                await firebaseUpdateProfile(auth.currentUser, {
                    displayName: data.name || auth.currentUser.displayName,
                    photoURL: data.imageUri || auth.currentUser.photoURL
                });
            }

            // Update Firestore document
            if (currentUser && currentUser.email) {
                const userDocRef = doc(db, 'BiblioUser', currentUser.email);
                await updateDoc(userDocRef, data);
            }

            // Optimistic update
            if (currentUser) {
                setCurrentUser({ ...currentUser, ...data });
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                currentUser,
                firebaseUser,
                isLoading,
                error,
                signIn,
                signUp,
                signOut,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
