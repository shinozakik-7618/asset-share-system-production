let currentTab = 'pending';

document.addEventListener('DOMContentLoaded', async () => {
  await loadTransferRequests();
});

function showTab(tab) {
  currentTab = tab;
  
  // タブボタンの切り替え
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // コンテンツの切り替え
  document.getElementById('pendingTab').style.display = tab === 'pending' ? 'block' : 'none';
  document.getElementById('approvedTab').style.display = tab === 'approved' ? 'block' : 'none';
  document.getElementById('rejectedTab').style.display = tab === 'rejected' ? 'block' : 'none';
}

async function loadTransferRequests() {
  try {
    const currentUser = firebase.auth().currentUser;
    
    // 承認待ち
    const pendingSnapshot = await firebase.firestore()
      .collection('transferRequests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    displayRequests(pendingSnapshot, 'pendingList', true);
    
    // 承認済み
    const approvedSnapshot = await firebase.firestore()
      .collection('transferRequests')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    displayRequests(approvedSnapshot, 'approvedList', false);
    
    // 却下
    const rejectedSnapshot = await firebase.firestore()
      .collection('transferRequests')
      .where('status', '==', 'rejected')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    displayRequests(rejectedSnapshot, 'rejectedList', false);
    
  } catch (error) {
    console.error('譲渡申請読み込みエラー:', error);
    document.getElementById('pendingList').innerHTML = '<p style="color: red;">読み込みエラー</p>';
  }
}

function displayRequests(snapshot, elementId, showActions) {
  const listDiv = document.getElementById(elementId);
  
  if (snapshot.empty) {
    listDiv.innerHTML = '<p style="color: #666;">該当する申請はありません</p>';
    return;
  }

  let html = '';
  
  snapshot.forEach(doc => {
    const req = doc.data();
    const createdAt = req.createdAt ? req.createdAt.toDate().toLocaleString('ja-JP') : '未設定';
    
    html += `
      <div class="request-card">
        <h3>📦 ${req.assetName}</h3>
        <div class="request-info">
          <p><strong>申請者:</strong> ${req.fromUserEmail}</p>
          <p><strong>譲渡元:</strong> ${req.fromBaseName || '未設定'}</p>
          <p><strong>譲渡先:</strong> ${req.toBaseName}</p>
          <p><strong>理由:</strong> ${req.reason}</p>
          <p><strong>申請日:</strong> ${createdAt}</p>
        </div>
        ${showActions ? `
          <div class="action-buttons">
            <button class="btn-approve" onclick="approveRequest('${doc.id}', '${req.assetId}', '${req.fromBaseId}', '${req.fromBaseName}', '${req.toBaseId}', '${req.toBaseName}', '${req.assetName}')">承認</button>
            <button class="btn-reject" onclick="rejectRequest('${doc.id}')">却下</button>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  listDiv.innerHTML = html;
}

async function approveRequest(requestId, assetId, fromBaseId, fromBaseName, toBaseId, toBaseName, assetName) {
  if (!confirm('この譲渡申請を承認しますか？\n承認すると経費振替が自動作成されます。')) {
    return;
  }

  try {
    // 1. 譲渡申請のステータスを承認に更新
    await firebase.firestore().collection('transferRequests').doc(requestId).update({
      status: 'approved',
      approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      approvedBy: firebase.auth().currentUser.uid
    });

    // 2. 資産の拠点を更新
    await firebase.firestore().collection('assets').doc(assetId).update({
      baseId: toBaseId,
      baseName: toBaseName
    });

    // 3. 経費振替を自動作成
    const expenseData = {
      assetId: assetId,
      assetName: assetName,
      fromBaseId: fromBaseId,
      fromBaseName: fromBaseName,
      toBaseId: toBaseId,
      toBaseName: toBaseName,
      amount: 0, // 金額は後で入力可能
      reason: `資産譲渡承認による自動作成（${assetName}）`,
      transferDate: new Date().toISOString().split('T')[0],
      userId: firebase.auth().currentUser.uid,
      userEmail: firebase.auth().currentUser.email,
      autoCreated: true,
      transferRequestId: requestId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await firebase.firestore().collection('expenseTransfers').add(expenseData);

    alert('譲渡申請を承認しました！\n経費振替が自動作成されました。');

    // メール通知内容を表示
        // メール内容生成（改行を正しく処理）
        const emailContent = [
          '【経費振替通知】' + assetName + 'の譲渡が承認されました',
          '',
          '資産情報',
          '━━━━━━━━━━━━━━━━━━━━━━━━',
          '資産名: ' + assetName,
          '振替元拠点: ' + fromBaseName,
          '振替先拠点: ' + toBaseName,
          '金額: ¥0',
          '理由: ' + assetName + 'の譲渡に伴う経費振替',
          '振替日: ' + new Date().toLocaleDateString('ja-JP'),
          '',
          '詳細はこちら:',
          'https://base-asset-sharing-system.web.app/expense-transfer.html',
          '━━━━━━━━━━━━━━━━━━━━━━━━'
        ].join('\n');

        // クリップボードにコピー
        navigator.clipboard.writeText(emailContent).then(() => {
          alert('譲渡申請を承認しました！\n\nメール内容をクリップボードにコピーしました。\nメーラーに貼り付けて送信してください。');
        }).catch(() => {
          alert('譲渡申請を承認しました！');
      alert('メール内容をコピーしました。メーラーに貼り付けて送信してください。');
    }
    
    // 再読み込み
    await loadTransferRequests();

  } catch (error) {
    console.error('承認エラー:', error);
    alert('承認に失敗しました: ' + error.message);
  }
}

async function rejectRequest(requestId) {
  const reason = prompt('却下理由を入力してください:');
  
  if (!reason) {
    return;
  }

  try {
    await firebase.firestore().collection('transferRequests').doc(requestId).update({
      status: 'rejected',
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
      rejectedBy: firebase.auth().currentUser.uid,
      rejectedReason: reason
    });

    alert('譲渡申請を却下しました');
    
    // 再読み込み
    await loadTransferRequests();

  } catch (error) {
    console.error('却下エラー:', error);
    alert('却下に失敗しました: ' + error.message);
  }
}
