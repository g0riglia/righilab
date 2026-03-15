import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <section className={styles.hero} aria-label="Hero section">
        <div className={styles.text}>
          <h1>Impara giocando con il <em>tuo</em> robot</h1>
          <p>Carica quello che vuoi studiare e lascia che il robot lo trasformi in sfide interattive.</p>
          <div className={styles.heroCtas}>
            <Link className={styles.fullCta} href="/upload">Inizia ad imparare</Link>
            <Link className={styles.emptyCta} href="/">Scopri come funziona</Link>
          </div>
        </div>
        <Image
          className={styles.robot}
          src="/robot-hi.png"
          alt="Il robot mascote del sito che saluta"
          width={400}
          height={400}
        />
      </section>
    </main>
  );
}
