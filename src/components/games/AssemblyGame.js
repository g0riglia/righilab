"use client";
import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useLesson } from "@/components/LessonProvider";
import Image from "next/image";
import styles from "./AssemblyGame.module.css";

const BASE = "/Robot%20Mascotte%20Game%20Assets";

/** Metadati UI per ogni pezzo: etichetta, immagine, trasformazione iniziale dell’animazione “snap”. */
const PIECE_UI = {
  torso: {
    label: "Torso",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_Torso.png`,
    from: "scale(0.3)",
  },
  bracciodx: {
    label: "Braccio Dx",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_BraccioDX.png`,
    from: "translateX(-80px)",
  },
  bracciosx: {
    label: "Braccio Sx",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_BraccioSX.png`,
    from: "translateX(80px)",
  },
  gambadx: {
    label: "Gamba Dx",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_GambaDX.png`,
    from: "translateY(80px)",
  },
  gambasx: {
    label: "Gamba Sx",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_GambaSX.png`,
    from: "translateY(80px)",
  },
  testa: {
    label: "Testa",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_Testa.png`,
    from: "translateY(-80px) scale(0.5)",
  },
  schermo: {
    label: "Schermo",
    img: `${BASE}/GIOCO_ASSEMBLAGGIO_Robot_SchermoFaccia.png`,
    from: "scale(0.2)",
  },
};

/** Normalise hyphenated IDs (e.g. "braccio-dx") to the key format used by PIECE_META */
const normalizeId = (id) => id?.replace(/-/g, "") ?? id;

export default function AssemblaIlRobot() {
  const router = useRouter();
  const { lesson } = useLesson();

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Quiz state
  /** Indice in `pieces` del pezzo scelto dalla barra (null = scegli prima un pezzo). */
  const [activeIndex, setActiveIndex] = useState(null);
  const [assembled, setAssembled] = useState([]); // fully shown pieces
  const [snapping, setSnapping] = useState(null); // piece currently animating
  const [snapped, setSnapped] = useState([]); // pieces whose animation just finished
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong"
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!lesson) {
      startTransition(() => {
        router.push("/upload");
      });
      return;
    }
    fetch("/api/generate-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameKey: "assembly",
        lesson: {
          title: lesson.title,
          sections: lesson.sections ?? [],
          bodyMdx: typeof lesson.bodyMdx === "string" ? lesson.bodyMdx : "",
        },
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
  const piece = activeIndex !== null ? pieces[activeIndex] : null;
  const activeTargetMeta = piece ? PIECE_UI[normalizeId(piece.id)] : null;

  const isPieceOnRobot = (nid) =>
    assembled.includes(nid) || snapped.includes(nid) || snapping === nid;

  const selectTrayPiece = (index) => {
    if (feedback) return;
    const nid = normalizeId(pieces[index]?.id);
    if (!nid || isPieceOnRobot(nid)) return;
    setActiveIndex(index);
    setSelected(null);
  };

  const handleAnswer = (idx) => {
    if (feedback || !piece) return;
    setSelected(idx);

    if (idx === piece.correctIndex) {
      setFeedback("correct");
      const nid = normalizeId(piece.id);

      setSnapping(nid);

      setTimeout(() => {
        setSnapped((prev) => [...prev, nid]);
        setSnapping(null);
      }, 450);

      setTimeout(() => {
        setAssembled((prev) => {
          const next = [...prev, nid];
          if (next.length >= pieces.length) setDone(true);
          return next;
        });
        setFeedback(null);
        setSelected(null);
        setActiveIndex(null);
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
      <button
        type="button"
        onClick={() =>
          startTransition(() => {
            router.push("/giochi");
          })
        }
        className={styles.backBtn}
      >
        ← Torna ai giochi
      </button>

      <h1 className={styles.title}>Assembla il Robot</h1>
      <p className={styles.subtitle}>
        Scegli un pezzo nella barra sotto il robot: la domanda servirà solo per bloccare quel pezzo sul corpo.
      </p>

      {/* ── Robot stage (solo pezzi già montati; gli altri stanno nella barra sopra le domande) ── */}
      <div className={styles.robotStage}>
        {Object.entries(PIECE_UI).map(([id, meta]) => (
          <div
            key={id}
            className={`${styles.piece} ${styles["p_" + id]} ${getPieceClass(id)}`}
            style={{ "--from": meta.from }}
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
      {error && <p className={styles.error}>⚠️ {error}</p>}

      {/* ── Barra pezzi (sopra le domande): qui finché non sono montati; poi si animano sul robot) ── */}
      {!loading && !error && !done && pieces.length > 0 && (
        <div className={styles.trayWrap}>
          <p className={styles.trayTitle}>Pezzi da innestare</p>
          <p className={styles.trayHint}>Tocca un pezzo per rispondere alla sua domanda e fissarlo al robot.</p>
          <div className={styles.trayRow}>
            {pieces.map((p, i) => {
              const nid = normalizeId(p.id);
              const meta = PIECE_UI[nid];
              if (!meta || isPieceOnRobot(nid)) return null;
              const isActive = activeIndex === i;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.trayPiece} ${isActive ? styles.trayPieceSelected : ""}`}
                  onClick={() => selectTrayPiece(i)}
                  disabled={!!feedback}
                  aria-pressed={isActive}
                  aria-label={`Seleziona ${meta.label} per rispondere alla domanda`}
                >
                  <span className={styles.trayPieceThumb}>
                    <Image src={meta.img} alt="" width={56} height={56} style={{ objectFit: "contain" }} />
                  </span>
                  <span className={styles.trayPieceLabel}>{meta.label}</span>
                  {isActive && <span className={styles.trayPieceBadge}>✓ In risposta</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Question card ── */}
      {!loading && !error && !done && pieces.length > 0 && (
        <div className={`${styles.qcard} ${activeIndex !== null && piece ? styles.qcardFocused : ""}`}>
          {activeIndex === null || !piece ? (
            <>
              <p className={styles.qcardPrompt}>
                <span className={styles.qcardPromptIcon} aria-hidden>
                  👆
                </span>{" "}
                Scegli un pezzo dalla barra sopra: la domanda riguarderà solo quel componente.
              </p>
              <p className={styles.progress}>
                {assembled.length} / {pieces.length} pezzi montati
              </p>
            </>
          ) : (
            <>
              <div className={styles.targetBanner}>
                {activeTargetMeta && (
                  <span className={styles.targetThumb} aria-hidden>
                    <Image src={activeTargetMeta.img} alt="" width={48} height={48} style={{ objectFit: "contain" }} />
                  </span>
                )}
                <div className={styles.targetText}>
                  <span className={styles.targetEyebrow}>Pezzo selezionato</span>
                  <strong className={styles.targetName}>{activeTargetMeta?.label ?? piece.id}</strong>
                  <span className={styles.targetSub}>La risposta giusta lo fissa sul robot.</span>
                </div>
              </div>
              <p className={styles.question}>{piece.question}</p>
              <div className={styles.opts}>
                {piece.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswer(i)}
                    disabled={!!feedback}
                    className={[
                      styles.opt,
                      selected === i && feedback === "correct" ? styles.optCorrect : "",
                      selected === i && feedback === "wrong" ? styles.optWrong : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className={styles.progress}>
                {assembled.length} / {pieces.length} pezzi montati
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Done screen ── */}
      {done && (
        <div className={styles.doneBox}>
          <p className={styles.doneEmoji}>🎉</p>
          <p className={styles.doneTitle}>Robot completato!</p>
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                router.push("/giochi");
              })
            }
            className={styles.solidBtn}
          >
            Torna ai giochi
          </button>
        </div>
      )}
    </main>
  );
}