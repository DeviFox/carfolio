"use client";

import { useEffect, useId, useRef, useState } from "react";
import s from "./dialog.module.css";
import { useModal } from "@/lib/use-modal";
import { answerOffer, startSync, useSync } from "@/lib/sync";

// Runs garage sync for the whole app (mounted once, in the root layout) and
// asks the one question it can't answer alone.
export default function GarageSync() {
  useEffect(startSync, []);
  const offer = useSync((st) => st.offer);
  return offer ? <ImportOffer newCars={offer.newCars} accountCars={offer.accountCars} /> : null;
}

// A guest garage meets an account that already has cars. Adding is the
// default: declining sets the browser's cars aside until sign-out, so
// neither answer loses anything.
function ImportOffer({ newCars, accountCars }: { newCars: number; accountCars: number }) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  const answer = (add: boolean) => {
    if (busy) return;
    setBusy(true);
    void answerOffer(add);
  };
  // Esc is "not now": the non-destructive answer.
  const { trapTab } = useModal(true, () => answer(false), addRef);

  return (
    <div className={s.overlay} role="presentation">
      <div
        ref={dialogRef}
        className={`${s.dialog} ${s.narrow}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={(e) => trapTab(e, dialogRef.current)}
      >
        <div className={s.header}>
          <div className={s.titleGroup}>
            <h2 className={s.title} id={titleId}>
              Добавить {newCars === 1 ? "машину" : "машины"} из браузера?
            </h2>
            <p className={s.subtitle} id={descId}>
              {newCars === 1
                ? "На этом устройстве есть машина, которой нет в облаке."
                : `На этом устройстве есть ${cars(newCars)}, которых нет в облаке.`}{" "}
              В облаке уже {cars(accountCars)}. Если добавить, все они будут объеденены в одном гараже на любом
              устройстве.
            </p>
          </div>
        </div>
        <p className={s.hint}>
          Если не добавлять, машины из устройства будут скрыты и вернутся сюда после выхода из аккаунта.
        </p>
        <div className={s.footer}>
          <button type="button" className={s.ghostBtn} onClick={() => answer(false)} disabled={busy}>
            Не добавлять
          </button>
          <button ref={addRef} type="button" className={s.primary} onClick={() => answer(true)} disabled={busy}>
            {busy ? "Добавляем…" : "Добавить в облако"}
          </button>
        </div>
      </div>
    </div>
  );
}

function cars(n: number): string {
  const abs = n % 100;
  const n1 = abs % 10;
  const word =
    abs > 10 && abs < 20 ? "машин" : n1 === 1 ? "машина" : n1 > 1 && n1 < 5 ? "машины" : "машин";
  return `${n} ${word}`;
}
