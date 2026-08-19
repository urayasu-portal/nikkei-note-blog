import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const blog = defineCollection({
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		category: z.string().optional(),
		ogData: z.object({
			date: z.string(),
			nikkei: z.string(),
			nikkeiChange: z.string(),
			nikkeiPct: z.string(),
		}).optional(),
		nikkei: z.string().optional(),
		nikkeiDate: z.string().optional(),
		topix: z.string().optional(),
		topixDate: z.string().optional(),
		usd: z.string().optional(),
		usdDate: z.string().optional(),
		dow: z.string().optional(),
		dowDate: z.string().optional(),
		nasdaq: z.string().optional(),
		nasdaqDate: z.string().optional(),
		// トップページ自動更新用
		weeklyThemes: z.array(z.string()).optional(),
		// 正式な形式は { title, text } のオブジェクト。
		// ただし記事生成時に 'タイトル：本文' の文字列配列で投稿される事故が繰り返され
		// （2026-08 に4回）、その都度サイト全体のデプロイが停止した。
		// 1本の書式ミスで全記事の公開が止まらないよう、文字列で来た場合は
		// 先頭のコロンで分割して正規化する。正規化できない場合も落とさない。
		checkPoints: z.array(
			z.union([
				z.object({
					title: z.string(),
					text:  z.string(),
				}),
				z.string().transform((s) => {
					const m = s.match(/^\s*([^\n：:]{1,20})[：:]\s*([\s\S]+)$/);
					return m
						? { title: m[1].trim(), text: m[2].trim() }
						: { title: '注目点', text: s.trim() };
				}),
			])
		).optional(),
		// 用語解説専用フィールド
		tags:            z.array(z.string()).optional(),
		relatedDeep:     z.string().optional(),
		relatedGlossary: z.array(z.string()).optional(),
	}),
});

export const collections = { blog };
