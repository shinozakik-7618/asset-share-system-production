// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyDk3cBLq7K4y61Nt0MeniXaEmfMWmLTOp0",
  authDomain: "asset-sharing-production.firebaseapp.com",
  projectId: "asset-sharing-production",
  storageBucket: "asset-sharing-production.firebasestorage.app",
  messagingSenderId: "847203193870",
  appId: "1:847203193870:web:27b59b3f3bc27e18a0d85f"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Google 認証プロバイダー
const googleProvider = new firebase.auth.GoogleAuthProvider();
