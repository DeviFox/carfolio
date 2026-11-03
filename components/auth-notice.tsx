"use client";

import { useEffect, useState } from "react";
import styles from "./auth.module.css";
import { CheckIcon, CloseIcon } from "./icons";
import { useAuth } from "@/lib/auth";

// The end of a sign-in, register or reset flow, or the garage moving into the
// account: one quiet line on the garage instead of a silent change. Taken from
// the store as it arrives, so it is shown once; the close button or leaving
// the garage ends it.
export default function AuthNotice() {
  const [text, setText] = useState<string | null>(null);
  const notice = useAuth((s) => s.notice);

  useEffect(() => {
    if (!notice) return;
    useAuth.getState().clearNotice();
    // The live region below mounts empty and fills a frame later: text that is
    // already there when a region appears is not announced by screen readers.
    requestAnimationFrame(() => setText(notice));
  }, [notice]);

  return (
    <div role="status">
      {text ? (
        <div className={`${styles.success} ${styles.notice}`}>
          <CheckIcon className={styles.successIcon} />
          <div>{text}</div>
          <button type="button" className={styles.noticeClose} onClick={() => setText(null)} aria-label="Закрыть уведомление">
            <CloseIcon />
          </button>
        </div>
      ) : null}
    </div>
  );
}
