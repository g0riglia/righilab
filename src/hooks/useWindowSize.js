"use client";
import { useState, useEffect } from "react";

function useWindowSize() {
  const FALLBACK_SIZE = { width: 1200, height: 800 };
  const [windowSize, setWindowSize] = useState({
    width: FALLBACK_SIZE.width,
    height: FALLBACK_SIZE.height,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }

    // Sync with the real viewport right after mount.
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return windowSize;
}

export default useWindowSize;
