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
      console.log("資産データ:", asset);
      
      // 各フィールドにデータを設定
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
      
      // QRコード表示
      if (asset.qrCodeText) {
        const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(asset.qrCodeText)}`;
        const qrImage = document.getElementById('qrCodeImage');
        if (qrImage) {
          qrImage.src = qrCodeURL;
          qrImage.alt = 'QRコード';
          qrImage.style.display = 'block';
        }
      }
      
      // 資産画像表示
      if (asset.images && asset.images.length > 0) {
        const qrImage = document.getElementById('qrCodeImage');
        if (qrImage && !asset.qrCodeText) {
          qrImage.src = asset.images[0];
          qrImage.alt = asset.assetName || '資産画像';
        }
      }
    })
    .catch(error => {
      console.error('読み込みエラー:', error);
      alert('読み込みエラー: ' + error.message);
    });
}
