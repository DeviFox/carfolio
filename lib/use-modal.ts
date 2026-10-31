"use client";

import { KeyboardEvent, RefObject, useCallback, useEffect, useRef, useState } from "react";

// Open modals, bottom to top. A dialog can open over the component sheet, so
// Esc and scroll locking belong to the topmost one only.
const stack: symbol[] = [];

// The page scrolls on <html>, so locking <body> alone lets it drift under a
// modal. Counted, so nested modals unlock only when the last one closes.
let locks = 0;
export function lockPageScroll(): () => void {
  if (locks++ === 0) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  };
}

// Dismissing a form with edits asks first (DESIGN.md, Dialog → Dismiss).
// Saving closes through the plain onClose, without the question.
export function useConfirmClose(values: unknown[], onClose: () => void): () => void {
  const snapshot = JSON.stringify(values);
  const initial = useRef(snapshot);
  return useCallback(() => {
    if (snapshot === initial.current || window.confirm("Закрыть без сохранения? Введённое пропадёт.")) {
      onClose();
    }
  }, [snapshot, onClose]);
}

export function useModal(
  open: boolean,
  onClose: () => void,
  firstFieldRef?: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose);
  // Opened over another modal: the page is already dimmed underneath.
  const [stacked] = useState(() => stack.length > 0);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol();
    stack.push(id);
    const returnTo = document.activeElement as HTMLElement | null;
    firstFieldRef?.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === id) {
        e.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    const unlock = lockPageScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      unlock();
      // Back to whatever opened it, e.g. "Повторить замену" in the sheet.
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [open, firstFieldRef]);

  const overlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) closeRef.current();
    },
    [],
  );

  const trapTab = useCallback(
    (e: KeyboardEvent, dialogEl: HTMLElement | null) => {
      if (e.key !== "Tab" || !dialogEl) return;
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  return { overlayClick, trapTab, stacked };
}
