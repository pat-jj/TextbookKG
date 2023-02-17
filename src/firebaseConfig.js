import { initializeApp } from "firebase/app";

// Initialize Firebase
const fireBase = initializeApp ({
    apiKey: "AIzaSyChKqczAd9Pz4riRN2-PhqvecPZTkMzqZk",
    authDomain: "textbookkg-2f3f1.firebaseapp.com",
    projectId: "textbookkg-2f3f1",
    storageBucket: "textbookkg-2f3f1.appspot.com",
    messagingSenderId: "497566497653",
    appId: "1:497566497653:web:291fa01d4003a303e0f13c",
    measurementId: "G-04T0HFLP4K"
});

// Firebase storage reference
// const storage = getStorage(app);
export default fireBase;