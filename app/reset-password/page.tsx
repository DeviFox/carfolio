"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { FormError, PasswordField, SubmitButton } from "@/components/auth-shell";
import styles from "@/components/auth.module.css";
import { ApiError, api } from "@/lib/api";
import { MIN_PASSWORD, commonAuthError, focusOnDesktop, passwordLengthError, useAuth } from "@/lib/auth";

// The link from the reset email: /reset-password/?token=…
export default function ResetPasswordPage() {
  return (
    // Until the token is read from the URL: the same card, empty, not a blank page.
    <Suspense fallback={<AuthShell title="Новый пароль">{null}</AuthShell>}>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const signedIn = useAuth((s) => s.signedIn);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState<React.ReactNode>("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    focusOnDesktop(passwordRef.current);
  }, []);

  const newLink = <Link href="/forgot-password/" className={styles.link}>Запросить новую ссылку</Link>;

  if (!token) {
    return (
      <AuthShell title="Ссылка неполная" aside={<Link href="/login/" className={styles.link}>Вернуться ко входу</Link>}>
        <div className={styles.actions}>
          <p className={styles.subtitle}>
            В ссылке нет кода сброса. Откройте её из письма целиком или запросите новую.
          </p>
          <p>{newLink}</p>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    const lengthError = passwordLengthError(password);
    if (lengthError) {
      setError(lengthError);
      passwordRef.current?.focus();
      return;
    }
    setError("");
    setBusy(true);
    try {
      const user = await api.resetPassword(token, password);
      signedIn(user, `Пароль изменён. Вы вошли как ${user.email}.`);
      router.replace("/");
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 400 ? (
          <>Ссылка устарела или уже использована. {newLink}.</>
        ) : (
          commonAuthError(err)
        ),
      );
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Новый пароль"
      subtitle="После сохранения вы выйдете со всех устройств, кроме этого."
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError>{formError}</FormError>
        <PasswordField
          ref={passwordRef}
          label="Новый пароль"
          autoComplete="new-password"
          value={password}
          onChange={(v) => { setPassword(v); setError(""); }}
          error={error}
          hint={`Не менее ${MIN_PASSWORD} символов`}
        />
        <SubmitButton busy={busy} busyText="Сохраняем…">Сохранить пароль</SubmitButton>
      </form>
    </AuthShell>
  );
}
