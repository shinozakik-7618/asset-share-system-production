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

let selectedImages = [];
let uploadedImageUrls = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 拠点設定チェック
  }
  
  // 大分類変更イベント
  document.getElementById('largeCategory').addEventListener('change', updateMediumCategory);
  
  // 画像選択イベント
  document.getElementById('imageInput').addEventListener('change', handleImageSelect);
  
  // フォーム送信イベント
  document.getElementById('registerForm').addEventListener('submit', handleSubmit);
});

// 中分類を更新
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

// 画像選択処理
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  
  // 最大5枚チェック
  if (selectedImages.length + files.length > 5) {
    alert('画像は最大5枚までです');
    return;
  }
  
  // ファイルサイズチェック（5MB以下）
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      alert(`${file.name} のサイズが大きすぎます（最大5MB）`);
      return;
    }
  }
  
  // 画像を追加
  files.forEach(file => {
    selectedImages.push(file);
    displayImagePreview(file);
  });
  
  // input をリセット
  e.target.value = '';
}

// 画像プレビュー表示
function displayImagePreview(file) {
  const container = document.getElementById('imagePreviewContainer');
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const index = selectedImages.length - 1;
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    preview.innerHTML = `
      <img src="${e.target.result}" alt="プレビュー">
      <button type="button" class="image-remove" onclick="removeImage(${index})">×</button>
    `;
    container.appendChild(preview);
  };
  
  reader.readAsDataURL(file);
}

// 画像削除
function removeImage(index) {
  selectedImages.splice(index, 1);
  
  // プレビューを再描画
  const container = document.getElementById('imagePreviewContainer');
  container.innerHTML = '';
  selectedImages.forEach(file => displayImagePreview(file));

// フォーム送信
async function handleSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '登録中...';
  
  try {
    // ユーザー情報取得
    const userData = await getCurrentUserData();
    if (!userData || !userData.baseId) {
      throw new Error('拠点情報が取得できません');
    }
    
    // 画像をアップロード
    uploadedImageUrls = await uploadImages();
    
    // フォームデータ取得
    const formData = {
      images: uploadedImageUrls,
      largeCategory: document.getElementById('largeCategory').value,
      mediumCategory: document.getElementById('mediumCategory').value,
      itemName: document.getElementById('itemName').value,
      quantity: parseInt(document.getElementById('quantity').value),
      
      ownerUserId: userData.uid,
      ownerName: userData.displayName,
      ownerBaseId: userData.baseId,
      ownerBaseName: userData.baseName,
      ownerRegionName: userData.regionName,
      ownerBlockName: userData.blockName,
      
      
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Firestore に保存
    await db.collection('assets').add(formData);
    
    alert('資産登録が完了しました！');
    window.location.href = '/home.html';
    
  } catch (error) {
    console.error('登録エラー:', error);
    alert('資産登録に失敗しました: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = '資産登録する';
  }
}

// 画像をアップロード
async function uploadImages() {
  const urls = [];
  
  for (let i = 0; i < selectedImages.length; i++) {
    const file = selectedImages[i];
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${randomStr}_${file.name}`;
    const storageRef = storage.ref(`items/${currentUser.uid}/${fileName}`);
    
    // アップロード
    const snapshot = await storageRef.put(file);
    const url = await snapshot.ref.getDownloadURL();
    urls.push(url);
  }
  
  return urls;
}
}
