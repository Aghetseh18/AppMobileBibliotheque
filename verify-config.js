import { configService } from './components/services/configService';

async function runTest() {
    console.log("--- Starting ConfigService Test ---");

    const isFirebaseConnected = await configService.testFirebaseConnection();
    console.log("Firebase initialized:", isFirebaseConnected);

    if (isFirebaseConnected) {
        console.log("Fetching OrgSettings...");
        const orgSettings = await configService.getOrgSettings();
        console.log("OrgSettings result:", JSON.stringify(orgSettings, null, 2));

        console.log("\nFetching AppSettings...");
        const appSettings = await configService.getAppSettings();
        console.log("AppSettings result:", JSON.stringify(appSettings, null, 2));
    } else {
        console.error("Firebase is not initialized correctly.");
    }

    console.log("--- Test Finished ---");
}

// In a real app environment, this would be called in a component
// For this verification, we are outlining the test approach.
runTest();
