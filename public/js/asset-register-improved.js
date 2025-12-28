// 中分類マスタ
const mediumCategories = {
  'PC・IT機器': ['ノートPC', 'デスクトップPC', 'TV', 'モニター', 'タブレット', 'その他'],
  '机': ['2人用', '4人用', '6人用', '折りたたみ', '丸テーブル', 'その他'],
  '椅子': ['ダイニングチェア', 'アームチェア', 'カウンターチェア', 'スタッキングチェア', 'フォールディングチェア', 'リクライニングチェア', 'ゲーミングチェア', 'ソファ', 'その他'],
  '事務用品・備品': ['ロッカー', 'キャビネット', 'ホワイトボード', 'パーテーション', 'その他'],
  '什器等': ['本棚', '媒体スタンド', '棚板', 'フック', 'その他'],
  '媒体': ['journal', 'members', '安全のしおり', 'カタログ', '統合報告書', 'その他'],
  'デポ備品': ['デポ袋', 'モチーナ', 'セキュリティ関連', 'その他'],
  'その他': ['その他']
};

let selectedFiles = [];

// DOM読み込み完了後
document.addEventListener('DOMContentLoaded', () => {
  const cameraBtn = document.getElementById('cameraBtn');
  const fileBtn = document.getElementById('fileBtn');
  const cameraInput = document.getElementById('cameraInput');
  const fileInput = document.getElementById('fileInput');
  const dropArea = document.getElementById('dropArea');
  const imagePreview = document.getElementById('imagePreview');
  const largeCategorySelect = document.getElementById('largeCategory');
  const registerForm = document.getElementById('registerForm');

  // カメラボタン
  cameraBtn.addEventListener('click', () => {
    cameraInput.click();
  });

  // ファイル選択ボタン
  fileBtn.addEventListener('click', () => {
    fileInput.click();
    dropArea.style.display = 'block';
  });

  // カメラ入力
  cameraInput.addEventListener('change', handleFileSelect);

  // ファイル入力
  fileInput.addEventListener('change', handleFileSelect);

  // ドラッグ&ドロップ
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.background = '#e3f2fd';
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.style.background = '#f9f9f9';
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.background = '#f9f9f9';
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(files);
  });

  // 大分類変更
  largeCategorySelect.addEventListener('change', updateMediumCategory);

  // フォーム送信
  registerForm.addEventListener('submit', handleSubmit);
});

// ファイル選択処理
function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  addFiles(files);
}

// ファイル追加
function addFiles(files) {
  if (selectedFiles.length + files.length > 5) {
    alert('写真は最大5枚までです');
    return;
  }

  files.forEach(file => {
    selectedFiles.push(file);
    displayPreview(file);
  });
}

// プレビュー表示
function displayPreview(file) {
  const preview = document.getElementById('imagePreview');
  const index = selectedFiles.length - 1;

  const container = document.createElement('div');
  container.style.cssText = 'position: relative; width: 100px; height: 100px;';

  const img = document.createElement('img');
  img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px;';
  
  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.type = 'button';
  removeBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;';
  removeBtn.onclick = () => {
    selectedFiles.splice(index, 1);
    container.remove();
  };

  container.appendChild(img);
  container.appendChild(removeBtn);
  preview.appendChild(container);
}

// 中分類更新
function updateMediumCategory() {
  const largeCategory = document.getElementById('largeCategory').value;
  const mediumSelect = document.getElementById('mediumCategory');
  
  mediumSelect.innerHTML = '<option value="">選択してください</option>';
  
  if (largeCategory && mediumCategories[largeCategory]) {
    mediumCategories[largeCategory].forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      mediumSelect.appendChild(option);
    });
    mediumSelect.disabled = false;
  } else {
    mediumSelect.disabled = true;
  }
}

// 画像をJPEGに変換
function convertToJpeg(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            // 元のファイル名を.jpgに変更
            const fileName = file.name.replace(/\.[^/.]+$/, '.jpg');
            const jpegFile = new File([blob], fileName, { type: 'image/jpeg' });
            resolve(jpegFile);
          } else {
            reject(new Error('JPEG変換に失敗しました'));
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

// フォーム送信
async function handleSubmit(e) {
  e.preventDefault();
  
  if (selectedFiles.length === 0) {
    alert('写真を1枚以上選択してください');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '登録中...';

  try {
    // 画像アップロード
    const imageUrls = await uploadImages();

    // 資産データ作成
    const assetData = {
      assetName: document.getElementById('assetName').value,
      quantity: parseInt(document.getElementById('quantity').value),
      largeCategory: document.getElementById('largeCategory').value,
      mediumCategory: document.getElementById('mediumCategory').value,
      size: {
        width: document.getElementById('width').value || null,
        depth: document.getElementById('depth').value || null,
        height: document.getElementById('height').value || null
      },
      memo: document.getElementById('memo').value || '',
      images: imageUrls,
      userId: firebase.auth().currentUser.uid,
      userEmail: firebase.auth().currentUser.email,
      baseId: localStorage.getItem('selectedBaseId') || '',
      baseName: localStorage.getItem('selectedBaseName') || '',
      status: 'available',
      forTransfer: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Firestore保存
    const docRef = await firebase.firestore().collection('assets').add(assetData);
    
    // QRコード生成は後で実装
    // TODO: QRコード機能を追加

    alert('資産を登録しました！');
    window.location.href = '/my-items.html';

  } catch (error) {
    console.error('登録エラー:', error);
    alert('登録に失敗しました: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = '登録する';
  }
}

// 画像アップロード
async function uploadImages() {
  const urls = [];
  const storage = firebase.storage();
  const currentUser = firebase.auth().currentUser;

  for (const file of selectedFiles) {
    try {
      // HEIC/HEIF形式の場合はJPEGに変換
      let uploadFile = file;
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        console.log('HEIC形式を検出、JPEG変換中...');
        uploadFile = await convertToJpeg(file);
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}_${randomStr}_${uploadFile.name}`;
      const storageRef = storage.ref(`items/${currentUser.uid}/${fileName}`);
      
      await storageRef.put(uploadFile);
      const url = await storageRef.getDownloadURL();
      urls.push(url);
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      throw error;
    }
  }

  return urls;
}
