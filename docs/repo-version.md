# レポジトリ、バージョン管理(Git, Jujutsu, Github)

## 1. 開発環境の初期セットアップ (First Step)

### 🚨 絶対厳守
* **.env はコミットしない**: APIキーの流出は即死。`.gitignore` に入っているか確認せよ。
* **依存関係のロック**:
    * **Frontend**: `npm ci` (または `pnpm install --frozen-lockfile`) を使う。`npm install` は禁止（lockファイルを書き換えるため）。
    * **Backend**: `requirements.txt` / `pyproject.toml` と同期する。
* **Auto Format**:
    * VSCode / AstroNvim で **「保存時にフォーマット (Format On Save)」** を有効にする。
    * Formatterが動いていないコードはPush禁止。

---

## 2. ローカルワークフロー (Local Workflow)

**「mainを壊さない」**

### 🔄 共通ゴールデンルール (The Golden Rule)
Pull Request (PR) を作成・Pushする直前に、**必ず最新の `main` を取り込んで手元でテストする** こと。
GitHub上でコンフリクト解消を行ってはならない。

### 🅰️ Git ユーザーの動き (Safety First)
無理にRebaseせず、Mergeで安全に合流する。

1.  **最新取得**: `git fetch origin`
2.  **取り込み**: `git merge origin/main`
    * *ここでコンフリクトしたらエディタで修正 -> add -> commit*
3.  **動作確認**: アプリが動くか確認。
4.  **Push**: `git push origin feature/xxx`

### 🅱️ jj (Jujutsu) ユーザーの動き (Clean History)
Rebaseを駆使し、履歴を一直線に保つ。

1.  **最新取得**: `jj git fetch`
2.  **取り込み**: `jj rebase -d main`
    * *コンフリクトしたら修正して保存するだけ (Snapshot)*
3.  **動作確認**: テスト実行。
4.  **Push**: `jj git push`

---

## 3. リモートワークフロー (GitHub Strategy)

### 🛡️ CI / GitHub Actions
* **検証内容**: Lint (構文チェック) と Build (コンパイル/型チェック) のみ。
* **実行しない**: テストDBの立ち上げや `docker compose up` は行わない（遅い・不安定なため）。
* **APIキー**: CI上ではダミー値を使用し、外部通信のエラーを防ぐ。

### 🤝 Pull Request & Review
* **粒度**: 「1機能」または「数時間分」の作業でPRを出す。巨大なPRは却下。
* **Description**: **UI変更時は必ずスクショ/動画を貼る。** 説明は箇条書き3行で。
* **レビュー基準**:
    * 「動くか？」「仕様を満たすか？」のみを見る。
    * コードスタイル（インデント等）はCIに任せる。人間が指摘しない。
    * 通知が来たら**作業を中断して即レス**する。LGTMレスポンス1つで承認OK。

### 🔀 Merge
* **担当**: **PR作成者本人** が行う（コンフリクト対応の責任を持つため）。
* **方法**: **Squash and Merge** を使用し、履歴を圧縮する。

---

## 4. コミュニケーション & トラブル対応

### 📢 通知 (Notification)
* **Discord専用サーバー** を使用する。
* **GitHub Bot** を導入し、PR/Issue/Reviewの通知を集約する。
* 通知チャンネルは「召集令状」。通知が来たら全員見る。

### 💣 緊急事態 (Emergency)
* CIが落ちているが、デモ直前でどうしてもマージが必要な場合のみ、リーダー（Admin）が強制マージを行う。
* コンフリクトでパニックになったら、迷わず `lazygit` (またはVSCode GUI) を起動する。
