"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import Button from "@/components/Button";
import { QuestionRenderer } from "@/components/questions";
import { DIFFICULTY_LEVELS, getQuestionsForAdventure } from "@/utils/gameConfig";
import { useLesson } from "@/components/LessonProvider";
import styles from "./AdventureGame.module.css";


export default function AdventureGame() {
  const { lesson } = useLesson();
  const [phase, setPhase] = useState("loading"); // Parte subito in loading
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [steps, setSteps] = useState(0);
  const [flameStep, setFlameStep] = useState(null);
  const [round, setRound] = useState(1);
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bonusCells, setBonusCells] = useState([]);
  const [flameDiceValue, setFlameDiceValue] = useState(null);

  // Modifica la funzione handleAnswer per chiudere il modal dopo la risposta
  const handleAnswerWithClose = (answer) => {
    handleAnswer(answer);
    setIsModalOpen(false);
  };

  // Caricamento automatico all'avvio
  const loadGame = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/generate-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameKey: "adventure",
          difficulty: "medio",
          lesson: lesson ? { title: lesson.title, sections: lesson.sections } : { title: "Lezione", sections: [] },
        }),
      });

      if (!res.ok) throw new Error("Errore nel caricamento domande");
      
      const data = await res.json();
      const q = getQuestionsForAdventure(data.steps || []);
      
      setQuestions(q);
      // ... dentro loadGame, dopo setQuestions(q);
      const generatedBonus = [];
      while (generatedBonus.length < 2) {
        const rand = Math.floor(Math.random() * 26) + 2; // Evita cella 0, 1 e 29
        if (!generatedBonus.includes(rand)) generatedBonus.push(rand);
      }
      setBonusCells(generatedBonus);
      setSteps(0);
      setFlameStep(-5);
      setRound(1);
      setCurrentIndex(0);
      setPhase("playing");
    } catch (err) {
      setError(err.message);
      setPhase("error");
    }
  }, [lesson]);

  // Avvia il gioco appena entri nella pagina
  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const rollDice = useCallback(() => {
    setIsRolling(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);

      setSteps((prev) => {
        const next = prev + roll;
        if (next >= 29) {
          setPhase("win");
          return 29;
        }
        
        // Controllo Bonus: se atterra su una cella bonus
        if (bonusCells.includes(next)) {
          // Piccola pausa e poi tira di nuovo!
          setTimeout(() => rollDice(), 1000);
        }
        
        return next;
      });
    }, 1000);
  }, [bonusCells]);

  const handleAnswer = (correct) => {
    if (correct) {
      rollDice();
    }
    finalizeTurn();
  };

const finalizeTurn = () => {
  const nextRound = round + 1;

  if (nextRound === 3) {
    setFlameStep(0);
    setFlameDiceValue(0);
  } else if (nextRound > 3) {
    // CALCOLO BLOCCATO: Generiamo il numero una sola volta qui
    const currentRoll = Math.floor(Math.random() * 3) + 1;
    
    setFlameDiceValue(currentRoll);
    
    // NON usare (f) => f + currentRoll se temi doppi trigger, 
    // ma con la struttura fuori dal setter che abbiamo fatto ora, 
    // anche questa forma è sicura:
    setFlameStep((prev) => prev + currentRoll);
  }

  setRound(nextRound);

  if (currentIndex < questions.length - 1) {
    setCurrentIndex((prev) => prev + 1);
  } else {
    if (steps < 29) setPhase("lose");
  }
};

  // Controllo sconfitta immediata
  useEffect(() => {
    if (phase === "playing" && flameStep >= steps && round >= 3) {
      setPhase("lose");
    }
  }, [flameStep, steps, phase, round]);

  return (
    <div className={styles.game}>
      
      {/* 1. LOADING (Appare subito) */}
      {phase === "loading" && (
        <section className={styles.loadingSection}>
          <Image src="/Robot%20Mascotte%20Assets/4_VID_Caricamento_final.gif" width={250} height={250} alt="Loading" unoptimized />
          <p>Preparazione Avventura...</p>
        </section>
      )}

      {/* 2. ERRORE */}
      {phase === "error" && (
        <section className={styles.section}>
          <h2>Ops! Qualcosa è andato storto</h2>
          <p>{error}</p>
          <Button onClick={loadGame}>Riprova</Button>
        </section>
      )}

      {/* 3. GIOCO */}
      {phase === "playing" && (
        <section className={styles.boardSection}>
          <div className={styles.gameHeader}>
            <div className={styles.statBox}>
              <span className={styles.label}>ROUND</span>
              <strong className={styles.value}>{round}</strong>
            </div>

            {/* Box per il Fuoco */}
            <div className={`${styles.statBox} ${styles.flameBox}`}>
              <span className={styles.label}>DADO FUOCO</span>
              <strong className={styles.value} style={{ color: '#ff4d4d' }}>
                {flameDiceValue ? `+${flameDiceValue}` : "-"}
              </strong>
            </div>

            <div className={styles.diceBox}>
              <span className={styles.label}>TUO DADO</span>
              <strong className={styles.value}>{isRolling ? "🎲..." : (diceValue || "-")}</strong>
            </div>
          </div>

           <div className={styles.gridContainer}>

            {[...Array(30)].map((_, index) => {
              const rowIndex = Math.floor(index / 5);
              const isReversed = rowIndex % 2 !== 0;
              const visualNumber = isReversed ? (rowIndex * 5 + 4) - (index % 5) : index;
              const isGreen = visualNumber <= steps;
              const isBurned=visualNumber <= flameStep
              const isBonus = bonusCells.includes(visualNumber);
              const isPlayerHere = visualNumber === steps;
              const isFlameHere = flameStep !== null && visualNumber === flameStep;

              return (
                <div key={index} className={`${styles.cell}
                ${visualNumber === 0 || visualNumber === 29 ? styles.startEnd : ""}
                ${isGreen && !isBurned && (visualNumber !== 0 && visualNumber !== 29)  ? styles.completed : ""}
                ${isBurned  && (visualNumber !== 0 && visualNumber !== 29) ? styles.burned : ""}
                ${isBonus ? styles.bonusCell : ""}`}>
                  {visualNumber===0 && !isPlayerHere && !isFlameHere && <span className={styles.stepNumber}>Inizio</span>}
                  {visualNumber===29 && !isPlayerHere && !isFlameHere && <span className={styles.stepNumber}>Fine</span>}
                  {!isPlayerHere && !isFlameHere && visualNumber!=0 && visualNumber!=29 && !isBonus && <span className={styles.stepNumber}>{visualNumber + 1}</span>}
                  {isPlayerHere && <motion.div layoutId="p" className={styles.playerPawn}><Image src="/Robot%20Mascotte%20Game%20Assets/GIOCO_AVVENTURA_Robot_PEDINA.png" width={70} height={70} alt="R" /></motion.div>}
                  {isFlameHere && <motion.div layoutId="f" className={styles.flamePawn}>🔥</motion.div>}
                  {isBonus && !isPlayerHere && !isFlameHere && <span className={styles.bonusIcon}>🎲</span>}
                </div>
              );
            })}
          </div> 

          {/* PULSANTE PER APRIRE IL MODAL */}
          <div className={styles.actionArea}>
            {!isRolling && questions[currentIndex] && !isModalOpen && (
              <button 
                className={styles.openQuestionBtn} 
                onClick={() => setIsModalOpen(true)}
              >
                Rispondi alla Domanda #{currentIndex + 1}
              </button>
            )}
          </div>

          {/* MODAL DELLA DOMANDA */}
          <AnimatePresence>
            {isModalOpen && (
              <motion.div 
                className={styles.modalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className={styles.modalContent}
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 20 }}
                >
                  <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>×</button>
                  
                  <p className={styles.progress}>
                    Domanda #{currentIndex + 1}
                  </p>
                  
                  <QuestionRenderer 
                    question={questions[currentIndex]} 
                    onAnswer={handleAnswerWithClose} 
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 4. FINE GIOCO */}
      {(phase === "win" || phase === "lose") && (
        <section className={styles.resultSection}>
          <Image src={phase === "win" ? "/Robot%20Mascotte%20Assets/5_VID_Felice_final.gif" : "/Robot%20Mascotte%20Assets/3_VID_Triste_final.gif"} width={200} height={200} alt="Res" unoptimized />
          <h2>{phase === "win" ? "Vittoria!" : "Game Over!"}</h2>
          <Button onClick={loadGame} variant="solid">Gioca Ancora</Button>
        </section>
      )}
    </div>
  );
}