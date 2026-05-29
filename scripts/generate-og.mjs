/**
 * OGP画像プリビルドスクリプト
 * 全ブログ記事のPNGを public/og/[slug].png として生成する
 * Cloudflare build時に `node scripts/generate-og.mjs` として実行される
 */

import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// フォント読み込み
const fontData = fs.readFileSync(path.join(ROOT, 'src/assets/fonts/NotoSansJP-Bold.ttf'));

// フロントマターをシンプルな正規表現でパース
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};

  // title
  const title = yaml.match(/^title:\s*['"]?(.*?)['"]?\s*$/m);
  if (title) result.title = title[1].replace(/^['"]|['"]$/g, '');

  // category
  const category = yaml.match(/^category:\s*['"]?(.*?)['"]?\s*$/m);
  if (category) result.category = category[1].replace(/^['"]|['"]$/g, '');

  // ogData block
  const ogDataMatch = yaml.match(/^ogData:\s*\r?\n((?:[ \t]+\S.*\r?\n?)*)/m);
  if (ogDataMatch) {
    const block = ogDataMatch[1];
    const get = (key) => {
      const m = block.match(new RegExp(`${key}:\\s*['"]?(.*?)['"]?\\s*$`, 'm'));
      return m ? m[1].replace(/^['"]|['"]$/g, '') : null;
    };
    result.ogData = {
      date: get('date'),
      nikkei: get('nikkei'),
      nikkeiChange: get('nikkeiChange'),
      nikkeiPct: get('nikkeiPct'),
    };
  }

  return result;
}

// カテゴリーバッジラベル
const categoryLabel = {
  deep: '詳しく',
  nikkei: '3分',
  memo: '投資メモ',
  glossary: '用語解説',
  weekly: '週次まとめ',
};

async function generateOgImage(slug, title, category, ogData) {
  const showNumbers = !!ogData && ['deep', 'nikkei'].includes(category);
  const isDown = ogData?.nikkeiChange?.startsWith('-');
  const numColor = isDown ? '#3b82f6' : '#ef4444';
  const arrow = isDown ? '▼' : '▲';
  const badge = categoryLabel[category] ?? '';
  const displayChange = ogData
    ? ogData.nikkeiChange.replace(/^[+-]/, '')
    : '';
  const shortTitle = title.length > 40 ? title.substring(0, 40) + '…' : title;

  const markup = html(`
    <div style="
      height:100%; width:100%; display:flex; flex-direction:column;
      justify-content:space-between; padding:56px 64px;
      background:#0c1a2e; color:#ffffff; font-family:'Noto Sans JP';
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; opacity:.6; font-size:26px;">
        <span>今日の日本株ノート</span>
        ${ogData ? `<span>${ogData.date}</span>` : ''}
      </div>

      ${showNumbers ? `
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:24px; opacity:.7; letter-spacing:.1em;">日経平均</div>
          <div style="display:flex; align-items:baseline; gap:24px;">
            <span style="font-size:80px; font-weight:700; white-space:nowrap;">${ogData.nikkei}<span style="font-size:48px;">円</span></span>
            <span style="font-size:52px; color:${numColor}; font-weight:700; white-space:nowrap;">
              ${arrow}${displayChange}円
            </span>
            <span style="font-size:36px; color:${numColor}; white-space:nowrap;">${ogData.nikkeiPct}</span>
          </div>
        </div>
      ` : `<div></div>`}

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${badge ? `
          <div style="
            display:inline-flex; width:fit-content;
            background:#1e40af; color:#fff; font-size:22px;
            padding:6px 20px; border-radius:4px;
          ">${badge}</div>
        ` : ''}
        <div style="font-size:34px; line-height:1.5; font-weight:700; opacity:.95;">
          ${shortTitle}
        </div>
      </div>
    </div>
  `);

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [{
      name: 'Noto Sans JP',
      data: fontData,
      weight: 700,
      style: 'normal',
    }],
  });

  const png = new Resvg(svg).render().asPng();
  return png;
}

async function main() {
  const blogDir = path.join(ROOT, 'src/content/blog');
  const outputDir = path.join(ROOT, 'public/og');

  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
  console.log(`Generating OGP images for ${files.length} posts...`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    const { title, category, ogData } = parseFrontmatter(content);

    if (!title) {
      console.warn(`  SKIP (no title): ${file}`);
      continue;
    }

    try {
      const png = await generateOgImage(slug, title, category ?? '', ogData ?? null);
      fs.writeFileSync(path.join(outputDir, `${slug}.png`), png);
      console.log(`  OK: ${slug}.png`);
      success++;
    } catch (err) {
      console.error(`  ERROR: ${slug} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} generated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
