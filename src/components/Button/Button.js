"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import styles from "./Button.module.css";

const VARIANT_CLASS = {
  solid: styles.solid,
  outline: styles.outline,
};

function isInternalAppPath(href) {
  if (!href) return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
    return false;
  }
  return true;
}

function Button({ href, variant = "solid", className = "", children, onClick, ...props }) {
  const router = useRouter();
  const variantClass = VARIANT_CLASS[variant] || styles.solid;
  const classes = `${styles.button} ${variantClass} ${className}`.trim();

  if (href) {
    if (!isInternalAppPath(href)) {
      return (
        <a href={href} className={classes} onClick={onClick} {...props}>
          {children}
        </a>
      );
    }

    return (
      <a
        href={href}
        className={classes}
        {...props}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          startTransition(() => {
            router.push(href);
          });
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export default Button;
