// 認証関連の処理

let currentUser = null;

// ログイン状態の監視
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  
  if (user) {
    console.log('ログイン成功:', user.email);
    
    // ログインページから来た場合
    if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
      
      // ユーザー情報を確認（拠点設定済みか？）
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // 拠点未設定の場合は設定画面へ
        if (!userData || !userData.baseId) {
          console.log('拠点未設定のため設定画面へ');
          window.location.href = '/user-register.html';
          return;
        }
        
        // 拠点設定済みの場合はホームへ
        window.location.href = '/home.html';
        return;
        
      } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        // エラーの場合もホームへ（フォールバック）
        window.location.href = '/home.html';
        return;
      }
    }
    
    // Firestore保存（updateで既存フィールドを保持）
    db.collection('users').doc(user.uid).update({
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
      // 新規ユーザーの場合はset
      console.log('新規ユーザー登録');
      db.collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    
  } else {
    console.log('未ログイン');
    // ログインページ以外でログインしていない場合はログインページへ
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
      window.location.href = '/index.html';
    }
  }
});

// Googleログイン
async function signInWithGoogle() {
  try {
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    console.error('ログインエラー:', error);
    alert('ログインに失敗しました: ' + error.message);
  }
}

// ログアウト
async function signOut() {
  try {
    await auth.signOut();
    console.log('ログアウト成功');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('ログアウトエラー:', error);
    alert('ログアウトに失敗しました');
  }
}
