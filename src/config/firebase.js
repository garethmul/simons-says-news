// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDXkY916r_0rPD7MqTvhs6H_exOVus4yBE",
  authDomain: "christian-360.firebaseapp.com",
  projectId: "christian-360",
  storageBucket: "christian-360.firebasestorage.app",
  messagingSenderId: "930159352432",
  appId: "1:930159352432:web:0c8afbe41551accf76f2b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 