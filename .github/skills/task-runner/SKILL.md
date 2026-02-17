---
name: task-runner
description: Project command execution using Taskfile. Use this skill when the user asks to run, build, test, or setup the project.
---

# Taskfile Execution Skill

このプロジェクトでは、すべての主要な操作（ビルド、テスト、環境構築、Lintなど）に `go-task` (Taskfile.yml) を使用します。

## 指導原則

- 直接 `npm install` や `vitest` を実行せず、必ず `Taskfile.yml` を確認してください。
- コマンドを実行する際は、`task <task_name>` の形式で使用してください。
- ユーザーから「テストして」「環境構築して」と言われたら、まず `task --list` で利用可能なタスクを確認してください。

## 主要なタスク例

- セットアップ: `task init`
- テスト実行: `task test`
- E2Eテスト: `task test:e2e`
- コンポーネント追加: `task add-ui`
