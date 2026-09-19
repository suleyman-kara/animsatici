import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA3BdH6GY-jGMcwwgaXKvPzbxqFeg1wwcE",
  authDomain: "kampus-radar.firebaseapp.com",
  projectId: "kampus-radar",
  storageBucket: "kampus-radar.firebasestorage.app",
  messagingSenderId: "51805689450",
  appId: "1:51805689450:web:51761f4185675e9a10dc13",
  measurementId: "G-7XF4452JWQ"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google ile Giriş Yap (Popup)
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Giriş Hatası:', error);
    throw error;
  }
}

// Çıkış Yap
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Çıkış Hatası:', error);
    throw error;
  }
}

// Oturum durumu dinleyicisi
export { onAuthStateChanged };
