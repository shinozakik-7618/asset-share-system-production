// 中分類マスタ
const mediumCategories = {
  '机類': ['生徒用机', '講師用机'],
  '椅子類': ['生徒用椅子', '講師用椅子'],
  'PC・周辺機器': ['デスクトップPC', 'ノートPC', 'プリンター', 'モニター'],
  '教材・備品': ['ホワイトボード', 'プロジェクター', '本棚', '教材'],
  'その他': ['その他']
};

let selectedImages = [];
let uploadedImageUrls = [];

// ページ読み込み時
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
}

// Step 2 へ移動
function goToStep2() {
  // Step 1 のバリデーション
  const form = document.getElementById('registerForm');
  const step1Inputs = form.querySelectorAll('#step1 [required]');
  let isValid = true;
  
  step1Inputs.forEach(input => {
    if (!input.checkValidity()) {
      isValid = false;
      input.reportValidity();
    }
  });
  
  if (!isValid) return;
  
  // 画像チェック
  if (selectedImages.length === 0) {
    alert('写真を最低1枚選択してください');
    return;
  }
  
  // Step 切り替え
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
  window.scrollTo(0, 0);
}

// Step 1 へ戻る
function goToStep1() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  window.scrollTo(0, 0);
}

// フォーム送信
async function handleSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '出品中...';
  
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
      size: document.getElementById('size').value || '',
      condition: document.getElementById('condition').value || '',
      transferCost: parseInt(document.getElementById('transferCost').value),
      usageStatus: document.querySelector('input[name="usageStatus"]:checked').value,
      notes: document.getElementById('notes').value || '',
      
      ownerUserId: userData.uid,
      ownerName: userData.displayName,
      ownerBaseId: userData.baseId,
      ownerBaseName: userData.baseName,
      ownerRegionName: userData.regionName,
      ownerBlockName: userData.blockName,
      
      status: 'available',
      applicants: [],
      
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Firestore に保存
    await db.collection('items').add(formData);
    
    alert('出品が完了しました！');
    window.location.href = '/my-items.html';
    
  } catch (error) {
    console.error('出品エラー:', error);
    alert('出品に失敗しました: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = '出品する';
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
