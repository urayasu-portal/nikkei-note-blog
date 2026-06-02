# 今日の日本株ノート プロンプト管理

今日の日本株ノート（nikkei-note.com）の運用プロンプトを管理するディレクトリです。

## プロンプト一覧

| ファイル | 役割 | 用途 |
|---|---|---|
| [prompts/research.md](prompts/research.md) | リサーチ | 相場データの収集・整理 |
| [prompts/deep.md](prompts/deep.md) | 深掘りノート作成 | 詳細分析記事（deepカテゴリー） |
| [prompts/nikkei.md](prompts/nikkei.md) | 日経ノート作成 | 通常版記事（nikkeiカテゴリー） |
| [prompts/weekly.md](prompts/weekly.md) | 週次まとめ作成 | 週次振り返り記事（weeklyカテゴリー） |
| [prompts/word.md](prompts/word.md) | 用語解説作成 | 用語解説記事（glossaryカテゴリー） |

## 運用フロー

```
① research.md   →  相場情報を収集・14項目で整理
        ↓
② deep.md       →  詳細分析記事（YYYYMMDD-deep.md）を作成
        ↓
③ nikkei.md     →  ①②をもとに通常版記事（YYYYMMDD-nikkei.md）を作成
        ↓ （週末）
④ weekly.md     →  その週の深掘りノートをもとに週次まとめを作成
```

⑤ word.md は独立して、任意のタイミングで用語解説記事を作成。

## Raw URL（Claude web_fetch 用）

```
https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/research.md
https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/deep.md
https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/nikkei.md
https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/weekly.md
https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/word.md
```

## Claudeへの指示フレーズ（コピー用）

### ① リサーチ
```
今日（YYYY年MM月DD日）のリサーチをしてください。
リサーチプロンプト：https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/research.md
```

### ② 深掘りノート作成
```
上記リサーチ結果をもとに深掘りノートを作成してください。
深掘りノートプロンプト：https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/deep.md
```

### ③ 日経ノート作成
```
上記リサーチ結果と深掘りノートをもとに通常版記事を作成してください。
日経ノートプロンプト：https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/nikkei.md
```

### ④ 週次まとめ作成
```
今週（MM月DD日〜DD日）の週次まとめを作成してください。
週次まとめプロンプト：https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/weekly.md
```

### ⑤ 用語解説作成
```
「（用語名）」の用語解説記事を作成してください。
用語解説プロンプト：https://raw.githubusercontent.com/urayasu-portal/nikkei-note-blog/main/prompts/word.md
```

## プロンプト更新手順

1. 該当ファイルをGitHub上で直接編集（または git push）
2. このREADMEの「プロンプト一覧」テーブルを必要に応じて更新する
3. コミットメッセージ例：`update deep.md: 構成ブロック追加`

> ファイル名は変更しないこと。URLが変わるとClaudeへの指示文も書き換えが必要になります。
