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
	}),
});

export const collections = { blog };
