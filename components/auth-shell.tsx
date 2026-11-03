"use client";

import Link from "next/link";
import { ReactNode, forwardRef, useEffect, useId, useRef, useState } from "react";
import shell from "@/app/page.module.css";
import form from "./dialog.module.css";
import styles from "./auth.module.css";
import AppBar, { VersionTag } from "./app-bar";
import { ArrowLeftIcon, CheckIcon, EyeIcon, EyeOffIcon } from "./icons";

type ShellProps = {
  title: string;
  subtitle?: ReactNode;
  // A line under the card: the way to the neighbouring form ("Нет аккаунта? …").
  aside?: ReactNode;
  children: ReactNode;
};

// One narrow card on paper, under the usual top row. Auth is a page, not a
// modal: password managers, the browser's back button and the link from the
// reset email all expect a real address.
export default function AuthShell({ title, subtitle, aside, children }: ShellProps) {
  return (
    <div className={shell.shell}>
      <header className={shell.topBar}>
        <div className={shell.topBrand}>
          <Link href="/" className={shell.toolBtn} aria-label="В гараж">
            <ArrowLeftIcon />
          </Link>
          <div className={shell.brandMark} aria-hidden="true">c</div>
          <div className={shell.brandName}>carvisio</div>
        </div>
      </header>
      <AppBar home bare />

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="auth-title">
          <div className={styles.heading}>
            <h1 id="auth-title" className={styles.title}>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {children}
        </section>
        {aside ? <p className={styles.aside}>{aside}</p> : null}
      </main>
      <VersionTag />
    </div>
  );
}

// Form-level failure (server said no, network is down). Field problems are
// shown under their field instead. It takes focus when it appears, so a
// keyboard user continues from the message, not from the top of the page.
export function FormError({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (children) ref.current?.focus();
  }, [children]);
  if (!children) return null;
  return (
    <div ref={ref} className={styles.formError} role="alert" tabIndex={-1}>
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <div className={styles.success} role="status">
      <CheckIcon className={styles.successIcon} />
      <div>{children}</div>
    </div>
  );
}

// Busy is not disabled: a disabled button drops focus to <body> and turns
// grey. The forms ignore a second submit while busy instead.
export function SubmitButton({ busy, children, busyText }: { busy: boolean; children: ReactNode; busyText: string }) {
  return (
    <button type="submit" className={`${form.primary} ${styles.submit}`} aria-busy={busy}>
      {busy ? busyText : children}
    </button>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  // Right side of the label row ("Забыли пароль?").
  labelAside?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
};

// "username" by default: paired with a password field, it is what password
// managers save the login under. Forgot-password passes "email".
export const EmailField = forwardRef<HTMLInputElement, Omit<FieldProps, "label" | "autoComplete"> & { autoComplete?: string }>(
  function EmailField({ error, value, onChange, autoComplete = "username" }, ref) {
    const id = useId();
    return (
      <div className={form.field}>
        <label htmlFor={id} className={form.label}>Почта</label>
        <input
          ref={ref}
          id={id}
          type="email"
          inputMode="email"
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          className={`${form.input} ${error ? form.invalid : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="you@example.com"
        />
        {error ? <div id={`${id}-error`} className={form.error}>{error}</div> : null}
      </div>
    );
  },
);

export const PasswordField = forwardRef<HTMLInputElement, FieldProps>(function PasswordField(
  { label, error, hint, labelAside, value, onChange, autoComplete },
  ref,
) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const message = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const describedBy = [capsLock ? `${id}-caps` : "", message ?? ""].filter(Boolean).join(" ") || undefined;
  const readCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState("CapsLock"));
  return (
    <div className={`${form.field} ${styles.passwordField}`}>
      <label htmlFor={id} className={`${form.label} ${styles.passwordLabel}`}>{label}</label>
      <div className={styles.passwordWrap}>
        <input
          ref={ref}
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          className={`${form.input} ${styles.passwordInput} ${error ? form.invalid : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={readCapsLock}
          onKeyUp={readCapsLock}
          onBlur={() => setCapsLock(false)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setShown((s) => !s)}
          aria-label="Показать пароль"
          aria-pressed={shown}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {/* After the input in the DOM, so Tab goes email → password → this link;
          the grid still draws it at the right end of the label row. */}
      {labelAside ? <div className={styles.passwordAside}>{labelAside}</div> : null}
      {capsLock ? <div id={`${id}-caps`} className={`${form.warning} ${styles.passwordMsg}`}>Включён Caps Lock</div> : null}
      {error ? (
        <div id={`${id}-error`} className={`${form.error} ${styles.passwordMsg}`}>{error}</div>
      ) : hint ? (
        <div id={`${id}-hint`} className={`${form.hint} ${styles.passwordMsg}`}>{hint}</div>
      ) : null}
    </div>
  );
});
