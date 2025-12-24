// 現在のユーザーデータを取得
async function getCurrentUserData() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return null;

  const doc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
  if (!doc.exists) return null;

  return doc.data();
}

// 拠点選択モーダル（新しいウィンドウで開く）
async function showBaseSelectModal() {
  const userData = await getCurrentUserData();
  
  // すでに拠点が設定されている場合はスキップ
  if (userData && userData.baseId) {
    return true;
  }

  // 新しいウィンドウで拠点選択画面を開く
  const modalWindow = window.open('/select-base-modal.html', 'baseSelect', 'width=700,height=600');
  
  // ウィンドウが閉じられるまで待機
  return new Promise((resolve) => {
    const checkClosed = setInterval(() => {
      if (modalWindow.closed) {
        clearInterval(checkClosed);
        // 拠点が設定されたか再確認
        getCurrentUserData().then(data => {
          if (data && data.baseId) {
            resolve(true);
          } else {
            alert('拠点が選択されていません。資産登録には拠点の設定が必要です。');
            resolve(false);
          }
        });
      }
    }, 500);

    // メッセージ受信（拠点選択完了）
    window.addEventListener('message', (event) => {
      if (event.data.baseSelected) {
        clearInterval(checkClosed);
        resolve(true);
      }
    });
  });
}
