
// 認証状態の監視
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    loadMyItems();
  } else {
    window.location.href = '/index.html';
  }
});

// 自分の資産を読み込む
async function loadMyItems() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('content');
  const itemsList = document.getElementById('itemsList');
  const noItems = document.getElementById('noItems');
  
  try {
    const snapshot = await firebase.firestore()
      .collection('assets')
      .where('userId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    loading.style.display = 'none';
    content.style.display = 'block';
    
    if (snapshot.empty) {
      noItems.style.display = 'block';
      return;
    }
    
    itemsList.innerHTML = '';
    snapshot.forEach(doc => {
      const asset = doc.data();
      asset.id = doc.id;
      itemsList.appendChild(createAssetCard(asset));
    });
    
  } catch (error) {
    console.error('資産読み込みエラー:', error);
    loading.innerHTML = '<p style="color: red;">エラーが発生しました</p>';
  }
}

// 資産カードを作成
function createAssetCard(asset) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '1rem';
  
  const statusText = asset.status === 'available' ? '✅ 出品中' : '⏸️ 非公開';
  const statusColor = asset.status === 'available' ? '#4caf50' : '#999';
  
  card.innerHTML = `
    <div style="display: flex; gap: 1rem;">
      ${asset.images && asset.images.length > 0 ? 
        `<img src="${asset.images[0]}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">` : 
        '<div style="width: 100px; height: 100px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center;">📦</div>'
      }
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1.1rem;">${asset.assetName || '名称未設定'}</h3>
          <span style="color: ${statusColor}; font-size: 0.9rem; white-space: nowrap;">${statusText}</span>
        </div>
        <p style="color: #666; margin: 0.25rem 0; font-size: 0.9rem;">
          ${asset.largeCategoryName || ''} > ${asset.mediumCategoryName || ''}
        </p>
        <p style="color: #999; margin: 0.25rem 0; font-size: 0.85rem;">
          登録日: ${asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('ja-JP') : '不明'}
        </p>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
          <button onclick="editAsset('${asset.id}')" class="btn btn-primary" style="flex: 1; padding: 0.5rem;">編集</button>
          <button onclick="transferAsset('${asset.id}')" class="btn btn-secondary" style="flex: 1; padding: 0.5rem;">譲渡</button>
          ${!asset.forTransfer ? `<button onclick="publishForTransfer('${asset.id}'); event.stopPropagation();" class="btn" style="flex: 1; padding: 0.5rem; background: #4caf50; color: white;">譲渡資産として公開</button>` : `<span style="flex: 1; padding: 0.5rem; background: #e8f5e9; color: #2e7d32; text-align: center; border-radius: 4px; font-size: 13px;">✓ 公開中</span>`}
          ${asset.qrCodeText ? `<button onclick="showQRCode('${asset.id}', '${asset.assetName}', '${asset.qrCodeText}'); event.stopPropagation();" class="btn" style="flex: 1; padding: 0.5rem; background: #2196f3; color: white;">📱 QRコード</button>` : ""}
          <button onclick="toggleStatus('${asset.id}', '${asset.status}')" class="btn" style="flex: 1; padding: 0.5rem;">
            ${asset.status === 'available' ? '非公開にする' : '公開する'}
          </button>
          <button onclick="deleteAsset('${asset.id}', '${asset.assetName || ''}', ${JSON.stringify(asset.images || []).replace(/"/g, '&quot;')})" class="btn" style="flex: 1; padding: 0.5rem; background: #f44336; color: white;">削除</button>
        </div>
      </div>
    </div>
  `;
  
  return card;
}

// 資産を編集
function editAsset(assetId) {
  window.location.href = `/asset-edit.html?id=${assetId}`;
}

// ステータスを切り替え
async function toggleStatus(assetId, currentStatus) {
  const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
  const statusText = newStatus === 'available' ? '公開' : '非公開';
  
  if (!confirm(`この資産を${statusText}にしますか?`)) {
    return;
  }
  
  try {
    await firebase.firestore()
      .collection('assets')
      .doc(assetId)
      .update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    
    alert(`${statusText}にしました`);
    loadMyItems();
    
  } catch (error) {
    console.error('ステータス更新エラー:', error);
    alert('エラーが発生しました');
  }
}

// 資産を削除
async function deleteAsset(assetId, assetName, images) {
  if (!confirm(`「${assetName}」を削除しますか?\nこの操作は取り消せません。`)) {
    return;
  }
  
  try {
    // Storageから画像を削除
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        try {
          const imageRef = firebase.storage().refFromURL(imageUrl);
          await imageRef.delete();
        } catch (err) {
          console.warn('画像削除エラー:', err);
        }
      }
    }
    
    // Firestoreから削除
    await firebase.firestore()
      .collection('assets')
      .doc(assetId)
      .delete();
    
    alert('削除しました');
    loadMyItems();
    
  } catch (error) {
    console.error('削除エラー:', error);
    alert('エラーが発生しました');
  }
}

function showQRCode(assetId, assetName, qrCodeText) {
  const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeText)}`;
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;';
  
  modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; max-width: 400px;">
      <h2 style="margin-bottom: 20px; color: #333;">${assetName}</h2>
      <img src="${qrCodeURL}" style="width: 300px; height: 300px; border: 1px solid #ddd; border-radius: 8px;">
      <div style="margin-top: 20px; display: flex; gap: 10px;">
        <button onclick="printQRCodeFromURL('${qrCodeURL}', '${assetName}')" class="btn" style="flex: 1; background: #1976d2; color: white; padding: 12px;">🖨️ 印刷</button>
        <button onclick="this.closest('div').parentElement.remove()" class="btn" style="flex: 1; background: #666; color: white; padding: 12px;">閉じる</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function printQRCodeFromURL(qrCodeURL, assetName) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>QRコード - ${assetName}</title>
        <style>
          body { text-align: center; padding: 20px; font-family: sans-serif; }
          h1 { margin-bottom: 20px; }
          img { width: 300px; height: 300px; }
        </style>
      </head>
      <body>
        <h1>${assetName}</h1>
        <img src="${qrCodeURL}">
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// 譲渡申請画面へ遷移
function transferAsset(assetId) {
  window.location.href = `/transfer-request.html?id=${assetId}`;
}

// 譲渡資産として公開
async function publishForTransfer(assetId) {
  if (!confirm('この資産を譲渡資産として公開しますか？\n他の拠点から譲渡申請が来るようになります。')) {
    return;
  }

  try {
    await firebase.firestore().collection('assets').doc(assetId).update({
      forTransfer: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('譲渡資産として公開しました！');
    loadMyItems();

  } catch (error) {
    console.error('公開エラー:', error);
    alert('公開に失敗しました: ' + error.message);
  }
}
