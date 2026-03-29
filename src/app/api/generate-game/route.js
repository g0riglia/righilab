import { NextResponse } from "next/server";
import { generateGameByKey } from "@/lib/gemini";

/**
 * POST /api/generate-game
 * Body: { gameKey: "assembly"|"battery"|"adventure", lesson: { title, sections } }
 * Chiamare mentre l'utente guarda il tutorial del gioco per ridurre l'attesa.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { gameKey, lesson, difficulty } = body;

    if (!gameKey || !lesson) {
      return NextResponse.json(
        { error: "gameKey e lesson sono obbligatori" },
        { status: 400 }
      );
    }

    const lessonSummary = {
      title: lesson.title,
      sections: lesson.sections || [],
      bodyMdx: typeof lesson.bodyMdx === "string" ? lesson.bodyMdx : "",
    };

    const gameData = await generateGameByKey(gameKey, lessonSummary, difficulty);
    return NextResponse.json(gameData);
  } catch (err) {
    console.error("[generate-game]", err);
    let message = err?.message || "Errore generazione gioco";
    if (err?.cause?.message) message = err.cause.message;
    if (message.includes("GEMINI_API_KEY non definita")) {
      message = "Configurazione AI mancante. Crea .env.local, aggiungi GEMINI_API_KEY e riavvia il server.";
    }
    if (message.includes("401") || message.includes("API key") || message.includes("invalid")) {
      message = "Chiave API non valida. Verifica GEMINI_API_KEY in .env.local";
    }
    if (message.includes("404") || message.includes("NOT_FOUND")) {
      message = "Modello AI non disponibile. Controlla la configurazione.";
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
