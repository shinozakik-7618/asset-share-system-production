let assetId = null;
let assetData = null;

// URLからIDを取得
const urlParams = new URLSearchParams(window.location.search);
assetId = urlParams.get('id');

if (!assetId) {
  alert('資産IDが指定されていません');
  window.location.href = '/my-items.html';
}

// 認証状態の監視
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    loadAsset();
  } else {
    window.location.href = '/index.html';
  }
});

// 資産データを読み込む
async function loadAsset() {
  const loading = document.getElementById('loading');
  const editForm = document.getElementById('editForm');
  
  try {
    const doc = await firebase.firestore()
      .collection('assets')
      .doc(assetId)
      .get();
    
    if (!doc.exists) {
      alert('資産が見つかりません');
      window.location.href = '/my-items.html';
      return;
    }
    
    assetData = doc.data();
    
    // 自分の資産かチェック
    if (assetData.userId !== currentUser.uid) {
      alert('この資産を編集する権限がありません');
      window.location.href = '/my-items.html';
      return;
    }
    
    // フォームに値をセット
    document.getElementById('assetName').value = assetData.assetName || '';
    document.getElementById('memo').value = assetData.memo || '';
    document.getElementById('width').value = assetData.width || '';
    document.getElementById('depth').value = assetData.depth || '';
    document.getElementById('height').value = assetData.height || '';
    document.getElementById('quantity').value = assetData.quantity || 1;
    
    // 画像を表示
    const currentImages = document.getElementById('currentImages');
    if (assetData.images && assetData.images.length > 0) {
      currentImages.innerHTML = assetData.images.map(url => 
        `<img src="${url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">`
      ).join('');
    } else {
      currentImages.innerHTML = '<p style="color: #999;">画像なし</p>';
    }
    
    loading.style.display = 'none';
    editForm.style.display = 'block';
    
  } catch (error) {
    console.error('資産読み込みエラー:', error);
    alert('エラーが発生しました');
    window.location.href = '/my-items.html';
  }
}

// フォーム送信
document.addEventListener('DOMContentLoaded', () => {
  const editForm = document.getElementById('editForm');
  
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!confirm('この内容で保存しますか?')) {
      return;
    }
    
    const submitBtn = editForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '保存中...';
    
    try {
      const updateData = {
        assetName: document.getElementById('assetName').value.trim(),
        memo: document.getElementById('memo').value.trim(),
        width: document.getElementById('width').value || null,
        depth: document.getElementById('depth').value || null,
        quantity: parseInt(document.getElementById('quantity').value) || 1,
        height: document.getElementById('height').value || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await firebase.firestore()
        .collection('assets')
        .doc(assetId)
        .update(updateData);
      
      // 履歴記録
      await recordAssetHistory(assetId, 'edited', {
        '更新内容': '資産情報を編集'
      });

      alert('保存しました');
      window.location.href = '/my-items.html';
      
    } catch (error) {
      console.error('保存エラー:', error);
      alert('エラーが発生しました');
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 保存する';
    }
  });
});
