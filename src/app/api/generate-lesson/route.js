import { NextResponse } from "next/server";
import {
  generateLesson,
  buildContentForAI,
} from "@/lib/gemini";
import {
  extractTextFromFiles,
  extractTranscriptFromVideos,
  TRANSCRIPT_ERROR,
} from "@/lib/extractContent";

// #region agent log
function debugLog(location, message, data) {
  try {
    fetch("http://127.0.0.1:7531/ingest/bc6660d1-bf88-441c-9186-ea06321d5733", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "82b54a" },
      body: JSON.stringify({ sessionId: "82b54a", location, message, data, timestamp: Date.now() }),
    }).catch(() => {});
  } catch (_) {}
}
// #endregion

/**
 * POST /api/generate-lesson
 *
 * Opzione A - JSON:
 *   Body: { method: "notes"|"video"|"topic", items: string[], rawContent?: string }
 *   Per notes: rawContent con testo estratto, oppure usa Opzione B.
 *   Per video: items = URL YouTube; il server estrae automaticamente le trascrizioni.
 *   Per topic: items = argomenti.
 *
 * Opzione B - FormData (per method=notes con file):
 *   method, items (JSON string), e file[] con i file caricati.
 *   Il server estrae il testo dai file automaticamente.
 */
export async function POST(request) {
  // #region agent log
  const tPostStart = Date.now();
  const _t = () => Date.now() - tPostStart;
  // #endregion
  try {
    const contentType = request.headers.get("content-type") || "";
    let method;
    let items;
    let rawContent = "";

    // #region agent log
    debugLog("route.js:POST", "entry", { contentType });
    // #endregion

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      method = formData.get("method");
      const itemsStr = formData.get("items");
      items = itemsStr ? JSON.parse(itemsStr) : [];

      if (method === "notes" && items.length > 0) {
        const files = [
          ...formData.getAll("files"),
          ...formData.getAll("file"),
        ].filter((f) => f && typeof f.arrayBuffer === "function");
        if (files.length > 0) {
          const fileBuffers = await Promise.all(
            files.map(async (f) => ({
              buffer: Buffer.from(await f.arrayBuffer()),
              name: f.name || "documento",
            }))
          );
          rawContent = await extractTextFromFiles(fileBuffers);
        }
      }
      if (method === "video" && items.length > 0) {
        // #region agent log
        const tT = Date.now();
        // #endregion
        rawContent = await extractTranscriptFromVideos(items);
        // #region agent log
        debugLog("route.js:POST", "transcript done (formdata)", { elapsedStepMs: Date.now() - tT, totalElapsedMs: _t(), rawLen: rawContent.length });
        // #endregion
      }
    } else {
      const body = await request.json();
      method = body.method;
      items = body.items;
      rawContent = body.rawContent || "";
      if (method === "video" && items?.length > 0 && !rawContent?.trim()) {
        // #region agent log
        const tT = Date.now();
        debugLog("route.js:POST", "transcript start", { items, totalElapsedMs: _t() });
        // #endregion
        rawContent = await extractTranscriptFromVideos(items);
        // #region agent log
        debugLog("route.js:POST", "transcript done", { elapsedStepMs: Date.now() - tT, totalElapsedMs: _t(), rawLen: rawContent.length });
        // #endregion
      }
    }

    if (!method || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "method e items (array) sono obbligatori" },
        { status: 400 }
      );
    }

    if (method === "video" && items.length > 0) {
      if (
        rawContent.includes(TRANSCRIPT_ERROR.QUOTA_EXCEEDED) ||
        rawContent.includes(TRANSCRIPT_ERROR.IP_BLOCKED)
      ) {
        return NextResponse.json(
          {
            error:
              "Quota Gemini esaurita per ora. Sul piano gratuito ci sono limiti stringenti per minuto e per giorno (specie sui modelli con video). Aspetta qualche minuto e riprova, oppure attiva un piano a pagamento sulla console Google AI Studio.",
          },
          { status: 429 }
        );
      }
      const hasValidTranscript = /\[\d+:\d{2}\]\s+.{2,}/.test(rawContent);
      if (!hasValidTranscript) {
        const noVideo = rawContent.includes(TRANSCRIPT_ERROR.VIDEO_UNAVAILABLE);
        const noCap =
          rawContent.includes(TRANSCRIPT_ERROR.NO_CAPTIONS) ||
          rawContent.includes("Trascrizioni non disponibili") ||
          rawContent.includes("Trascrizioni disabilitate");
        return NextResponse.json(
          {
            error: noVideo
              ? "Uno o più video non sono disponibili o l'URL non è valido."
              : noCap
                ? "Impossibile ottenere la trascrizione: verifica che i video abbiano sottotitoli (manuali o automatici) e siano pubblici."
                : "Impossibile ottenere la trascrizione dei video. Verifica che abbiano i sottotitoli attivati e siano pubblici.",
          },
          { status: 400 }
        );
      }
    }

    const extractedContent = buildContentForAI({
      method,
      items,
      rawContent: rawContent || "",
    });

    const inputType = method === "notes" ? "appunti" : method === "video" ? "youtube" : "argomento";
    // #region agent log
    const tL = Date.now();
    debugLog("route.js:POST", "lesson start", { inputType, contentLen: extractedContent.length, totalElapsedMs: _t() });
    // #endregion
    const lesson = await generateLesson(extractedContent, { method, items }, inputType);
    // #region agent log
    debugLog("route.js:POST", "lesson done", { elapsedStepMs: Date.now() - tL, totalElapsedMs: _t() });
    // #endregion
    if (!lesson.id) {
      lesson.id = `lesson-${method}-${Date.now()}`;
    }
    // #region agent log
    debugLog("route.js:POST", "exit success", { totalElapsedMs: _t() });
    // #endregion
    return NextResponse.json(lesson);
  } catch (err) {
    // #region agent log
    debugLog("route.js:POST", "exit error", { totalElapsedMs: _t(), errMsg: String(err?.message || err).slice(0, 200) });
    // #endregion
    console.error("[generate-lesson]", err);
    let message = err?.message || "Errore nella generazione della lezione. Riprova.";
    if (err?.cause?.message) message = err.cause.message;
    if (message.includes("GEMINI_API_KEY non definita")) {
      message = "Configurazione AI mancante. Crea .env.local, aggiungi GEMINI_API_KEY e riavvia il server.";
    }
    if (message.includes("404") || message.includes("NOT_FOUND")) {
      message = "Modello AI non disponibile. Controlla la configurazione.";
    }
    if (message.includes("401") || message.includes("API key") || message.includes("invalid")) {
      message = "Chiave API non valida. Verifica GEMINI_API_KEY in .env.local";
    }
    let status = err?.status === 429 ? 429 : 500;
    if (message.includes("coerenti") || message.includes("adatto") || message.includes("bloccato")) {
      status = 400;
    } else if (
      status === 429 ||
      message.includes("429") ||
      message.includes("quota") ||
      message.includes("RESOURCE_EXHAUSTED")
    ) {
      message = "Limite di richieste superato. Riprova tra qualche minuto.";
      status = 429;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
