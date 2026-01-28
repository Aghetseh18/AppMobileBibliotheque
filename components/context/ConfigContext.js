import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { configService } from '../services/configService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config';

const DEFAULT_THEME = {
    primary: '#FF6600',
    primaryLight: '#FF8533',
    secondary: '#2D3436',
    background: '#F8F9FA',
    accent: '#FF4757',
    surface: '#FFFFFF',
    text: {
        primary: '#2D3436',
        secondary: '#636E72',
        light: '#B2BEC3',
        white: '#FFFFFF',
        muted: '#9E9E9E'
    }
};

const ConfigContext = createContext(undefined);

export const ConfigProvider = ({ children }) => {
    const [orgSettings, setOrgSettings] = useState(null);
    const [appSettings, setAppSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const theme = useMemo(() => {
        const primary = orgSettings?.Theme?.Primary || DEFAULT_THEME.primary;
        const secondary = orgSettings?.Theme?.Secondary || DEFAULT_THEME.secondary;

        return {
            colors: {
                ...DEFAULT_THEME,
                primary,
                primaryLight: orgSettings?.Theme?.Primary ? orgSettings.Theme.Primary + 'CC' : DEFAULT_THEME.primaryLight,
                secondary,
                background: DEFAULT_THEME.background,
            }
        };
    }, [orgSettings]);

    const testConnection = async () => {
        return await configService.testFirebaseConnection();
    };

    useEffect(() => {
        setIsLoading(true);
        setError(null);

        const unsubscribeOrg = onSnapshot(doc(db, 'Configuration', 'OrgSettings'), (docSnapshot) => {
            if (docSnapshot.exists()) {
                console.log("OrgSettings updated:", docSnapshot.data());
                setOrgSettings(docSnapshot.data());
            } else {
                console.warn("OrgSettings document does not exist");
                setOrgSettings({});
            }
        }, (err) => {
            console.error("Real-time OrgSettings error:", err);
            setError(err.message);
        });

        const unsubscribeApp = onSnapshot(doc(db, 'Configuration', 'AppSettings'), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setAppSettings(docSnapshot.data());
            } else {
                setAppSettings({});
            }
            setIsLoading(false); // Consider loaded once we have at least one response (or both ideally)
        }, (err) => {
            console.error("Real-time AppSettings error:", err);
            // Don't necessarily block app if just this fails
        });

        return () => {
            unsubscribeOrg();
            unsubscribeApp();
        };
    }, []);

    return (
        <ConfigContext.Provider value={{
            orgSettings,
            appSettings,
            theme,
            isLoading,
            error,
            testConnection
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
