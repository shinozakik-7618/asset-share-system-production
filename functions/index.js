const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();

// 経費振替作成時にメール通知
exports.sendExpenseTransferEmail = onDocumentCreated(
  "expenseTransfers/{transferId}",
  async (event) => {
    const transferData = event.data.data();
    
    // 自動作成された経費振替のみ通知
    if (!transferData.autoCreated) {
      return null;
    }

    const emailData = {
      to: "shinozakik@pcdepot.jp", // 送信先メールアドレス
      subject: `【経費振替通知】${transferData.assetName}の譲渡が承認されました`,
      body: `
経費振替が自動作成されました。

【資産情報】
資産名: ${transferData.assetName}
譲渡元: ${transferData.fromBaseName}
譲渡先: ${transferData.toBaseName}
金額: ¥${transferData.amount.toLocaleString()}
理由: ${transferData.reason}
振替日: ${transferData.transferDate}

詳細は以下のURLからご確認ください：
https://base-asset-sharing-system.web.app/expense-transfer.html
      `
    };

    console.log("メール送信データ:", emailData);
    
    // 実際のメール送信はメールサービス（SendGrid等）が必要
    // ここではログ出力のみ
    return null;
  }
);
