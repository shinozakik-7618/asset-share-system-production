// 資産詳細表示
let assetId = new URLSearchParams(window.location.search).get('id');

if (!assetId) {
  alert('資産IDが指定されていません');
  window.location.href = '/my-items.html';
} else {
  // Firebaseから資産情報を取得
  firebase.firestore().collection('assets').doc(assetId).get()
    .then(doc => {
      if (!doc.exists) {
        alert('資産が見つかりません');
        window.location.href = '/my-items.html';
        return;
      }
      
      const asset = doc.data();
      
      // 各フィールドにデータを設定（正しいID名を使用）
      document.getElementById('itemName').textContent = asset.assetName || '-';
      document.getElementById('largeCategory').textContent = asset.largeCategoryName || '-';
      document.getElementById('mediumCategory').textContent = asset.mediumCategoryName || '-';
      document.getElementById('quantity').textContent = asset.quantity || '-';
      document.getElementById('ownerName').textContent = asset.userEmail || '-';
      document.getElementById('ownerBase').textContent = asset.baseName || '-';
      document.getElementById('ownerRegion').textContent = asset.region || '-';
      document.getElementById('ownerBlock').textContent = asset.block || '-';
      
      if (asset.createdAt) {
        const date = asset.createdAt.toDate();
        document.getElementById('createdAt').textContent = date.toLocaleDateString('ja-JP');
      }
      
      // 画像表示
      if (asset.images && asset.images.length > 0) {
        const imgElements = document.querySelectorAll('.qr-placeholder img');
        imgElements.forEach(img => {
          img.src = asset.images[0];
          img.alt = asset.assetName || '資産画像';
        });
      }
    })
    .catch(error => {
      console.error('読み込みエラー:', error);
      alert('読み込みエラー: ' + error.message);
    });
}
