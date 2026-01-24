import { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { translations } from '../utils/translations';

export const useTranslation = () => {
    const { datUser } = useContext(UserContext);

    // Default to 'Français' if language is not set or not supported
    // Since datUser can be null initially, we default to French
    const currentLanguage = datUser?.language && translations[datUser.language]
        ? datUser.language
        : 'Français';

    const t = (key, params = {}) => {
        const langData = translations[currentLanguage];
        let translation = (langData && langData[key]) ? langData[key] : key;

        if (params) {
            Object.keys(params).forEach(param => {
                translation = translation.replace(`{{${param}}}`, params[param]);
            });
        }
        return translation;
    };

    return { t, currentLanguage };
};
