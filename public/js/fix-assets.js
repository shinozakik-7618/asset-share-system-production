// 資産のownerBaseId/ownerBaseNameを一括更新するスクリプト

async function fixAssets() {
  console.log('資産の修正を開始します...');
  
  try {
    // すべての資産を取得
    const assetsSnapshot = await firebase.firestore().collection('assets').get();
    console.log('取得した資産数:', assetsSnapshot.size);
    
    const batch = firebase.firestore().batch();
    let count = 0;
    
    for (const doc of assetsSnapshot.docs) {
      const asset = doc.data();
      
      // ownerUserIdからユーザー情報を取得
      if (asset.userId) {
        const userDoc = await firebase.firestore().collection('users').doc(asset.userId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // ownerBaseIdとownerBaseNameを追加
          batch.update(doc.ref, {
            ownerBaseId: userData.baseId || '',
            ownerBaseName: userData.baseName || ''
          });
          
          count++;
          console.log(`${count}. ${asset.assetName} → ${userData.baseName} (${userData.baseId})`);
        } else {
          console.log('ユーザーが見つかりません:', asset.userId);
        }
      } else {
        console.log('ownerUserIdがありません:', doc.id);
      }
    }
    
    // 一括更新を実行
    await batch.commit();
    console.log('✅ 修正完了:', count, '件');
    alert('資産の修正が完了しました！ (' + count + '件)');
    
  } catch (error) {
    console.error('エラー:', error);
    alert('エラーが発生しました: ' + error.message);
  }
}

// 実行ボタンを追加
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.createElement('button');
  btn.textContent = '🔧 資産を修正';
  btn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; padding: 15px 30px; background: #ff9800; color: white; border: none; border-radius: 25px; font-size: 16px; font-weight: 600; cursor: pointer;';
  btn.onclick = fixAssets;
  document.body.appendChild(btn);
});
