"use client";

import styles from "./page.module.css";
import Button from "@/components/Button";
import BatteryGame from "@/components/games/BatteryGame";
import AdventureGame from "@/components/games/AdventureGame";
import AssemblaIlRobot from "@/components/games/AssemblyGame";

/**
 * Client UI del gioco. Lo slug è risolto nella Server Component parent (niente useParams qui)
 * per evitare suspend sincrono su navigazione (React 19 + Next 15).
 */
export default function GamePageClient({ game }) {
  if (game.providerKey === "battery") {
    return (
      <main className={styles.main}>
        <section className={styles.gameSection}>
          <p className={styles.eyebrow}>Gioco</p>
          <h1>{game.name}</h1>
          <p className={styles.description}>{game.description}</p>
          <BatteryGame />
        </section>
      </main>
    );
  }
  if (game.providerKey === "adventure") {
    return (
      <main className={styles.main}>
        <section className={styles.gameSection}>
          <p className={styles.eyebrow}>Gioco</p>
          <h1>{game.name}</h1>
          <p className={styles.description}>{game.description}</p>
          <AdventureGame />
        </section>
      </main>
    );
  }
  if (game.providerKey === "assembly") {
    return (
      <main className={styles.main}>
        <section className={styles.gameSection}>
          <p className={styles.eyebrow}>Gioco</p>
          <h1>{game.name}</h1>
          <p className={styles.description}>{game.description}</p>
          <AssemblaIlRobot />
        </section>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <section className={styles.shell}>
        <p className={styles.eyebrow}>Prossimamente</p>
        <h1>{game.name}</h1>
        <p>Questo gioco sarà disponibile a breve!</p>
        <Button href="/giochi" variant="outline">
          Torna ai giochi
        </Button>
      </section>
    </main>
  );
}
