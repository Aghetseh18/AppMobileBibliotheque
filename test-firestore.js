const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyC-7xG1TTllRRyMldk4mS7k_8BcjMTAWi8",
    authDomain: "biblio-cc84b.firebaseapp.com",
    projectId: "biblio-cc84b",
    storageBucket: "biblio-cc84b.firebasestorage.app",
    messagingSenderId: "823617403574",
    appId: "1:823617403574:web:e579c9bd1788f137c24417"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFetch() {
    console.log("Checking Firestore for Configuration/OrgSettings...");
    try {
        const ref = doc(db, 'Configuration', 'OrgSettings');
        const snap = await getDoc(ref);

        if (snap.exists()) {
            console.log("SUCCESS: Document retrieved!");
            console.log("Data:", JSON.stringify(snap.data(), null, 2));
        } else {
            console.log("NOTICE: Document does not exist in Firestore. The app will use hardcoded defaults.");
        }
    } catch (error) {
        console.error("ERROR: Failed to connect to Firestore:", error.message);
    }
    process.exit();
}

testFetch();
