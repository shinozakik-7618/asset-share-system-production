let allAssets = [];
let allBases = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 拠点一覧を読み込み
  await loadBases();

  // 資産一覧を読み込み
  await loadAssets();

  // 経費振替履歴を読み込み
  await loadExpenseHistory();

  // 資産選択時
  document.getElementById('assetId').addEventListener('change', handleAssetChange);

  // フォーム送信
  document.getElementById('expenseForm').addEventListener('submit', handleSubmit);

  // 今日の日付をデフォルト設定
  document.getElementById('transferDate').valueAsDate = new Date();
});

// 拠点一覧読み込み
async function loadBases() {
  try {
    const snapshot = await firebase.firestore().collection('baseMaster').get();
    const toSelect = document.getElementById('toBase');
    
    snapshot.forEach(doc => {
      const base = doc.data();
      allBases.push({ id: doc.id, name: base.baseName });
      
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = base.baseName;
      toSelect.appendChild(option);
    });
  } catch (error) {
    console.error('拠点一覧読み込みエラー:', error);
    alert('拠点一覧の読み込みに失敗しました');
  }
}

// 資産一覧読み込み
async function loadAssets() {
  try {
    const currentUser = firebase.auth().currentUser;
    const snapshot = await firebase.firestore()
      .collection('assets')
      .where('userId', '==', currentUser.uid)
      .get();

    const assetSelect = document.getElementById('assetId');
    
    snapshot.forEach(doc => {
      const asset = doc.data();
      allAssets.push({
        id: doc.id,
        name: asset.assetName,
        baseId: asset.baseId,
        baseName: asset.baseName
      });
      
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${asset.assetName} (${asset.baseName || '拠点未設定'})`;
      assetSelect.appendChild(option);
    });
  } catch (error) {
    console.error('資産一覧読み込みエラー:', error);
    alert('資産一覧の読み込みに失敗しました');
  }
}

// 資産選択時の処理
function handleAssetChange() {
  const assetId = document.getElementById('assetId').value;
  const fromSelect = document.getElementById('fromBase');
  
  if (!assetId) {
    fromSelect.disabled = true;
    fromSelect.innerHTML = '<option value="">資産を選択してください</option>';
    return;
  }

  const selectedAsset = allAssets.find(a => a.id === assetId);
  
  if (selectedAsset && selectedAsset.baseId) {
    fromSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = selectedAsset.baseId;
    option.textContent = selectedAsset.baseName;
    option.selected = true;
    fromSelect.appendChild(option);
    fromSelect.disabled = true;
  } else {
    fromSelect.disabled = false;
    fromSelect.innerHTML = '<option value="">選択してください</option>';
    allBases.forEach(base => {
      const option = document.createElement('option');
      option.value = base.id;
      option.textContent = base.name;
      fromSelect.appendChild(option);
    });
  }
}

// 経費振替履歴読み込み
async function loadExpenseHistory() {
  try {
    const snapshot = await firebase.firestore()
      .collection('expenseTransfers')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const listDiv = document.getElementById('expenseList');
    
    if (snapshot.empty) {
      listDiv.innerHTML = '<p style="color: #666;">経費振替履歴がありません</p>';
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    
    snapshot.forEach(doc => {
      const expense = doc.data();
      const date = expense.transferDate || '未設定';
      
      html += `
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              <p style="margin: 5px 0;"><strong>資産名:</strong> ${expense.assetName || '未設定'}</p>
              <p style="margin: 5px 0;"><strong>振替元:</strong> ${expense.fromBaseName}</p>
              <p style="margin: 5px 0;"><strong>振替先:</strong> ${expense.toBaseName}</p>
              <p style="margin: 5px 0;"><strong>金額:</strong> ¥${Number(expense.amount).toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>振替日:</strong> ${date}</p>
              <p style="margin: 5px 0;"><strong>理由:</strong> ${expense.reason}</p>
              <p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>登録者:</strong> ${expense.userEmail}</p>
            </div>
            <button onclick="deleteExpense('${doc.id}')" class="btn" style="background: #f44336; color: white; padding: 8px 15px;">削除</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    listDiv.innerHTML = html;

  } catch (error) {
    console.error('経費振替履歴読み込みエラー:', error);
    document.getElementById('expenseList').innerHTML = '<p style="color: red;">読み込みエラー</p>';
  }
}

// フォーム送信
async function handleSubmit(e) {
  e.preventDefault();

  const assetId = document.getElementById('assetId').value;
  const fromBaseId = document.getElementById('fromBase').value;
  const toBaseId = document.getElementById('toBase').value;

  if (fromBaseId === toBaseId) {
    alert('振替元と振替先に同じ拠点を選択できません');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '登録中...';

  try {
    const selectedAsset = allAssets.find(a => a.id === assetId);
    const fromBase = allBases.find(b => b.id === fromBaseId);
    const toBase = allBases.find(b => b.id === toBaseId);

    const expenseData = {
      assetId: assetId,
      assetName: selectedAsset.name,
      fromBaseId: fromBaseId,
      fromBaseName: fromBase.name,
      toBaseId: toBaseId,
      toBaseName: toBase.name,
      amount: parseInt(document.getElementById('amount').value),
      reason: document.getElementById('reason').value,
      transferDate: document.getElementById('transferDate').value,
      userId: firebase.auth().currentUser.uid,
      userEmail: firebase.auth().currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await firebase.firestore().collection('expenseTransfers').add(expenseData);

    alert('経費振替情報を登録しました！');
    
    // フォームリセット
    document.getElementById('expenseForm').reset();
    document.getElementById('transferDate').valueAsDate = new Date();
    document.getElementById('fromBase').disabled = true;
    document.getElementById('fromBase').innerHTML = '<option value="">資産を選択してください</option>';
    
    // 履歴を再読み込み
    await loadExpenseHistory();

  } catch (error) {
    console.error('登録エラー:', error);
    alert('登録に失敗しました: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '登録する';
  }
}

// 経費振替削除
async function deleteExpense(expenseId) {
  if (!confirm('この経費振替情報を削除しますか？')) {
    return;
  }

  try {
    await firebase.firestore().collection('expenseTransfers').doc(expenseId).delete();
    alert('削除しました');
    await loadExpenseHistory();
  } catch (error) {
    console.error('削除エラー:', error);
    alert('削除に失敗しました: ' + error.message);
  }
}
