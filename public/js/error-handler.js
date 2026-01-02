// グローバルエラーハンドラー
let isOffline = false;

// オフライン検知
window.addEventListener('offline', () => {
  isOffline = true;
  showOfflineNotice();
});

window.addEventListener('online', () => {
  isOffline = false;
  hideOfflineNotice();
  location.reload();
});

// オフライン通知を表示
function showOfflineNotice() {
  let notice = document.getElementById('offlineNotice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'offlineNotice';
    notice.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f44336;
      color: white;
      text-align: center;
      padding: 12px;
      z-index: 10000;
      font-weight: 600;
    `;
    notice.textContent = '⚠️ インターネット接続がありません';
    document.body.appendChild(notice);
  }
}

// オフライン通知を非表示
function hideOfflineNotice() {
  const notice = document.getElementById('offlineNotice');
  if (notice) {
    notice.remove();
  }
}

// エラーメッセージを表示
function showError(message, duration = 5000) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #f44336;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  errorDiv.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="font-size: 24px;">❌</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 4px;">エラーが発生しました</div>
        <div style="font-size: 14px;">${message}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => errorDiv.remove(), 300);
  }, duration);
}

// 成功メッセージを表示
function showSuccess(message, duration = 3000) {
  const successDiv = document.createElement('div');
  successDiv.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  successDiv.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="font-size: 24px;">✅</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 4px;">成功</div>
        <div style="font-size: 14px;">${message}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => successDiv.remove(), 300);
  }, duration);
}

// リトライ付きFirestore操作
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`操作失敗 (試行 ${i + 1}/${maxRetries}):`, error);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // 指数バックオフ
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

// Firestoreエラーのユーザーフレンドリーなメッセージ
function getFirestoreErrorMessage(error) {
  if (error.code === 'permission-denied') {
    return 'この操作を実行する権限がありません';
  } else if (error.code === 'unavailable') {
    return 'サーバーに接続できません。しばらく待ってから再試行してください';
  } else if (error.code === 'not-found') {
    return '指定されたデータが見つかりません';
  } else if (error.code === 'already-exists') {
    return 'このデータは既に存在します';
  } else {
    return error.message || '予期しないエラーが発生しました';
  }
}

// アニメーション用CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
