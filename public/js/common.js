// 共通関数

// 現在のユーザー情報を取得（認証情報から直接取得）
async function getCurrentUserData() {
  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        resolve(null);
        return;
      }

      try {
        // Firestoreから取得を試みる
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          resolve(userDoc.data());
        } else {
          // Firestoreにデータがない場合は認証情報から返す
          resolve({
            displayName: user.displayName || '篠崎 和也',
            email: user.email,
            baseName: '青山BASE',
            baseId: 'aoyama',
            blockName: 'センターブロック',
            regionName: '都心地域'
          });
        }
      } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        // エラー時も認証情報から返す
        resolve({
          displayName: user.displayName || '篠崎 和也',
          email: user.email,
          baseName: '青山BASE',
          baseId: 'aoyama',
          blockName: 'センターブロック',
          regionName: '都心地域'
        });
      }
    });
  });
}

// 日付をフォーマット
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('ja-JP');
}

// QRコード生成関数
function generateQRCode(text, size = 256) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

// 拠点設定チェック関数
