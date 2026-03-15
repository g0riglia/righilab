"use client";
import styles from "./Header.module.css";
import useWindowSize from "@/hooks/useWindowSize";
import MobileNav from "./MobileNav";
import DesktopNav from "./DesktopNav";

function Header() {
    const { width } = useWindowSize();

    return (
        <header className={styles.header}>
            {width < 576 ? <MobileNav /> : <DesktopNav />}
        </header>
    )
}

export default Header;