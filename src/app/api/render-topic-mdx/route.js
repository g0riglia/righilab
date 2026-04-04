import { NextResponse } from "next/server";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export const runtime = "nodejs";

/**
 * Serializza per il client (<MDXRemote />).
 * format: 'md' = parsing come Markdown, non MDX completo: le graffe `{` `}` nel testo
 * (es. insiemi, tuple scritte dall’AI) non vengono interpretate come JSX e non mandano in errore il compile.
 * rehype-pretty-code (Shiki) evidenzia i blocchi codice in fase di compile.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const source = typeof body?.source === "string" ? body.source : "";
    if (!source.trim()) {
      return NextResponse.json({ error: "source (stringa MDX) obbligatorio" }, { status: 400 });
    }

    const mdxSerialized = await serialize(source, {
      mdxOptions: {
        format: "md",
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: "github-dark",
              keepBackground: true,
            },
          ],
        ],
      },
    });

    return NextResponse.json(mdxSerialized);
  } catch (err) {
    console.error("[render-topic-mdx]", err);
    return NextResponse.json(
      { error: err?.message || "Errore nel rendering MDX" },
      { status: 500 }
    );
  }
}
