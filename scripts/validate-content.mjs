#!/usr/bin/env node
/**
 * 記事の書式検証。ビルド前に走らせて、原因の分かりにくいビルド失敗を防ぐ。
 *
 * 背景:
 *   2026-08 に「浦安ぽーたる（Hugo）の記事が本リポジトリへ誤ってpushされる」事故と
 *   「checkPoints が文字列配列で投稿される」事故が繰り返し発生し、そのたびに
 *   Astro のスキーマ検証が失敗してサイト全体のデプロイが停止した。
 *   Astro のエラーは原因ファイルが分かりにくいため、ここで先に明示的に落とす。
 *
 *   pre-commit フックは core.hooksPath を設定したクローンでしか動かず、
 *   実際の投稿は別環境から行われていたため素通りしていた。
 *   このスクリプトは CI（GitHub Actions）で走るので、投稿元がどこでも検出できる。
 *
 * 使い方: node scripts/validate-content.mjs
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BLOG_DIR = 'src/content/blog';

/** frontmatter 部分を取り出す（BOM と CRLF を除去） */
function extractFrontmatter(input) {
	const raw = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
	const text = raw.replace(/\r\n/g, '\n');
	if (!text.startsWith('---\n')) return null;
	const end = text.indexOf('\n---', 3);
	if (end === -1) return null;
	return text.slice(4, end);
}

/** 'key:' が行頭にあるか */
function hasKey(fm, key) {
	return new RegExp(`^${key}:`, 'm').test(fm);
}

const errors = [];
const warnings = [];

const files = readdirSync(BLOG_DIR)
	.filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
	.sort();

for (const name of files) {
	const path = join(BLOG_DIR, name);
	const raw = readFileSync(path, 'utf8');
	const fm = extractFrontmatter(raw);

	if (fm === null) {
		errors.push([path, 'frontmatter を読み取れません（--- で囲まれていない可能性）']);
		continue;
	}

	// --- 他サイト（浦安ぽーたる / Hugo）の記事の混入 ------------------
	if (!hasKey(fm, 'pubDate')) {
		errors.push([
			path,
			'pubDate がありません（スキーマ必須）',
			'浦安ぽーたるの記事を誤って投稿していませんか？',
			'浦安の記事は urayasu-portal リポジトリの content/posts/ に置いてください',
		]);
	}

	if (hasKey(fm, 'categories')) {
		errors.push([
			path,
			'categories:（複数形）は浦安ぽーたるの書式です',
			'本サイトは category:（単数形）を使います',
		]);
	}

	if (raw.includes('{{<')) {
		errors.push([
			path,
			'Hugo ショートコード {{< >}} が含まれています（浦安ぽーたるの書式）',
			'Astro では展開されず、そのまま本文に表示されてしまいます',
		]);
	}

	// --- スキーマ必須フィールド ---------------------------------------
	for (const key of ['title', 'description']) {
		if (!hasKey(fm, key)) {
			errors.push([path, `${key} がありません（スキーマ必須）`]);
		}
	}

	// --- checkPoints の書式 -------------------------------------------
	// スキーマ側で文字列配列も受け付けるよう正規化しているためビルドは通るが、
	// 正式な形式ではないので警告して次回以降の投稿を正す。
	if (hasKey(fm, 'checkPoints')) {
		const after = fm.split(/^checkPoints:/m)[1] ?? '';
		const firstItem = after.split('\n').find((l) => /^\s*-/.test(l));
		if (firstItem && !/^\s*-\s*title:/.test(firstItem)) {
			warnings.push([
				path,
				'checkPoints が文字列配列です（自動変換されますが正式な形式ではありません）',
				"正しい形式:  - title: '見出し'  /  次行に  text: '本文'",
			]);
		}
	}
}

const fmt = (list) =>
	list
		.map(([path, ...lines]) =>
			[`  ${path}`, ...lines.map((l, i) => `      ${i === 0 ? '→' : ' '} ${l}`)].join('\n')
		)
		.join('\n');

if (warnings.length > 0) {
	console.warn(`\n[警告] ${warnings.length} 件\n${fmt(warnings)}`);
}

if (errors.length > 0) {
	console.error(`\n[エラー] ${errors.length} 件\n${fmt(errors)}`);
	console.error('\n記事の書式が正しくないためビルドを中止しました。');
	process.exit(1);
}

console.log(`記事検証OK（${files.length}件）${warnings.length ? ` / 警告 ${warnings.length}件` : ''}`);
