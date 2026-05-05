/**
 * Estrae testo da file e video per inviarlo a Gemini.
 * Usato dall'API generate-lesson per notes (file) e video (YouTube).
 * Import dinamici per evitare errori con pdf-parse/mammoth in Next.js.
 */

const MAX_CHARS_PER_FILE = 50000;
const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".doc", ".docx"];

/**
 * Estrae il testo da un singolo file (Buffer).
 * @param {Buffer} buffer - Contenuto del file
 * @param {string} filename - Nome file per determinare il tipo
 * @returns {Promise<string>} Testo estratto
 */
export async function extractTextFromFile(buffer, filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Formato non supportato: ${ext}. Supportati: ${SUPPORTED_EXTENSIONS.join(", ")}`);
  }

  if (ext === ".txt") {
    const text = buffer.toString("utf-8");
    return text.slice(0, MAX_CHARS_PER_FILE);
  }

  if (ext === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      await parser.destroy();
      return (result.text || "").slice(0, MAX_CHARS_PER_FILE);
    } finally {
      try {
        await parser.destroy();
      } catch (_) {}
    }
  }

  if (ext === ".doc" || ext === ".docx") {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    return text.slice(0, MAX_CHARS_PER_FILE);
  }

  return "";
}

/**
 * Estrae testo da più file e lo concatena.
 * @param {{ buffer: Buffer, name: string }[]} files - Array di { buffer, name }
 * @returns {Promise<string>}
 */
export async function extractTextFromFiles(files) {
  const parts = [];
  for (const file of files) {
    try {
      const text = await extractTextFromFile(file.buffer, file.name);
      if (text.trim()) {
        parts.push(`--- ${file.name} ---\n${text}`);
      }
    } catch (err) {
      console.warn(`[extractContent] Errore su ${file.name}:`, err.message);
      parts.push(`--- ${file.name} ---\n[Impossibile estrarre il testo da questo file]`);
    }
  }
  return parts.join("\n\n");
}

const MAX_CHARS_PER_VIDEO = 80000;

/** Marker letto da generate-lesson per messaggi specifici. */
export const TRANSCRIPT_ERROR = {
  /** Compat: ora indica anche quota Gemini esaurita (prima era blocco IP YouTube). */
  IP_BLOCKED: "TRANSCRIPT_ERROR:IP_BLOCKED",
  QUOTA_EXCEEDED: "TRANSCRIPT_ERROR:QUOTA_EXCEEDED",
  NO_CAPTIONS: "TRANSCRIPT_ERROR:NO_CAPTIONS",
  VIDEO_UNAVAILABLE: "TRANSCRIPT_ERROR:VIDEO_UNAVAILABLE",
};

const YOUTUBE_TRANSCRIPT_MODEL = "gemini-2.5-flash";

function normalizeYoutubeUrl(input) {
  const t = String(input || "").trim();
  if (!t) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) {
    return `https://www.youtube.com/watch?v=${t}`;
  }
  try {
    const u = new URL(t);
    const host = u.hostname.replace(/^www\./, "");
    let id = null;
    if (host === "youtu.be") {
      id = u.pathname.replace(/^\//, "").split("/")[0] || null;
    } else if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        id = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
        id = u.pathname.split("/")[2] || null;
      }
    }
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) {
      return `https://www.youtube.com/watch?v=${id}`;
    }
  } catch (_) {}
  return t;
}

/**
 * Estrae una trascrizione cronologica da uno o più video YouTube usando Gemini.
 * Sostituisce lo scraping client di youtube-transcript: in produzione (IP cloud)
 * YouTube risponde HTTP 400 al timedtext, mentre Gemini consuma direttamente l'URL
 * tramite fileData e non richiede IP residenziali.
 *
 * @param {string[]} urls - URL (o ID) dei video YouTube
 * @returns {Promise<string>} Trascrizioni concatenate con timestamp [m:ss]
 */
export async function extractTranscriptFromVideos(urls) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return (urls || [])
      .map((u) => `--- ${u} ---\n[Configurazione AI mancante]`)
      .join("\n\n");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const parts = [];

  for (const url of urls) {
    const fileUri = normalizeYoutubeUrl(url);
    if (!fileUri) continue;

    try {
      const response = await ai.models.generateContent({
        model: YOUTUBE_TRANSCRIPT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: { fileUri },
                videoMetadata: { fps: 0.2 },
              },
              {
                text:
                  "Trascrivi cronologicamente questo video YouTube in italiano basandoti soprattutto sull'audio.\n" +
                  "Formato OBBLIGATORIO: una riga per segmento, nello stile esatto\n" +
                  "[m:ss] testo del segmento\n" +
                  "Dove m sono i minuti (anche oltre 60) e ss i secondi a due cifre.\n" +
                  "Copri tutto il video in ordine temporale, senza saltare nulla, ma senza divagare.\n" +
                  "Non aggiungere intestazioni, note o testo fuori dal formato sopra. Solo righe con timestamp.\n" +
                  "Massimo 200 righe.",
              },
            ],
          },
        ],
        config: {
          maxOutputTokens: 6144,
          temperature: 0.2,
          mediaResolution: "MEDIA_RESOLUTION_LOW",
        },
      });

      const text = response?.text?.trim() || "";

      if (!text) {
        parts.push(`--- ${fileUri} ---\n[${TRANSCRIPT_ERROR.NO_CAPTIONS}]`);
        continue;
      }

      const truncated =
        text.length > MAX_CHARS_PER_VIDEO
          ? text.slice(0, MAX_CHARS_PER_VIDEO) + "\n[... trascrizione troncata]"
          : text;

      parts.push(`--- Video: ${fileUri} ---\n${truncated}`);
    } catch (err) {
      const msg = String(err?.message || err || "");
      console.warn(`[extractContent] Errore trascrizione Gemini ${fileUri}:`, msg);

      let marker = null;
      if (/quota|429|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg)) {
        marker = TRANSCRIPT_ERROR.QUOTA_EXCEEDED;
      } else if (/not\s*found|404|unavailable|invalid.*url|video.*not/i.test(msg)) {
        marker = TRANSCRIPT_ERROR.VIDEO_UNAVAILABLE;
      } else {
        marker = TRANSCRIPT_ERROR.NO_CAPTIONS;
      }

      parts.push(`--- ${fileUri} ---\n[${marker}]`);
    }
  }

  return parts.join("\n\n");
}
