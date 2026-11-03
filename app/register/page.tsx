"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell, { EmailField, FormError, PasswordField, SubmitButton } from "@/components/auth-shell";
import styles from "@/components/auth.module.css";
import { ApiError, api } from "@/lib/api";
import {
  EMAIL_FORMAT_ERROR,
  MIN_PASSWORD,
  commonAuthError,
  focusOnDesktop,
  looksLikeEmail,
  passwordLengthError,
  useAuth,
} from "@/lib/auth";

type Errors = { email?: string; password?: string };

export default function RegisterPage() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const signedIn = useAuth((s) => s.signedIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<React.ReactNode>("");
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    useAuth.getState().load();
    focusOnDesktop(emailRef.current);
  }, []);

  useEffect(() => {
    if (status === "user" && !busy) router.replace("/");
  }, [status, busy, router]);

  const clear = (field: keyof Errors) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: Errors = {};
    if (!looksLikeEmail(email)) next.email = EMAIL_FORMAT_ERROR;
    next.password = passwordLengthError(password);
    setErrors(next);
    setFormError("");
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setBusy(true);
    try {
      const user = await api.register(email.trim(), password);
      signedIn(user, `Аккаунт создан: ${user.email}.`);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError(
          <>
            Эта почта уже зарегистрирована. <Link href="/login/" className={styles.link}>Войти</Link> или{" "}
            <Link href="/forgot-password/" className={styles.link}>восстановить пароль</Link>.
          </>,
        );
      } else {
        setFormError(commonAuthError(err));
      }
      setBusy(false);
    }
  }

  if (status === "user" && !busy) return null;

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Гараж будет храниться в аккаунте и откроется на любом устройстве. Машины из этого браузера перенесутся в него."
      aside={<>Уже есть аккаунт? <Link href="/login/" className={styles.link}>Войти</Link></>}
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError>{formError}</FormError>
        <EmailField
          ref={emailRef}
          value={email}
          onChange={(v) => { setEmail(v); clear("email"); }}
          error={errors.email}
        />
        <PasswordField
          ref={passwordRef}
          label="Пароль"
          autoComplete="new-password"
          value={password}
          onChange={(v) => { setPassword(v); clear("password"); }}
          error={errors.password}
          hint={`Не менее ${MIN_PASSWORD} символов`}
        />
        <SubmitButton busy={busy} busyText="Создаём аккаунт…">Создать аккаунт</SubmitButton>
      </form>
    </AuthShell>
  );
}
