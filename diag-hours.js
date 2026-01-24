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

async function checkStructure() {
    try {
        const ref = doc(db, 'Configuration', 'OrgSettings');
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            console.log("OPENING_HOURS_TYPE:", typeof data.OpeningHours);
            console.log("OPENING_HOURS_VALUE:", JSON.stringify(data.OpeningHours));
        } else {
            console.log("DOC_NOT_FOUND");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

checkStructure();
