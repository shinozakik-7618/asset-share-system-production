// CSVエクスポート機能

async function exportCSV() {
  try {
    console.log('CSVエクスポート開始...');
    
    // 現在のユーザー情報を取得
    const user = firebase.auth().currentUser;
    if (!user) {
      alert('ログインしてください');
      return;
    }
    
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    
    // 資産を取得（自分の拠点のみ）
    const snapshot = await firebase.firestore()
      .collection('assets')
      .where('ownerBaseId', '==', userData.baseId)
      .get();
    
    if (snapshot.empty) {
      alert('エクスポートする資産がありません');
      return;
    }
    
    console.log('取得した資産数:', snapshot.size);
    
    // CSVヘッダー
    const headers = [
      '資産名',
      '大分類',
      '中分類',
      '数量',
      '金額（税抜）',
      'サイズ',
      'メモ',
      '所有拠点',
      'ブロック',
      '地域',
      '登録日',
      '利用状況',
      'QRコード'
    ];
    
    // CSVデータ作成
    const rows = [headers];
    
    snapshot.forEach(doc => {
      const asset = doc.data();
      const createdAt = asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString('ja-JP') : '';
      
      rows.push([
        asset.assetName || '',
        asset.largeCategoryName || '',
        asset.mediumCategoryName || '',
        asset.quantity || 1,
        asset.amount || 0,
        asset.size || '',
        asset.memo || '',
        asset.baseName || '',
        asset.block || '',
        asset.region || '',
        createdAt,
        asset.status === 'available' ? '利用可能' : asset.status === 'in-use' ? '利用中' : asset.status === 'for-transfer' ? '譲渡待ち' : '',
        asset.qrCodeText || doc.id
      ]);
    });
    
    // CSV文字列に変換
    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // BOM付きでダウンロード（Excelで正しく開くため）
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロード
    const link = document.createElement('a');
    link.href = url;
    const fileName = `資産一覧_${userData.baseName}_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}.csv`;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
    
    console.log('CSVエクスポート完了:', fileName);
    
  } catch (error) {
    console.error('CSVエクスポートエラー:', error);
    alert('CSVエクスポートに失敗しました: ' + error.message);
  }
}
