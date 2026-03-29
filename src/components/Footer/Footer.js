"use client";

import styles from "./Footer.module.css";
import TransitionLink from "@/components/TransitionLink";
import { SITE_TITLE } from "@/utils/constants";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.brand}>{SITE_TITLE}</p>
        <nav aria-label="Link footer" className={styles.links}>
          <TransitionLink href="/">Home</TransitionLink>
          <TransitionLink href="/upload">Inizia</TransitionLink>
          <TransitionLink href="/#come-funziona">Come funziona</TransitionLink>
        </nav>
        <p className={styles.copy}>© {year} {SITE_TITLE}. Tutti i diritti riservati.</p>
      </div>
    </footer>
  );
}

export default Footer;