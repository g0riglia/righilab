import Link from "next/link";
import styles from "./Button.module.css";

const VARIANT_CLASS = {
  solid: styles.solid,
  outline: styles.outline,
};

function Button({
  href,
  variant = "solid",
  className = "",
  children,
  ...props
}) {
  const variantClass = VARIANT_CLASS[variant] || styles.solid;
  const classes = `${styles.button} ${variantClass} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export default Button;
