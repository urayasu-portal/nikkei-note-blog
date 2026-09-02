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
 *   2026-09-03 改修: Hugo 記事の混入を「エラーで全体停止」から「隔離して続行」に変更。
 *   誤混入は 8/13・8/19・9/2 と繰り返しており、そのたびにサイト全体のデプロイが
 *   止まっていた。混入ファイルは CI ワークスペース上で削除してビルドから外し
 *   （リポジトリからは消えない。後で revert が必要）、::warning:: 注釈と
 *   ジョブサマリーで知らせる。残りの記事のデプロイは止めない。
 *   ※ 隔離（ファイル削除）は CI 環境（$CI が設定されている時）のみ。
 *     ローカル実行では削除せずエラー扱いにする。
 *
 * 使い方: node scripts/validate-content.mjs
 */

import { readdirSync, readFileSync, unlinkSync, appendFileSync } from 'node:fs';
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
const quarantined = [];

// 隔離（ワークスペースからの削除）は CI でのみ行う。ローカルで走らせた場合に
// 実ファイルを消してしまわないため。
const canQuarantine = !!process.env.CI;

/** Hugo（浦安ぽーたる）記事の混入かどうか。理由の配列を返す（空なら混入ではない） */
function hugoSignals(fm, raw) {
	const signals = [];
	if (!hasKey(fm, 'pubDate') && hasKey(fm, 'date')) {
		signals.push('pubDate がなく date:（Hugo の書式）があります');
	}
	if (hasKey(fm, 'categories')) {
		signals.push('categories:（複数形）は浦安ぽーたるの書式です（本サイトは category: 単数形）');
	}
	if (raw.includes('{{<')) {
		signals.push('Hugo ショートコード {{< >}} が含まれています（Astro では展開されません）');
	}
	return signals;
}

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
	// pubDate がなく Hugo の痕跡があるファイルは Astro のスキーマ検証で確実に
	// ビルドが落ちるため、そのファイルだけ隔離して残りのデプロイを続行する。
	// pubDate がある（＝ビルドは通る）記事の Hugo 痕跡は警告に留める。
	// 正規の記事を誤検知で黙って非公開にしないため、隔離条件は保守的にする。
	const signals = hugoSignals(fm, raw);
	const wouldFailBuild = !hasKey(fm, 'pubDate');
	if (signals.length > 0 && wouldFailBuild) {
		if (canQuarantine) {
			unlinkSync(path);
			quarantined.push([
				path,
				...signals,
				'このファイルをビルドから隔離しました（リポジトリには残っています）',
				'浦安の記事なら urayasu-portal の content/posts/ へ移し、このリポジトリでは revert してください',
			]);
		} else {
			errors.push([
				path,
				...signals,
				'浦安ぽーたるの記事を誤って投稿していませんか？',
				'浦安の記事は urayasu-portal リポジトリの content/posts/ に置いてください',
			]);
		}
		continue; // このファイルの以降のチェックは不要
	}
	if (signals.length > 0) {
		warnings.push([path, ...signals, 'ビルドは通りますが本文や分類が正しく表示されない可能性があります']);
	}

	if (!hasKey(fm, 'pubDate')) {
		errors.push([path, 'pubDate がありません（スキーマ必須）']);
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

if (quarantined.length > 0) {
	console.warn(`\n[隔離] ${quarantined.length} 件 — 他サイトの記事の混入をビルドから外しました\n${fmt(quarantined)}`);
	// Actions の run ページに黄色い警告注釈を出す（メッセージは1行・URLエンコード不要な範囲で）
	for (const [path] of quarantined) {
		console.log(
			`::warning file=${path}::浦安ぽーたるの記事の混入を検出し、ビルドから隔離しました。urayasu-portal へ移して本リポジトリでは revert してください。`
		);
	}
	// ジョブサマリー（run ページ下部に Markdown で表示）
	if (process.env.GITHUB_STEP_SUMMARY) {
		const summary = [
			'## ⚠️ 他サイトの記事の混入を隔離しました',
			'',
			'以下のファイルは Hugo（浦安ぽーたる）形式のためビルドから外しました。**サイトのデプロイは続行しています。**',
			'',
			...quarantined.map(([path]) => `- \`${path}\``),
			'',
			'### やること',
			'1. 記事が `urayasu-portal` リポジトリの `content/posts/` にあるか確認（なければ移す）',
			'2. このリポジトリで該当コミットを revert（ファイルはリポジトリに残ったままです）',
			'',
		].join('\n');
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
	}
}

if (warnings.length > 0) {
	console.warn(`\n[警告] ${warnings.length} 件\n${fmt(warnings)}`);
}

if (errors.length > 0) {
	console.error(`\n[エラー] ${errors.length} 件\n${fmt(errors)}`);
	console.error('\n記事の書式が正しくないためビルドを中止しました。');
	process.exit(1);
}

console.log(
	`記事検証OK（${files.length - quarantined.length}件）` +
		`${quarantined.length ? ` / 隔離 ${quarantined.length}件` : ''}` +
		`${warnings.length ? ` / 警告 ${warnings.length}件` : ''}`
);
