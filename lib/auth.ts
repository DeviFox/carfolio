"use client";

import { create } from "zustand";
import { ApiError, api, type User } from "./api";

// Who is signed in. "unknown" until the first /api/me answer arrives, so the
// account control can stay quiet instead of flashing "Войти" for a signed-in
// owner on every page load.
type AuthState = {
  status: "unknown" | "guest" | "user";
  user: User | null;
  load: () => void;
  signedIn: (user: User, notice?: string) => void;
  logout: () => Promise<void>;
  // One line for the garage after a flow ends there ("Аккаунт создан…").
  // Shown once, cleared when dismissed or when the garage unmounts.
  notice: string | null;
  clearNotice: () => void;
};

let loading: Promise<void> | null = null;

export const useAuth = create<AuthState>((set) => ({
  status: "unknown",
  user: null,

  load: () => {
    loading ??= api
      .me()
      .then((user) => set({ status: "user", user }))
      // 401 is a guest; an unreachable API is treated the same way: the
      // garage works without an account, so nothing else should break.
      .catch(() => set({ status: "guest", user: null }));
  },

  notice: null,
  clearNotice: () => set({ notice: null }),

  signedIn: (user, notice) => set({ status: "user", user, notice: notice ?? null }),

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      // Already gone on the server: locally it is a logout all the same.
      if (!(err instanceof ApiError) || err.status !== 401) throw err;
    }
    set({ status: "guest", user: null });
  },
}));

// Russian copy for failures every auth form shares. Form-specific cases
// (wrong password, taken email, expired link) are worded by the form itself.
export function commonAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.";
    // The server's rate-limit window is 15 minutes, counted from the first attempt.
    if (err.status === 429) return "Слишком много попыток. Подождите до 15 минут и попробуйте снова.";
    // The forms check the obvious cases first; these are the ones only the server catches.
    if (err.status === 422 && err.message.includes("email")) {
      return "Произошла ошибка. Проверьте, нет ли в адресе эл. почты опечатки или лишних символов.";
    }
    if (err.status === 422 && err.message.includes("at most")) return `Пароль слишком длинный: не больше ${MAX_PASSWORD} символов.`;
  }
  return "Что-то пошло не так на сервере. Попробуйте ещё раз чуть позже.";
}

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

// Focus the first field only where it helps: with a mouse or keyboard. On a
// phone autofocus pops the keyboard over a screen the owner hasn't read yet.
export function focusOnDesktop(el: HTMLElement | null) {
  if (el && window.matchMedia("(pointer: fine)").matches) el.focus();
}

// Same bounds as the server (server/internal/auth validatePassword), in runes.
export function passwordLengthError(password: string): string | undefined {
  const n = [...password].length;
  if (n < MIN_PASSWORD) return `Пароль должен быть не короче ${MIN_PASSWORD} символов`;
  if (n > MAX_PASSWORD) return `Пароль слишком длинный: не больше ${MAX_PASSWORD} символов`;
}

export const EMAIL_FORMAT_ERROR = "Введите почту в формате you@example.com";

// The server has the final word; this only catches obvious typos before a round trip.
export function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
