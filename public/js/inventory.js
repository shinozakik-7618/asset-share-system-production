// 棚卸機能

let inventoryUser = null;
let userReady = false;
let inventoryData = {
  startTime: null,
  baseId: null,
  baseName: null,
  assets: new Map(),
  scannedAssets: new Set()
};

let html5QrCode = null;

// 初期化
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = '/index.html';
    return;
  }
  
  inventoryUser = user;
  
  // ユーザー情報を取得
  try {
    const userDocRef = firebase.firestore().collection('users').doc(user.uid);
    await userDocRef.get(); // キャッシュをクリア
    const userDoc = await userDocRef.get({ source: 'server' });
    if (!userDoc.exists) {
      console.error('ユーザー情報が見つかりません');
      alert('ユーザー情報が登録されていません。設定画面で登録してください。');
      return;
    }
    
    const userData = userDoc.data();
    console.log('取得したユーザー情報:', JSON.stringify(userData));
    
    inventoryData.baseId = userData.baseId;
    inventoryData.baseName = userData.baseName;
    console.log('baseId設定:', inventoryData.baseId);
    console.log('baseName設定:', inventoryData.baseName);
    inventoryData.baseId = userData.baseId;
    inventoryData.baseName = userData.baseName;
    console.log('baseId設定:', inventoryData.baseId);
    console.log('baseName設定:', inventoryData.baseName);
    
    userReady = true;
    
    console.log('棚卸準備完了:', inventoryData.baseName, '(baseId:', inventoryData.baseId, ')');
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    alert('ユーザー情報の取得に失敗しました');
  }
});

// 棚卸開始
document.getElementById('startInventoryBtn').addEventListener('click', async () => {
  if (!userReady) {
    alert('ユーザー情報を読み込み中です。もう一度お試しください。');
    return;
  }
  
  if (!inventoryData.baseId) {
    alert('拠点情報が取得できません。設定画面で拠点を登録してください。');
    return;
  }
  
  try {
    inventoryData.startTime = new Date();
    inventoryData.assets.clear();
    inventoryData.scannedAssets.clear();
    
    console.log('資産を取得中... baseId:', inventoryData.baseId);
    
    // 自分の拠点の資産を取得
    const snapshot = await firebase.firestore()
      .collection('assets')
      .where('ownerBaseId', '==', inventoryData.baseId)
      .get();
    
    snapshot.forEach(doc => {
      const asset = doc.data();
      inventoryData.assets.set(doc.id, {
        id: doc.id,
        asset: asset,
        systemQty: asset.quantity || 1,
        scannedQty: 0,
        finalQty: null
      });
    });
    
    console.log('資産取得完了:', inventoryData.assets.size, '件');
    
    if (inventoryData.assets.size === 0) {
      alert('この拠点には登録された資産がありません。');
      return;
    }
    
    // QRスキャナー起動
    document.getElementById('inventoryStart').style.display = 'none';
    document.getElementById('scannerSection').style.display = 'block';
    
    startQRScanner();
    
  } catch (error) {
    console.error('棚卸開始エラー:', error);
    alert('棚卸の開始に失敗しました: ' + error.message);
  }
});

// QRスキャナー起動
function startQRScanner() {
  html5QrCode = new Html5Qrcode("qrReader");
  
  html5QrCode.start(
    { facingMode: "environment" },
    {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    },
    (decodedText) => {
      handleQRScan(decodedText);
    },
    (errorMessage) => {
      // エラーは無視
    }
  ).catch(err => {
    console.error('QRスキャナー起動エラー:', err);
    alert('カメラの起動に失敗しました: ' + err.message);
  });
}

// QRコードスキャン処理
function handleQRScan(assetId) {
  if (inventoryData.scannedAssets.has(assetId)) {
    return;
  }
  
  const item = inventoryData.assets.get(assetId);
  
  if (!item) {
    console.log('未登録の資産:', assetId);
    return;
  }
  
  item.scannedQty++;
  inventoryData.scannedAssets.add(assetId);
  
  document.getElementById('scannedCount').textContent = inventoryData.scannedAssets.size;
  
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
  
  console.log('スキャン:', item.asset.assetName, '(', item.scannedQty, '/', item.systemQty, ')');
}

// 1次カウント完了
document.getElementById('finishScanBtn').addEventListener('click', async () => {
  try {
    if (html5QrCode) {
      await html5QrCode.stop();
      html5QrCode = null;
    }
    
    document.getElementById('scannerSection').style.display = 'none';
    document.getElementById('firstCountResult').style.display = 'block';
    
    displayFirstCountResult(true);
    
  } catch (error) {
    console.error('1次カウント完了エラー:', error);
  }
});

// 1次カウント結果表示
function displayFirstCountResult(hideMatched) {
  const listDiv = document.getElementById('firstCountList');
  listDiv.innerHTML = '';
  
  let hasDifference = false;
  
  inventoryData.assets.forEach((item) => {
    const diff = item.scannedQty - item.systemQty;
    
    if (hideMatched && diff === 0) {
      return;
    }
    
    if (diff !== 0) {
      hasDifference = true;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'inventory-item ' + (diff === 0 ? 'no-difference' : 'has-difference');
    
    itemDiv.innerHTML = `
      <div class="item-header">
        <div class="item-name">${item.asset.assetName}</div>
        <div class="item-badge ${diff === 0 ? 'badge-ok' : 'badge-diff'}">
          ${diff === 0 ? '✅ 一致' : '⚠️ 差異 ' + (diff > 0 ? '+' : '') + diff}
        </div>
      </div>
      <div class="item-details">
        <div class="detail-item">
          <div class="detail-label">システム数量</div>
          <div class="detail-value">${item.systemQty}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">スキャン数量</div>
          <div class="detail-value ${diff !== 0 ? 'diff' : ''}">${item.scannedQty}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">差異</div>
          <div class="detail-value ${diff !== 0 ? 'diff' : ''}">${diff > 0 ? '+' : ''}${diff}</div>
        </div>
      </div>
    `;
    
    listDiv.appendChild(itemDiv);
  });
  
  if (!hasDifference && hideMatched) {
    listDiv.innerHTML = '<p style="text-align: center; color: #4caf50; font-size: 18px; font-weight: 600;">🎉 すべての資産が一致しています！</p>';
  }
}

// 表示切り替え
document.getElementById('showAllBtn').addEventListener('click', () => {
  document.getElementById('showAllBtn').classList.add('active');
  document.getElementById('hideMatchBtn').classList.remove('active');
  displayFirstCountResult(false);
});

document.getElementById('hideMatchBtn').addEventListener('click', () => {
  document.getElementById('hideMatchBtn').classList.add('active');
  document.getElementById('showAllBtn').classList.remove('active');
  displayFirstCountResult(true);
});

// 2次カウント開始
document.getElementById('startSecondCountBtn').addEventListener('click', () => {
  document.getElementById('firstCountResult').style.display = 'none';
  document.getElementById('secondCountSection').style.display = 'block';
  
  displaySecondCountForm();
});

// 2次カウント入力フォーム表示
function displaySecondCountForm() {
  const listDiv = document.getElementById('secondCountList');
  listDiv.innerHTML = '';
  
  inventoryData.assets.forEach((item) => {
    const diff = item.scannedQty - item.systemQty;
    
    if (diff === 0) {
      return;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'inventory-item has-difference';
    
    itemDiv.innerHTML = `
      <div class="item-header">
        <div class="item-name">${item.asset.assetName}</div>
        <div class="item-badge badge-diff">⚠️ 差異あり</div>
      </div>
      <div class="item-details">
        <div class="detail-item">
          <div class="detail-label">システム数量</div>
          <div class="detail-value">${item.systemQty}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">1次カウント</div>
          <div class="detail-value diff">${item.scannedQty}</div>
        </div>
      </div>
      <div class="count-input">
        <label>2次カウント数量:</label>
        <input type="number" id="input-${item.id}" min="0" value="${item.scannedQty}">
        <button onclick="updateSecondCount('${item.id}')">✅ 確定</button>
      </div>
    `;
    
    listDiv.appendChild(itemDiv);
  });
}

// 2次カウント数量更新
function updateSecondCount(assetId) {
  const input = document.getElementById('input-' + assetId);
  const value = parseInt(input.value) || 0;
  
  const item = inventoryData.assets.get(assetId);
  item.finalQty = value;
  
  input.style.background = '#e8f5e9';
  input.disabled = true;
  
  console.log('2次カウント確定:', item.asset.assetName, value);
}

// 2次カウント完了
document.getElementById('finishSecondCountBtn').addEventListener('click', () => {
  inventoryData.assets.forEach((item) => {
    if (item.finalQty === null) {
      item.finalQty = item.scannedQty;
    }
  });
  
  document.getElementById('secondCountSection').style.display = 'none';
  document.getElementById('finalResult').style.display = 'block';
  
  displayFinalResult();
});

// 最終結果表示
function displayFinalResult() {
  const listDiv = document.getElementById('finalResultList');
  listDiv.innerHTML = '';
  
  inventoryData.assets.forEach((item) => {
    const finalDiff = item.finalQty - item.systemQty;
    
    if (finalDiff === 0) {
      return;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'inventory-item has-difference';
    
    itemDiv.innerHTML = `
      <div class="item-header">
        <div class="item-name">${item.asset.assetName}</div>
        <div class="item-badge badge-diff">⚠️ 最終差異 ${finalDiff > 0 ? '+' : ''}${finalDiff}</div>
      </div>
      <div class="item-details">
        <div class="detail-item">
          <div class="detail-label">システム数量</div>
          <div class="detail-value">${item.systemQty}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">最終カウント</div>
          <div class="detail-value diff">${item.finalQty}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">最終差異</div>
          <div class="detail-value diff">${finalDiff > 0 ? '+' : ''}${finalDiff}</div>
        </div>
      </div>
    `;
    
    listDiv.appendChild(itemDiv);
  });
  
  if (listDiv.children.length === 0) {
    listDiv.innerHTML = '<p style="text-align: center; color: #4caf50; font-size: 18px; font-weight: 600;">🎉 すべての資産が一致しています！</p>';
  }
}

// 棚卸確定
document.getElementById('confirmInventoryBtn').addEventListener('click', async () => {
  try {
    const batch = firebase.firestore().batch();
    
    inventoryData.assets.forEach((item) => {
      const finalDiff = item.finalQty - item.systemQty;
      
      if (finalDiff !== 0) {
        const assetRef = firebase.firestore().collection('assets').doc(item.id);
        batch.update(assetRef, {
          quantity: item.finalQty,
          lastInventoryAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastInventoryDiff: finalDiff
        });
        
        const historyRef = firebase.firestore().collection('inventoryHistory').doc();
        batch.set(historyRef, {
          assetId: item.id,
          assetName: item.asset.assetName,
          baseId: inventoryData.baseId,
          baseName: inventoryData.baseName,
          systemQty: item.systemQty,
          scannedQty: item.scannedQty,
          finalQty: item.finalQty,
          difference: finalDiff,
          inventoryDate: firebase.firestore.FieldValue.serverTimestamp(),
          userId: inventoryUser.uid,
          userEmail: inventoryUser.email
        });
      }
    });
    
    await batch.commit();
    
    console.log('棚卸確定完了');
    
    document.getElementById('finalResult').style.display = 'none';
    document.getElementById('completeSection').style.display = 'block';
    
  } catch (error) {
    console.error('棚卸確定エラー:', error);
    alert('棚卸の確定に失敗しました: ' + error.message);
  }
});
