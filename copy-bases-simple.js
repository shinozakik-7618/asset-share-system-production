const admin = require('firebase-admin');

// 開発環境の設定
const devApp = admin.initializeApp({
  projectId: 'base-asset-sharing-system'
}, 'dev');

// 本番環境の設定
const prodApp = admin.initializeApp({
  projectId: 'asset-sharing-production'
}, 'prod');

const devDb = devApp.firestore();
const prodDb = prodApp.firestore();

async function copyBases() {
  try {
    console.log('📤 開発環境からデータを取得中...');
    
    // 開発環境からデータ取得
    const snapshot = await devDb.collection('baseMaster').get();
    console.log(`✅ ${snapshot.size}件の拠点データを取得しました`);
    
    console.log('📥 本番環境にデータをコピー中...');
    
    // 本番環境にコピー
    const batch = prodDb.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      const docRef = prodDb.collection('baseMaster').doc(doc.id);
      batch.set(docRef, doc.data());
      count++;
      
      if (count % 50 === 0) {
        console.log(`  ${count}件コピー済み...`);
      }
    });
    
    await batch.commit();
    console.log(`✅ 完了！${count}件の拠点データを本番環境にコピーしました`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

copyBases();
