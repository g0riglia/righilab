"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import styles from "./Header.module.css";
import { Menu, X } from "react-feather";
import Link from "next/link";
import Image from "next/image";
import { NAVBAR_LINKS } from "@/utils/constants";

function MobileNav() {
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousTouchAction = document.body.style.touchAction;

        if (isExpanded) {
            document.body.style.overflow = "hidden";
            document.body.style.touchAction = "none";
        }

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.touchAction = previousTouchAction;
        };
    }, [isExpanded]);

    return (
        <div className={styles.mobileContainer}>
            <div className={styles.mobileHeader}>
                <Link href="/"><Image src="/logo.png" alt="Il logo del sito, rappresentante la testa stilizzata in stile cartoon di un robot" width={50} height={45} /></Link>
                <motion.button
                    className={styles.hamburgerButton}
                    onClick={() => setIsExpanded((prev) => !prev)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Chiudi menu" : "Apri menu"}
                    whileTap={{ scale: 0.92 }}
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={isExpanded ? "close" : "open"}
                            className={styles.hamburgerIcon}
                            initial={{ opacity: 0, rotate: -70, scale: 0.65 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 70, scale: 0.65 }}
                            transition={{ duration: 0.18 }}
                        >
                            {isExpanded ? <X /> : <Menu />}
                        </motion.span>
                    </AnimatePresence>
                </motion.button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <>
                        <motion.button
                            className={styles.menuBlur}
                            onClick={() => setIsExpanded(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            aria-label="Chiudi menu"
                        />

                        <motion.nav
                            className={styles.menu}
                            initial={{ opacity: 0, y: -18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -18 }}
                            transition={{ duration: 0.24, ease: "easeOut" }}
                        >
                            <ul>
                                {NAVBAR_LINKS.map((item, index) => (
                                    <motion.li
                                        key={item.name}
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ delay: 0.06 + (index * 0.05), duration: 0.18 }}
                                    >
                                        <Link href={item.route} onClick={() => setIsExpanded(false)}>{item.name}</Link>
                                    </motion.li>
                                ))}
                                <motion.li
                                    key={"cta"}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ delay: 0.06 + (NAVBAR_LINKS.length * 0.05), duration: 0.18 }}
                                >
                                    <Link href="/upload" className={styles.cta}>Prova ora</Link>
                                </motion.li>
                            </ul>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MobileNav;