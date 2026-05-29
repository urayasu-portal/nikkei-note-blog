import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = true;

const fontPath = path.resolve('./src/assets/fonts/NotoSansJP-Bold.ttf');
const fontData = fs.readFileSync(fontPath);

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      category: post.data.category ?? '',
      ogData: post.data.ogData ?? null,
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, category, ogData } = props as {
    title: string;
    category: string;
    ogData: { date: string; nikkei: string; nikkeiChange: string; nikkeiPct: string } | null;
  };

  const showNumbers = !!ogData && ['deep', 'nikkei'].includes(category);
  const isDown = ogData?.nikkeiChange?.startsWith('-');
  const numColor = isDown ? '#3b82f6' : '#ef4444';
  const arrow = isDown ? '▼' : '▲';

  const categoryLabel: Record<string, string> = {
    deep: '詳しく',
    nikkei: '3分',
    memo: '投資メモ',
    glossary: '用語解説',
    weekly: '週次まとめ',
  };
  const badge = categoryLabel[category] ?? '';

  const displayChange = ogData
    ? ogData.nikkeiChange.replace(/^[+-]/, '').replace(/^-/, '')
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
          <div style="display:flex; align-items:baseline; gap:24px; flex-wrap:nowrap;">
            <span style="font-size:80px; font-weight:700; white-space:nowrap;">${ogData!.nikkei}<span style="font-size:48px;">円</span></span>
            <span style="font-size:52px; color:${numColor}; font-weight:700; white-space:nowrap;">
              ${arrow}${displayChange}円
            </span>
            <span style="font-size:36px; color:${numColor}; white-space:nowrap;">${ogData!.nikkeiPct}</span>
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

  const svg = await satori(markup as Parameters<typeof satori>[0], {
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

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
