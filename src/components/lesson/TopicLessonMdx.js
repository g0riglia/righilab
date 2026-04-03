"use client";

import { useEffect, useState } from "react";
import { MDXRemote } from "next-mdx-remote";
import styles from "./TopicLessonMdx.module.css";

export default function TopicLessonMdx({ bodyMdx }) {
  const [serialized, setSerialized] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bodyMdx?.trim()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/render-topic-mdx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: bodyMdx }),
        });
        const raw = await res.text();
        let data;
        try {
          data = raw.trim() ? JSON.parse(raw) : null;
        } catch {
          throw new Error("Risposta dal server non valida (JSON)");
        }
        if (!data) throw new Error("Risposta vuota dal server");
        if (!res.ok) throw new Error(data.error || "Rendering non riuscito");
        if (!data.compiledSource) throw new Error("Risposta MDX non valida");
        if (!cancelled) setSerialized(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "Errore sconosciuto");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bodyMdx]);

  if (!bodyMdx?.trim()) return null;

  if (loading) {
    return <p className={styles.status}>Sto preparando l’articolo interattivo…</p>;
  }

  if (error) {
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  }

  if (!serialized) return null;

  return (
    <div className={styles.topicMdx}>
      <MDXRemote {...serialized} />
    </div>
  );
}
