"use client"
import useWindowSize from "@/hooks/useWindowSize";
import styles from "./Header.module.css"
import Image from "next/image";
import TransitionLink from "@/components/TransitionLink";
import { NAVBAR_LINKS } from "@/utils/constants";

function DesktopNav() {
    const { width } = useWindowSize();
    const isCompactLogo = width < 768;

    return (
        <div className={styles.desktopContainer}>
            <TransitionLink href="/" className={styles.desktopLogoLink}>
                <Image
                    src={isCompactLogo ? "/logo.png" : "/full-logo.png"}
                    alt="Il logo del sito, rappresentante la testa stilizzata in stile cartoon di un robot"
                    width={isCompactLogo ? 50 : 180}
                    height={isCompactLogo ? 45 : 52}
                    className={styles.desktopLogoImage}
                    priority
                />
            </TransitionLink>
            <nav className={styles.desktopNavbar}>
                <ul>
                    {NAVBAR_LINKS.map((item) => (
                        <li key={item.name}>
                            <TransitionLink href={item.route}>{item.name}</TransitionLink>
                        </li>
                    ))}
                </ul>
            </nav>
            {width < 768 ? <div className={styles.placeholder}></div>
                :
                <TransitionLink href="/upload" className={styles.cta}>
                  Prova ora
                </TransitionLink>
            }
        </div>
    )
}

export default DesktopNav;