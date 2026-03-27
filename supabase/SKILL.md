# 在庫管理アプリ — プロジェクトコンテキスト
# Lagerverwaltung v1.9.9

> **重要**: このファイルを最初に読んでください。プロジェクトの全体構造と技術情報が含まれています。

---

## アプリ概要
# PWA在庫管理システム — Okyu Gastro Group（日本食レストラン）
# スタック: HTML/CSS/JS + Supabase（PostgreSQL + Edge Functions）
# デプロイ: Vercel（GitHubからの自動デプロイ）
# URL: https://lageroriensookyu.vercel.app/
# GitHub: github.com/luanghjj/lagerverwaltung (ブランチ: main)
# 言語: ドイツ語（デフォルト）+ ベトナム語

---

## ファイル構造
```
├── index.html          # エントリーポイント、viewport-fit=cover
├── style.css           # CSS、PWAスタンドアロンのsafe-area含む
├── sw.js               # サービスワーカー、CACHE_NAME = 'lager-v1.9.9'
├── manifest.json       # PWAマニフェスト
├── SKILL.md            # このファイル（AIコンテキスト用）
├── js/
│   ├── config.js       # APP_VERSION、i18n、ヘルパー関数、権限管理
│   ├── supabase.js     # Supabaseクライアント、データ読み書き
│   ├── init.js         # アプリ初期化、自動ログイン、initPush()呼び出し
│   ├── login.js        # PIN認証ログイン、initPush()呼び出し
│   ├── push.js         # プッシュ通知：購読登録、Supabaseに保存
│   ├── offline.js      # オフラインキュー、バックグラウンド同期
│   ├── render.js       # サイドバー、ナビゲーション、ページルーティング
│   ├── dashboard.js    # ダッシュボードKPI、チャート
│   ├── data.js         # デフォルト/デモデータ（DEFオブジェクト）
│   └── ...             # その他のモジュール
├── supabase/
│   └── functions/
│       └── send-push/
│           └── index.ts  # プッシュ通知送信Edge Function
```

---

## Supabase設定
# URL: https://wetpcdsiaodnoeaekitu.supabase.co
# Anonキー: js/supabase.js 3行目に記載
# 主なテーブル: artikel, artikel_bestand, bewegungen, bestellungen, standorte, users, push_subscriptions

### push_subscriptionsテーブル
# RLS: 無効化済み（ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY）
# user_id: TEXT型（UUIDではない！ユーザーIDは "u1", "u2" 形式）

---

## プッシュ通知システム

### VAPIDキー
# Supabaseに3つのシークレット設定済み:
# - VAPID_PUBLIC_KEY
# - VAPID_PRIVATE_KEY  
# - VAPID_EMAIL
# 公開キーは js/push.js にも記載

### Edge Function: send-push
# 入力: { event_type, standort_id?, title, body, roles[] }
# 出力: { sent, total, expired }
# ロールと拠点でサブスクリプションをフィルタリング

### データベーストリガー（Supabase上）
# 1. trg_push_bewegung (bewegungenテーブル INSERT時)
#    - 入庫: "> Wareneingang [拠点名]" → admin, manager
#    - 出庫: "< Warenausgang [拠点名]" → admin, manager  
#    - 転送: "~ Umbuchung > [拠点名]" → admin, manager, staff
#
# 2. trg_push_bestellung (bestellungenテーブル INSERT時)
#    - 新規注文: "+ Neue Bestellung" → admin, manager
#
# 3. trg_push_low_stock (bewegungenテーブル INSERT時、在庫 < 最小在庫の場合)
#    - 最小在庫以下: "! Unter Mindestbestand" → admin, manager, staff

### プッシュテストコマンド
```bash
curl -s -X POST "https://wetpcdsiaodnoeaekitu.supabase.co/functions/v1/send-push" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","title":"テスト","body":"テスト通知！","roles":["admin","manager","staff"]}'
```

---

## ユーザーシステム
# ログイン: 6桁PINコード
# ロール: admin（管理者）, manager（店長）, staff（従業員）
# ユーザーID: 文字列形式 "u1", "u2"...（UUID形式ではない！）

---

## デプロイ手順
```bash
# Vercelへの自動デプロイ（git push）
git add -A && git commit -m "メッセージ"
git remote set-url origin https://luanghjj:<TOKEN>@github.com/luanghjj/lagerverwaltung.git
git push
git remote set-url origin https://github.com/luanghjj/lagerverwaltung.git
```

---

## 重要な注意事項
# 1. バージョン変更時: sw.js, index.html, js/config.js の3ファイルを更新
# 2. iPhoneセーフエリア: .hb と #app に env(safe-area-inset-top) 必須
# 3. push_subscriptionsが空 → ユーザー未登録 → コンソール [Push] ログ確認
# 4. オフライン: オフラインキューあり、オンライン復帰時に自動同期
# 5. フォルダ名は自由に変更可能 — Git/Vercelはコンテンツで追跡
