"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

function isExternal(href) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
}

/**
 * Link interni con router.push avvolto in startTransition, per evitare
 * "A component suspended while responding to synchronous input" (React 19 + Next).
 */
export default function TransitionLink({ href, className, children, onClick, ...rest }) {
  const router = useRouter();

  if (!href) {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }

  if (isExternal(href)) {
    return (
      <a href={href} className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      className={className}
      {...rest}
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
