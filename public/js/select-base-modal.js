// 現在のユーザーデータを取得
async function getCurrentUserData() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return null;

  const doc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
  if (!doc.exists) return null;

  return doc.data();
}

// 拠点選択モーダル
async function showBaseSelectModal() {
  const userData = await getCurrentUserData();
  
  // すでに拠点が設定されている場合はスキップ
  if (userData && userData.baseId) {
    return true;
  }

  // 拠点一覧を取得
  const snapshot = await firebase.firestore().collection('baseMaster').get();
  
  if (snapshot.empty) {
    alert('拠点マスタが登録されていません。管理者に連絡してください。');
    return false;
  }

  const baseList = snapshot.docs.map((doc, i) => `${i+1}. ${doc.data().baseName}`).join('\n');
  const baseId = prompt('あなたの拠点を選択してください:\n\n' + baseList + '\n\n番号を入力してください:');

  if (!baseId) {
    alert('拠点が選択されていません。資産登録には拠点の設定が必要です。');
    return false;
  }

  const index = parseInt(baseId) - 1;
  const selectedDoc = snapshot.docs[index];
  
  if (!selectedDoc) {
    alert('無効な番号です');
    return false;
  }

  // Firestoreのユーザー情報を更新
  const currentUser = firebase.auth().currentUser;
  await firebase.firestore().collection('users').doc(currentUser.uid).update({
    baseId: selectedDoc.id,
    baseName: selectedDoc.data().baseName
  });

  alert(`拠点「${selectedDoc.data().baseName}」を設定しました`);
  return true;
}
