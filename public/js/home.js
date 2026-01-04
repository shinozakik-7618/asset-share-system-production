// ホーム画面のJavaScript

let allItems = [];
let currentTab = 'myBase'; // 'myBase' or 'allBases'
let currentUserBaseId = null;
let selectedBlock = '';
let selectedRegion = '';
let selectedBase = '';
let allBases = [];
let currentMainTab = 'registered'; // 'registered' or 'forTransfer'
let filteredItems = [];
let currentFilter = 'all';
let currentSort = 'newest';

// ページ読み込み時
document.addEventListener('DOMContentLoaded', async () => {
  // ユーザーの拠点情報を取得
  const userData = await getCurrentUserData();
  if (userData && userData.baseId) {
    currentUserBaseId = userData.baseId;
  }
  
  // タブ切り替えイベント
  // メインタブ（登録資産 / 譲渡申請資産）のイベント
  document.getElementById('tabRegistered').addEventListener('click', () => {
    currentMainTab = 'registered';
    document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tabRegistered').classList.add('active');
    document.getElementById('tabRegistered').style.borderBottom = '3px solid #1976d2';
    document.getElementById('tabRegistered').style.color = '#1976d2';
    document.getElementById('tabForTransfer').style.borderBottom = '3px solid transparent';
    document.getElementById('tabForTransfer').style.color = '#666';
    applyFilters();
  });
  
  document.getElementById('tabForTransfer').addEventListener('click', () => {
    currentMainTab = 'forTransfer';
    document.querySelectorAll('.main-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tabForTransfer').classList.add('active');
    document.getElementById('tabForTransfer').style.borderBottom = '3px solid #1976d2';
    document.getElementById('tabForTransfer').style.color = '#1976d2';
    document.getElementById('tabRegistered').style.borderBottom = '3px solid transparent';
    document.getElementById('tabRegistered').style.color = '#666';
    applyFilters();
  });
  
  document.getElementById('tabMyBase').addEventListener('click', () => {
    currentTab = 'myBase';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tabMyBase').classList.add('active');
    document.getElementById('tabMyBase').style.borderBottom = '3px solid #1976d2';
    document.getElementById('tabMyBase').style.color = '#1976d2';
    document.getElementById('tabAllBases').style.borderBottom = '3px solid transparent';
    document.getElementById('tabAllBases').style.color = '#666';
    applyFilters();
  });
  
  document.getElementById('tabAllBases').addEventListener('click', () => {
    currentTab = 'allBases';
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tabAllBases').classList.add('active');
    document.getElementById('tabAllBases').style.borderBottom = '3px solid #1976d2';
    document.getElementById('tabAllBases').style.color = '#1976d2';
    document.getElementById('tabMyBase').style.borderBottom = '3px solid transparent';
    document.getElementById('tabMyBase').style.color = '#666';
    applyFilters();
  });

  // ユーザー情報表示
  await displayUserInfo();
  
  // 検索イベント
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  
  // フィルターイベント
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', handleFilter);
  });
  
  // ソートイベント
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', handleSort);
  });
  
  // アイテム一覧を取得
  await loadBases();
  await loadItems();
});

// ユーザー情報表示
async function displayUserInfo() {
  const userData = await getCurrentUserData();
  if (userData) {
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = `
      <div class="header-user-name">${userData.displayName}</div>
      <div class="header-user-base">${userData.baseName || '拠点未設定'}</div>
    `;
  }
}

// アイテム一覧を取得
// 拠点マスタを読み込み
async function loadBases() {
  try {
    const snapshot = await db.collection('baseMaster').get();
    allBases = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // ブロック一覧を作成
    const blocks = [...new Set(allBases.map(base => base.blockName).filter(Boolean))].sort();
    const blockFilter = document.getElementById('blockFilter');
    blocks.forEach(block => {
      const option = document.createElement('option');
      option.value = block;
      option.textContent = block;
      blockFilter.appendChild(option);
    });
    
    // フィルターイベント
    document.getElementById('blockFilter').addEventListener('change', handleBlockChange);
    document.getElementById('regionFilter').addEventListener('change', handleRegionChange);
    document.getElementById('baseFilter').addEventListener('change', handleBaseChange);
    document.getElementById('clearBaseFilter').addEventListener('click', clearBaseFilter);
    
  } catch (error) {
    console.error('拠点マスタ取得エラー:', error);
  }
}

function handleBlockChange(e) {
  selectedBlock = e.target.value;
  selectedRegion = '';
  selectedBase = '';
  
  const regionFilter = document.getElementById('regionFilter');
  const baseFilter = document.getElementById('baseFilter');
  
  regionFilter.innerHTML = '<option value="">すべての地域</option>';
  baseFilter.innerHTML = '<option value="">すべての拠点</option>';
  baseFilter.disabled = true;
  
  if (selectedBlock) {
    const regions = [...new Set(allBases.filter(base => base.blockName === selectedBlock).map(base => base.regionName).filter(Boolean))].sort();
    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region;
      option.textContent = region;
      regionFilter.appendChild(option);
    });
    regionFilter.disabled = false;
    document.getElementById('clearBaseFilter').style.display = 'inline-block';
  } else {
    regionFilter.disabled = true;
    document.getElementById('clearBaseFilter').style.display = 'none';
  }
  
  applyFilters();
}

function handleRegionChange(e) {
  selectedRegion = e.target.value;
  selectedBase = '';
  
  const baseFilter = document.getElementById('baseFilter');
  baseFilter.innerHTML = '<option value="">すべての拠点</option>';
  
  if (selectedRegion) {
    const bases = allBases.filter(base => base.blockName === selectedBlock && base.regionName === selectedRegion).sort((a, b) => (a.baseName || '').localeCompare(b.baseName || ''));
    bases.forEach(base => {
      const option = document.createElement('option');
      option.value = base.id;
      option.textContent = base.baseName;
      baseFilter.appendChild(option);
    });
    baseFilter.disabled = false;
  } else {
    baseFilter.disabled = true;
  }
  
  applyFilters();
}

function handleBaseChange(e) {
  selectedBase = e.target.value;
  applyFilters();
}

function clearBaseFilter() {
  selectedBlock = '';
  selectedRegion = '';
  selectedBase = '';
  
  document.getElementById('blockFilter').value = '';
  document.getElementById('regionFilter').value = '';
  document.getElementById('regionFilter').disabled = true;
  document.getElementById('baseFilter').value = '';
  document.getElementById('baseFilter').disabled = true;
  document.getElementById('clearBaseFilter').style.display = 'none';
  
  applyFilters();
}

async function loadItems() {
  const loading = document.getElementById('loading');
  const itemList = document.getElementById('itemList');
  const emptyState = document.getElementById('emptyState');
  
  loading.style.display = 'block';
  itemList.style.display = 'none';
  emptyState.style.display = 'none';
  
  try {
    const snapshot = await db.collection('assets')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    allItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    filteredItems = [...allItems];
    renderItems();
    
  } catch (error) {
    console.error('データ取得エラー:', error);
    loading.style.display = 'none';
    emptyState.style.display = 'block';
    document.querySelector('.empty-message').textContent = (currentMainTab === 'forTransfer' ? '譲渡申請資産はありません' : '登録資産はありません');
  }
}

// フィルター適用
function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  
  filteredItems = allItems.filter(item => {
    // メインタブフィルター（登録資産 / 譲渡申請資産）
    if (currentMainTab === 'forTransfer') {
      // 譲渡申請資産: forTransfer が true の資産のみ
      if (!item.forTransfer) {
        return false;
      }
    }
    
    // 拠点フィルター
    if (selectedBase && item.baseId !== selectedBase) {
      return false;
    }
    if (selectedRegion && !selectedBase) {
      const baseData = allBases.find(base => base.id === item.baseId);
      if (!baseData || baseData.region !== selectedRegion) {
        return false;
      }
    }
    if (selectedBlock && !selectedRegion) {
      const baseData = allBases.find(base => base.id === item.baseId);
      if (!baseData || baseData.block !== selectedBlock) {
        return false;
      }
    }
    
    // タブフィルター
    if (currentTab === 'myBase' && currentUserBaseId && item.baseId !== currentUserBaseId) {
      return false;
    }
    
    // 検索フィルター
    const matchSearch = !query || 
      (item.assetName && item.assetName.toLowerCase().includes(query)) ||
      (item.largeCategory && item.largeCategory.toLowerCase().includes(query)) ||
      (item.baseName && item.baseName.toLowerCase().includes(query));
    
    // 大分類フィルター
    const matchCategory = currentFilter === 'all' || item.largeCategory === currentFilter;
    
    return matchSearch && matchCategory;
  });
  
  renderItems();
}

// 検索処理
function handleSearch(e) {
  applyFilters();
}

// フィルター処理
function handleFilter(e) {
  document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
  e.target.classList.add('active');
  currentFilter = e.target.dataset.filter;
  applyFilters();
}

// ソート処理
function handleSort(e) {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  e.target.classList.add('active');
  
  currentSort = e.target.dataset.sort;
  
  if (currentSort === 'newest') {
    filteredItems.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
  } else if (currentSort === 'oldest') {
    filteredItems.sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
  } else if (currentSort === 'name') {
    filteredItems.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ja'));
  }
  
  renderItems();
}

// アイテムを表示
function renderItems() {
  const loading = document.getElementById('loading');
  const itemList = document.getElementById('itemList');
  const emptyState = document.getElementById('emptyState');
  
  loading.style.display = 'none';
  
  if (filteredItems.length === 0) {
    itemList.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    itemList.style.display = 'grid';
    emptyState.style.display = 'none';
    
    itemList.innerHTML = filteredItems.map(item => `
            <div class="item-card" onclick="viewItemDetail('${item.id}')" style="display: flex; align-items: center; padding: 12px; margin-bottom: 8px; cursor: pointer; border: 1px solid #e0e0e0; border-radius: 8px; background: white;">
        <div class="item-image" style="width: 60px; height: 60px; flex-shrink: 0; margin-right: 15px; border-radius: 4px; overflow: hidden; background: #f5f5f5;">
          ${item.images && item.images.length > 0 
            ? `<img src="${item.images[0]}" alt="${item.assetName}" style="width: 100%; height: 100%; object-fit: cover;">` 
            : '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px;">📦</div>'}
        </div>
        <div class="item-info" style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #333;">${item.assetName}</div>
          <div style="font-size: 13px; color: #666; margin-bottom: 2px;">${item.largeCategory} / ${item.mediumCategory}</div>
          <div style="font-size: 13px; color: #888;">数量: ${item.quantity} | ${item.baseName || '拠点未設定'}</div>
        </div>
        ${currentMainTab === 'forTransfer' && item.baseId !== currentUserBaseId ? `
        <button onclick="requestTransfer('${item.id}'); event.stopPropagation();" style="padding: 6px 12px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; margin-left: 10px;">譲渡を申請</button>
        ` : ''}
        <div style="text-align: right; color: #999; font-size: 12px; flex-shrink: 0; margin-left: 10px;">
          ${formatDate(item.createdAt)}
        </div>
      </div>
    `).join('');
  }
}

// アイテム詳細表示
// 譲渡申請
function requestTransfer(itemId) {
  window.location.href = `/transfer-request.html?id=${itemId}`;
}

function viewItemDetail(itemId) {
  window.location.href = `/asset-detail.html?id=${itemId}`;
}

// 統計情報を読み込む
async function loadStatistics() {
  try {
    const currentUser = firebase.auth().currentUser;
    
    // 総資産数
    const allAssetsSnapshot = await firebase.firestore()
      .collection('assets')
      .where('status', '==', 'available')
      .get();
    const el = document.getElementById('totalAssets'); if(el) el.textContent = allAssetsSnapshot.size;
    
    // 登録資産数
    const myAssetsSnapshot = await firebase.firestore()
      .collection('assets')
      .where('userId', '==', currentUser.uid)
      .get();
    document.getElementById('myAssets').textContent = myAssetsSnapshot.size;
    
    // 承認待ち申請数
    const pendingSnapshot = await firebase.firestore()
      .collection('transferRequests')
      .where('fromUserId', '==', currentUser.uid)
      .where('status', '==', 'pending')
      .get();
    document.getElementById('pendingRequests').textContent = pendingSnapshot.size;
    
    // カテゴリ数
    const categories = new Set();
    allAssetsSnapshot.forEach(doc => {
      const asset = doc.data();
      if (asset.largeCategory) {
        categories.add(asset.largeCategory);
      }
      if (asset.largeCategoryName) {
        categories.add(asset.largeCategoryName);
      }
    });
    document.getElementById('categoryCount').textContent = categories.size;
    
  } catch (error) {
    console.error('統計情報読み込みエラー:', error);
  }
}


// ページ読み込み時に統計情報を表示
document.addEventListener('DOMContentLoaded', () => {
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loadStatistics().then(() => loadDetailedStats());
  }
});
});

// 詳細統計グラフを描画
async function loadDetailedStats() {
  try {
    const currentUser = firebase.auth().currentUser;
    
    // 全資産を取得
    const snapshot = await firebase.firestore()
      .collection('assets')
      .where('status', '==', 'available')
      .get();
    
    const assets = [];
    snapshot.forEach(doc => {
      assets.push(doc.data());
    });
    
    // カテゴリ別集計
    const categoryData = {};
    assets.forEach(asset => {
      const category = asset.largeCategoryName || asset.largeCategory || 'その他';
      categoryData[category] = (categoryData[category] || 0) + 1;
    });
    
    // 月別集計（過去6ヶ月）
    const monthlyData = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
      monthlyData[key] = 0;
    }
    
    assets.forEach(asset => {
      if (asset.createdAt && asset.createdAt.seconds) {
        const date = new Date(asset.createdAt.seconds * 1000);
        const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
        if (monthlyData[key] !== undefined) {
          monthlyData[key]++;
        }
      }
    });
    
    // 拠点別集計
    const baseData = {};
    assets.forEach(asset => {
      const base = asset.baseName || '未設定';
      baseData[base] = (baseData[base] || 0) + 1;
    });
    
    // TOP5のみ
    const top5Bases = Object.entries(baseData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // グラフ描画
    drawCategoryChart(categoryData);
    drawMonthlyChart(monthlyData);
    drawBaseChart(top5Bases);
    
  } catch (error) {
    console.error('詳細統計読み込みエラー:', error);
  }
}

// カテゴリ別円グラフ
function drawCategoryChart(data) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: [
          '#1976d2', '#4caf50', '#ff9800', '#f44336', 
          '#9c27b0', '#00bcd4', '#ffeb3b', '#795548'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// 月別折れ線グラフ
function drawMonthlyChart(data) {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: '登録数',
        data: Object.values(data),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// 拠点別棒グラフ
function drawBaseChart(data) {
  const ctx = document.getElementById('baseChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d[0]),
      datasets: [{
        label: '資産数',
        data: data.map(d => d[1]),
        backgroundColor: '#4caf50'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// loadStatisticsの後にグラフも読み込む

// 通知バッジを定期的に更新
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    updateNotificationBadge();
    // 30秒ごとに更新
    setInterval(updateNotificationBadge, 30000);
  }
});
