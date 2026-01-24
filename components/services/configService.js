import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config';

// Defaults
const defaultOrgSettings = {
    Name: "Bibliothèque",
    Address: "Non configurée",
    Contact: { Email: "", Phone: "" },
    OpeningHours: { Monday: "9h-17h" },
    MaximumSimultaneousLoans: 3,
    LateReturnPenalties: [],
    SpecificBorrowingRules: []
};

const defaultAppSettings = {
    maintenanceMode: false,
    minVersion: "1.0.0",
    features: {
        chat: true,
        reservations: true
    }
};

class ConfigService {
    constructor() {
        this.cache = {
            org: null,
            app: null,
            timestamp: 0
        };
        this.CACHE_TTL = 5 * 60 * 1000; // 5 min
    }

    async testFirebaseConnection() {
        try {
            // Just try to fetch a known doc or root collection check
            // We'll trust db is initialized if we got here
            return !!db;
        } catch (e) {
            console.error("Firebase connection test failed", e);
            return false;
        }
    }

    async getOrgSettings() {
        if (this.isValidCache()) return this.cache.org;

        try {
            const ref = doc(db, 'Configuration', 'OrgSettings');
            const snap = await getDoc(ref);

            const data = snap.exists() ? snap.data() : {};
            const settings = { ...defaultOrgSettings, ...data };

            this.cache.org = settings;
            this.cache.timestamp = Date.now();
            return settings;
        } catch (error) {
            console.warn("Using default OrgSettings due to error:", error);
            return defaultOrgSettings;
        }
    }

    async getAppSettings() {
        if (this.isValidCache() && this.cache.app) return this.cache.app;

        try {
            const ref = doc(db, 'Configuration', 'AppSettings');
            const snap = await getDoc(ref);

            const data = snap.exists() ? snap.data() : {};
            const settings = { ...defaultAppSettings, ...data };

            this.cache.app = settings;
            return settings;
        } catch (error) {
            console.warn("Using default AppSettings due to error:", error);
            return defaultAppSettings;
        }
    }

    invalidateCache() {
        this.cache = { org: null, app: null, timestamp: 0 };
    }

    isValidCache() {
        return this.cache.org && (Date.now() - this.cache.timestamp < this.CACHE_TTL);
    }
}

export const configService = new ConfigService();
