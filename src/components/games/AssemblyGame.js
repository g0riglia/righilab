"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLesson } from "@/components/LessonProvider";
import Image from "next/image";
import styles from "./AssemblaIlRobot.module.css";

const BASE = "/Robot%20Mascotte%20Game%20Assets";

const PIECE_META = {
  torso:     { label: "Torso",      img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_Torso.png` },
  bracciodx: { label: "Braccio Dx", img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_BraccioDX.png` },
  bracciosx: { label: "Braccio Sx", img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_BraccioSX.png` },
  gambadx:   { label: "Gamba Dx",   img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_GambaDX.png` },
  gambasx:   { label: "Gamba Sx",   img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_GambaSX.png` },
  testa:     { label: "Testa",      img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_Testa.png` },   // ← after torso
  schermo:   { label: "Schermo",    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_SchermoFaccia.png` },
};

const FROM_MAP = {
  testa:     "translateY(-80px) scale(0.5)",
  torso:     "scale(0.3)",
  bracciodx: "translateX(-80px)", // DX is on the LEFT visually → flies in from left
  bracciosx: "translateX(80px)",  // SX is on the RIGHT visually → flies in from right
  gambadx:   "translateY(80px)",
  gambasx:   "translateY(80px)",
  schermo:   "scale(0.2)",
};

/** Normalise hyphenated IDs (e.g. "braccio-dx") to the key format used by PIECE_META */
const normalizeId = (id) => id?.replace(/-/g, "") ?? id;

export default function AssemblaIlRobot() {
  const router = useRouter();
  const { lesson } = useLesson();

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Quiz state
  const [current,  setCurrent]  = useState(0);
  const [assembled, setAssembled] = useState([]);   // fully shown pieces
  const [snapping,  setSnapping]  = useState(null); // piece currently animating
  const [snapped,   setSnapped]   = useState([]);   // pieces whose animation just finished
  const [selected,  setSelected]  = useState(null);
  const [feedback,  setFeedback]  = useState(null); // "correct" | "wrong"
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    if (!lesson) {
      router.push("/upload");
      return;
    }
    fetch("/api/generate-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameKey: "assembly",
        lesson: { title: lesson.title, sections: lesson.sections },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setGameData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lesson, router]);

  if (!lesson) return null;

  const pieces = [...(gameData?.pieces || [])].sort((a, b) => a.order - b.order);
  const piece  = pieces[current];

  const handleAnswer = (idx) => {
    if (feedback) return;
    setSelected(idx);

    if (idx === piece.correctIndex) {
      setFeedback("correct");
      const nid = normalizeId(piece.id);

      // 1. Start snap animation
      setSnapping(nid);

      // 2. Animation done → move to "landed" state
      setTimeout(() => {
        setSnapped((prev) => [...prev, nid]);
        setSnapping(null);
      }, 450);

      // 3. Advance to next question
      setTimeout(() => {
        setAssembled((prev) => [...prev, nid]);
        setFeedback(null);
        setSelected(null);
        if (current + 1 >= pieces.length) setDone(true);
        else setCurrent((c) => c + 1);
      }, 950);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setSelected(null);
      }, 800);
    }
  };

  const getPieceClass = (id) => {
    if (assembled.includes(id) || snapped.includes(id)) return styles.landed;
    if (snapping === id) return styles.snap;
    return styles.pieceHidden;
  };

  return (
    <main className={styles.main}>
      <button onClick={() => router.push("/giochi")} className={styles.backBtn}>
        ← Torna ai giochi
      </button>

      <h1 className={styles.title}>Assembla il Robot</h1>
      <p className={styles.subtitle}>Rispondi correttamente per guadagnare ogni pezzo!</p>

      {/* ── Robot stage ── */}
      <div className={styles.robotStage}>
        {Object.entries(PIECE_META).map(([id, meta]) => (
          <div
            key={id}
            className={`${styles.piece} ${styles["p_" + id]} ${getPieceClass(id)}`}
            style={{ "--from": FROM_MAP[id] }}
          >
            <Image
              src={meta.img}
              alt={meta.label}
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
        ))}
      </div>

      {/* ── Status messages ── */}
      {loading && <p className={styles.hint}>Il robot sta preparando le domande...</p>}
      {error   && <p className={styles.error}>⚠️ {error}</p>}

      {/* ── Question card ── */}
      {!loading && !error && !done && piece && (
        <div className={styles.qcard}>
          <p className={styles.pieceLabel}>
            Prossimo pezzo:{" "}
            <strong>{PIECE_META[normalizeId(piece.id)]?.label ?? piece.id}</strong>
          </p>
          <p className={styles.question}>{piece.question}</p>
          <div className={styles.opts}>
            {piece.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={!!feedback}
                className={[
                  styles.opt,
                  selected === i && feedback === "correct" ? styles.optCorrect : "",
                  selected === i && feedback === "wrong"   ? styles.optWrong   : "",
                ].join(" ")}
              >
                {opt}
              </button>
            ))}
          </div>
          {pieces.length > 0 && (
            <p className={styles.progress}>{current + 1} / {pieces.length}</p>
          )}
        </div>
      )}

      {/* ── Done screen ── */}
      {done && (
        <div className={styles.doneBox}>
          <p className={styles.doneEmoji}>🎉</p>
          <p className={styles.doneTitle}>Robot completato!</p>
          <button onClick={() => router.push("/giochi")} className={styles.solidBtn}>
            Torna ai giochi
          </button>
        </div>
      )}
    </main>
  );
}