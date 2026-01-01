let allBases = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 拠点一覧を読み込み
  await loadBases();
  
  // ブロック選択時
  document.getElementById('block').addEventListener('change', handleBlockChange);
  
  // 地域選択時
  document.getElementById('region').addEventListener('change', handleRegionChange);
  
  // フォーム送信
  document.getElementById('userRegisterForm').addEventListener('submit', handleSubmit);
});

// 拠点一覧読み込み
async function loadBases() {
  try {
    const snapshot = await firebase.firestore().collection('baseMaster').get();
    
    snapshot.forEach(doc => {
      const base = doc.data();
      allBases.push({
        id: doc.id,
        baseName: base.baseName,
        region: base.region || '',
        block: base.block || ''
      });
    });
    
    // ブロック一覧を作成
    const blocks = [...new Set(allBases.map(b => b.block).filter(b => b))];
    const blockSelect = document.getElementById('block');
    
    blocks.forEach(block => {
      const option = document.createElement('option');
      option.value = block;
      option.textContent = block;
      blockSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('拠点一覧読み込みエラー:', error);
    alert('拠点一覧の読み込みに失敗しました');
  }
}

// ブロック選択時
function handleBlockChange() {
  const block = document.getElementById('block').value;
  const regionSelect = document.getElementById('region');
  const baseSelect = document.getElementById('baseId');
  
  // リセット
  regionSelect.innerHTML = '<option value="">地域を選択してください</option>';
  baseSelect.innerHTML = '<option value="">拠点を選択してください</option>';
  baseSelect.disabled = true;
  
  if (!block) {
    regionSelect.disabled = true;
    return;
  }
  
  // 地域一覧を作成
  const regions = [...new Set(allBases.filter(b => b.block === block).map(b => b.region).filter(r => r))];
  
  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });
  
  regionSelect.disabled = false;
}

// 地域選択時
function handleRegionChange() {
  const block = document.getElementById('block').value;
  const region = document.getElementById('region').value;
  const baseSelect = document.getElementById('baseId');
  
  // リセット
  baseSelect.innerHTML = '<option value="">拠点を選択してください</option>';
  
  if (!region) {
    baseSelect.disabled = true;
    return;
  }
  
  // 拠点一覧を作成
  const bases = allBases.filter(b => b.block === block && b.region === region);
  
  bases.forEach(base => {
    const option = document.createElement('option');
    option.value = base.id;
    option.textContent = base.baseName;
    option.dataset.baseName = base.baseName;
    option.dataset.region = base.region;
    option.dataset.block = base.block;
    baseSelect.appendChild(option);
  });
  
  baseSelect.disabled = false;
}

// ユーザー登録
async function handleSubmit(e) {
  e.preventDefault();
  
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      alert('ログインしてください');
      return;
    }
    
    const baseSelect = document.getElementById('baseId');
    const selectedOption = baseSelect.options[baseSelect.selectedIndex];
    
    const userData = {
      displayName: document.getElementById('displayName').value,
      email: currentUser.email,
      baseId: baseSelect.value,
      baseName: selectedOption.dataset.baseName,
      region: selectedOption.dataset.region,
      block: selectedOption.dataset.block,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Firestoreに保存
    await firebase.firestore().collection('users').doc(currentUser.uid).set(userData);
    
    // localStorageに保存
    localStorage.setItem('selectedBaseId', userData.baseId);
    localStorage.setItem('selectedBaseName', userData.baseName);
    localStorage.setItem('selectedRegion', userData.region);
    localStorage.setItem('selectedBlock', userData.block);
    
    alert('ユーザー登録が完了しました！');
    window.location.href = '/home.html';
    
  } catch (error) {
    console.error('登録エラー:', error);
    alert('登録に失敗しました: ' + error.message);
  }
}
