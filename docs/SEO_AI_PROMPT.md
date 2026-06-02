# SEO content with AI (Gemini / ChatGPT)

Use this when expanding the remaining **indexed** slugs in `src/lib/seo.ts`.

## Rules (avoid thin / duplicate content)

1. **Never** translate EN → JP for indexable JP pages. Write JP from scratch (different examples, Japanese API conventions).
2. Each slug must include: **example input**, **3+ steps**, **2+ pitfalls**, **2+ FAQ**, **one comparison table or paragraph**.
3. Do **not** reuse the old "Dev Diary" template tone across pages.
4. Filename: `src/data/content/{slug}.html` or `src/data/content/jp/{slug}.html`
5. After adding JP original content, add slug to `INDEXED_JP_SLUGS` in `src/lib/seo.ts`.

## Prompt template (paste into Gemini)

```
Write an HTML fragment (no <html>/<body>, only h2/h3/p/ul/ol/pre/code/table) for TypeFlow Pro converter page: "{slug}".

Audience: senior developers.
Must include:
- One realistic copy-paste example for the input format
- Step-by-step workflow (4 steps)
- "Common mistakes" (3 bullets)
- Short comparison vs doing it manually or vs QuickType
- FAQ (3 questions)

Tone: practical, no hype, no "Dev Diary", no fake quotes.
Length: 400-700 words equivalent.
Language: {English | Japanese — original, not translation}
```

## Indexed EN slugs still on old AI template

Regenerate when you have time: see `INDEXED_EN_SLUGS` in `src/lib/seo.ts` minus the five flagship slugs already rewritten.
