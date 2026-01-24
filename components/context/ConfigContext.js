import React, { createContext, useContext, useEffect, useState } from 'react';
import { configService } from '../services/configService';

const ConfigContext = createContext(undefined);

export const ConfigProvider = ({ children }) => {
    const [orgSettings, setOrgSettings] = useState(null);
    const [appSettings, setAppSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Test de connexion Firebase d'abord
            const isConnected = await configService.testFirebaseConnection();
            if (!isConnected) {
                // Warning only, continue to try fetching fallback
                console.warn('Difficulté de connexion à Firebase détectée');
            }

            const [orgData, appData] = await Promise.all([
                configService.getOrgSettings(),
                configService.getAppSettings()
            ]);

            setOrgSettings(orgData);
            setAppSettings(appData);

            // Vérifier si les données viennent vraiment de Firebase
            if (orgData.Name === 'BiblioENSPY' && !orgData.Logo) {
                // setError('Utilisation des paramètres par défaut.');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
            setError(`Erreur de configuration: ${errorMessage}`);

            // Charger les paramètres par défaut en cas d'erreur
            try {
                const [orgData, appData] = await Promise.all([
                    configService.getOrgSettings(),
                    configService.getAppSettings()
                ]);
                setOrgSettings(orgData);
                setAppSettings(appData);
            } catch (fallbackError) {
                console.error('❌ Even fallback failed:', fallbackError);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        return await configService.testFirebaseConnection();
    };

    const refetch = async () => {
        configService.invalidateCache();
        await fetchSettings();
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <ConfigContext.Provider value={{
            orgSettings,
            appSettings,
            isLoading,
            error,
            refetch,
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
