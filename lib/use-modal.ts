"use client";

import { KeyboardEvent, RefObject, useCallback, useEffect, useRef } from "react";

export function useModal(
  open: boolean,
  onClose: () => void,
  firstFieldRef?: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    firstFieldRef?.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
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

  return { overlayClick, trapTab };
}
