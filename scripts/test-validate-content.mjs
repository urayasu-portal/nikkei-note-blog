#!/usr/bin/env node
/**
 * validate-content.mjs の編集者メモ検出のテスト。
 * 一時ディレクトリにテスト記事を1本ずつ置いて検証を実行し、
 * 終了コードと出力を確認する（src/content/blog には触れない）。
 *
 * 使い方: node scripts/test-validate-content.mjs
 */

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const FM = `---
title: 'テスト記事'
description: 'テスト用の記事です'
pubDate: '2026-10-17'
category: 'nikkei'
---
`;
const BODY = `<h2>日経平均は続伸</h2>
<p>日経平均は前日比100円高でした。</p>
`;

const cases = [
	// [名前, ファイル名, 内容, 失敗すべきか, 出力に含まれるべき文字列]
	['正常な記事', 'a.md', FM + BODY, false, '記事検証OK'],
	['正常な記事（CRLF・BOM付き）', 'a.md', '﻿' + (FM + BODY).replace(/\n/g, '\r\n'), false, '記事検証OK'],
	['通常のHTMLコメントは通す', 'a.md', FM + BODY + '<!-- AFFILIATE: ネット証券口座開設 -->\n', false, '記事検証OK'],
	['「非公開化」「TOB」などの記事用語は通す', 'a.md', FM + BODY + '<p>MBOによる非公開化報道でストップ高。公開買い付け（TOB）も発表。</p>\n', false, '記事検証OK'],
	['frontmatter の値は対象外', 'a.md', FM.replace("description: 'テスト用の記事です'", "description: '編集者メモの書き方'") + BODY, false, '記事検証OK'],
	['本文の <h2>編集者メモ', 'a.md', FM + BODY + '<h2>編集者メモ（非公開）</h2>\n<p>【手動確認が必要な数値】</p>\n', true, '本文に編集者メモの見出し'],
	['本文の ## 編集者メモ', 'a.md', FM + BODY + '---\n\n## 編集者メモ（公開しない）\n\n- 寄与度は暫定\n', true, '本文に編集者メモの見出し'],
	['本文の ■ 編集者メモ', 'a.md', FM + BODY + '■ 編集者メモ\n・ドル円は推定\n', true, '本文に編集者メモの見出し'],
	['プロンプト出力項目（■ 抜粋／■ タグ）', 'a.md', FM + BODY + '■ 抜粋\n要約です\n\n■ タグ\n日経平均, 日本株\n', true, '記事生成プロンプトの出力項目'],
	['HTMLコメントの編集者メモ', 'a.md', FM + BODY + '<!--\n【編集者メモ・公開前に削除】\n・TOPIXは要確認\n-->\n', true, 'コメント内に編集者メモ'],
	['閉じ忘れのHTMLコメント', 'a.md', FM + BODY + '<!--\n■ 編集者メモ（公開しない）\n・SOXは未確認\n', true, 'コメントが閉じていません'],
	['HTMLコメントの要手動確認', 'a.md', FM + BODY + '<!--\n【要手動確認】\n1. USD/JPY：確認できず\n-->\n', true, 'コメント内に編集者メモ'],
	['MDXコメントの編集者メモ', 'a.mdx', FM + BODY + '{/* 編集者メモ：公開前に削除 */}\n', true, 'コメント内に編集者メモ'],
	['本文中の確認指示は警告のみ', 'a.md', FM + BODY + '<p>15:30時点の正確な値は要手動確認。</p>\n', false, '本文に確認指示らしき記述'],
];

let failed = 0;
for (const [name, file, content, shouldFail, expect] of cases) {
	const dir = mkdtempSync(join(tmpdir(), 'validate-test-'));
	try {
		writeFileSync(join(dir, file), content);
		const env = { ...process.env };
		delete env.CI; // 隔離（ファイル削除）を動かさない
		const r = spawnSync(process.execPath, ['scripts/validate-content.mjs', dir], { encoding: 'utf8', env });
		const out = `${r.stdout}\n${r.stderr}`;
		const ok = (r.status !== 0) === shouldFail && out.includes(expect);
		if (!ok) failed++;
		console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}（終了コード ${r.status}）`);
		if (!ok) console.log(out.split('\n').map((l) => `      ${l}`).join('\n'));
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

console.log(`\n${cases.length - failed}/${cases.length} 件成功`);
process.exit(failed ? 1 : 0);
