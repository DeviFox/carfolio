"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import AuthShell, { EmailField, FormError, FormSuccess, SubmitButton } from "@/components/auth-shell";
import styles from "@/components/auth.module.css";
import { api } from "@/lib/api";
import { EMAIL_FORMAT_ERROR, commonAuthError, focusOnDesktop, looksLikeEmail } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  // The address the link went to; the server never says whether it exists.
  const [sentTo, setSentTo] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focusOnDesktop(emailRef.current);
  }, []);

  // The form is gone once the link is sent: move focus to the news, not to <body>.
  useEffect(() => {
    if (sentTo) sentRef.current?.focus();
  }, [sentTo]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    if (!looksLikeEmail(email)) {
      setError(EMAIL_FORMAT_ERROR);
      emailRef.current?.focus();
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api.forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setFormError(commonAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Проверьте почту"
        aside={<Link href="/login/" className={styles.link}>Вернуться ко входу</Link>}
      >
        <div ref={sentRef} className={styles.actions} tabIndex={-1}>
          <FormSuccess>
            Если аккаунт с адресом <strong>{sentTo}</strong> существует, мы отправили на него ссылку для
            сброса пароля. Она действует 1 час.
          </FormSuccess>
          <p className={styles.subtitle}>
            Письма нет пару минут — загляните в «Спам» или{" "}
            <button type="button" className={styles.link} onClick={() => setSentTo("")}>
              отправьте ещё раз
            </button>
            .
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Укажите почту аккаунта. Пришлём на неё ссылку, по которой можно задать новый пароль."
      aside={<>Вспомнили пароль? <Link href="/login/" className={styles.link}>Войти</Link></>}
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError>{formError}</FormError>
        <EmailField
          ref={emailRef}
          autoComplete="email"
          value={email}
          onChange={(v) => { setEmail(v); setError(""); }}
          error={error}
        />
        <SubmitButton busy={busy} busyText="Отправляем…">Отправить ссылку</SubmitButton>
      </form>
    </AuthShell>
  );
}
