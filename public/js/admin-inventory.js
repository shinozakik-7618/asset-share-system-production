// Firebase認証完了を待機
console.log('🔄 認証状態を確認中...');

let checkCount = 0;
const maxChecks = 10;

const authInterval = setInterval(() => {
  checkCount++;
  const user = firebase.auth().currentUser;
  
  console.log(`チェック ${checkCount}/${maxChecks}:`, user ? `ログイン済み (${user.email})` : '未ログイン');
  
  if (user) {
    clearInterval(authInterval);
    console.log('✅ ログイン確認完了');
    loadInventoryStatus();
  } else if (checkCount >= maxChecks) {
    clearInterval(authInterval);
    console.log('⚠️ ログイン確認タイムアウト');
    document.getElementById('inventoryTableBody').innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #f44336;">
          ログインしてください
        </td>
      </tr>
    `;
  }
}, 500);

// 棚卸実施状況を読み込む（高速化版）
async function loadInventoryStatus() {
  try {
    console.log('📊 棚卸実施状況を読み込み中...');
    
    // baseMasterとassetsを並列で取得
    const [basesSnapshot, assetsSnapshot] = await Promise.all([
      firebase.firestore().collection('baseMaster').get(),
      firebase.firestore().collection('assets').get()
    ]);
    
    console.log('拠点数:', basesSnapshot.size);
    console.log('総資産数:', assetsSnapshot.size);
    
    // 拠点データをMapに格納
    const basesMap = new Map();
    basesSnapshot.forEach(doc => {
      basesMap.set(doc.id, {
        baseId: doc.id,
        baseName: doc.data().baseName || '不明',
        blockName: doc.data().blockName || '-',
        regionName: doc.data().regionName || '-',
        lastInventoryAt: null,
        diffCount: 0,
        totalAssets: 0,
        status: 'not-started'
      });
    });
    
    // 資産データを集計
    assetsSnapshot.forEach(doc => {
      const asset = doc.data();
      const baseId = asset.ownerBaseId;
      
      if (!baseId || !basesMap.has(baseId)) return;
      
      const base = basesMap.get(baseId);
      base.totalAssets++;
      
      // 最終棚卸日時を更新
      if (asset.lastInventoryAt) {
        const inventoryDate = asset.lastInventoryAt.toDate();
        if (!base.lastInventoryAt || inventoryDate > base.lastInventoryAt) {
          base.lastInventoryAt = inventoryDate;
          base.status = 'completed';
        }
      }
      
      // 差異件数をカウント
      if (asset.lastInventoryDiff && asset.lastInventoryDiff !== 0) {
        base.diffCount++;
      }
    });
    
    // Mapを配列に変換
    const inventoryStatus = Array.from(basesMap.values());
    
    console.log('✅ 棚卸状況取得完了');
    
    // サマリーを更新
    updateSummary(inventoryStatus);
    
    // テーブルを表示
    displayInventoryTable(inventoryStatus);
    
    // フィルター機能を設定
    setupFilters();
    
  } catch (error) {
    console.error('❌ エラー:', error);
    document.getElementById('inventoryTableBody').innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #f44336;">
          エラー: ${error.message}
        </td>
      </tr>
    `;
  }
}

function updateSummary(inventoryStatus) {
  const totalBases = inventoryStatus.length;
  const completedBases = inventoryStatus.filter(item => item.status === 'completed').length;
  const pendingBases = totalBases - completedBases;
  const totalDifferences = inventoryStatus.reduce((sum, item) => sum + item.diffCount, 0);
  
  document.getElementById('totalBases').textContent = totalBases;
  document.getElementById('completedBases').textContent = completedBases;
  document.getElementById('pendingBases').textContent = pendingBases;
  document.getElementById('totalDifferences').textContent = totalDifferences;
}

function displayInventoryTable(inventoryStatus) {
  const tbody = document.getElementById('inventoryTableBody');
  
  if (inventoryStatus.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">拠点がありません</td></tr>';
    return;
  }
  
  inventoryStatus.sort((a, b) => {
    if (a.status === 'not-started' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'not-started') return 1;
    return 0;
  });
  
  tbody.innerHTML = inventoryStatus.map(item => {
    const statusClass = item.status === 'completed' ? 'status-done' : 'status-not-started';
    const statusText = item.status === 'completed' ? '実施済み' : '未実施';
    const dateText = item.lastInventoryAt ? item.lastInventoryAt.toLocaleString('ja-JP') : '-';
    
    return `
      <tr data-status="${item.status}" data-has-diff="${item.diffCount > 0 ? 'true' : 'false'}">
        <td>${item.baseName}</td>
        <td>${item.blockName}</td>
        <td>${item.regionName}</td>
        <td>${dateText}</td>
        <td>${item.diffCount > 0 ? `<span style="color: #f44336; font-weight: bold;">${item.diffCount}件</span>` : '0件'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      const rows = document.querySelectorAll('#inventoryTableBody tr');
      
      rows.forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'completed') {
          row.style.display = row.dataset.status === 'completed' ? '' : 'none';
        } else if (filter === 'pending') {
          row.style.display = row.dataset.status === 'not-started' ? '' : 'none';
        } else if (filter === 'has-diff') {
          row.style.display = row.dataset.hasDiff === 'true' ? '' : 'none';
        }
      });
    });
  });
}
