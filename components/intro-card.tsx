"use client";

import { useId, useRef, useState } from "react";
import s from "./intro-card.module.css";
import d from "./dialog.module.css";
import StatusPill from "./status-pill";
import { useModal } from "@/lib/use-modal";

// First-run story about the few ideas carfolio rests on, as a modal: opens by
// itself on the first visit to an empty garage, and from "как это работает".
const STORAGE_KEY = "carfolio.intro.dismissed";

export function introDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private mode or blocked storage: the card just shows again next time.
  }
}

type Page = { title: string; body: string; art: React.ReactNode };

const PAGES: Page[] = [
  {
    title: "Всё о машине — в одном месте",
    body:
      "Машина разделена на системы: двигатель, тормоза, шины и другие. Выберите нужную в списке или на схеме, чтобы посмотреть компоненты, их состояние и историю обслуживания.",
    art: (
      <ul className={s.rows}>
        <li><span className={s.rowName}>Тормоза</span><StatusPill label="ok" text="В норме" size="sm" /></li>
        <li><span className={s.rowName}>Шины</span><StatusPill label="attention" text="Низкий ресурс" size="sm" /></li>
        <li><span className={s.rowName}>Подвеска</span><StatusPill label="unknown" text="Нет данных" size="sm" /></li>
      </ul>
    ),
  },
  {
    title: "Запишите замену — остальное посчитаем",
    body:
      "Укажите дату, пробег и ресурс детали — например, 30 000 км или 2 года. Carfolio рассчитает остаток и подскажет, когда пора задуматься о замене.",
    art: (
      <div className={s.part}>
        <div className={s.partHead}>
          <span className={s.rowName}>Тормозные колодки</span>
          <StatusPill label="ok" text="В норме" size="sm" />
        </div>
        <div className={s.bar}><span style={{ width: "48%" }} /></div>
        <div className={`${s.barText} numeric`}><strong>48%</strong> ещё 14 500 км</div>
      </div>
    ),
  },
  {
    title: "Обновляйте пробег, чтобы расчёты были точнее",
    body:
      "Остаточный ресурс рассчитывается от текущего пробега. Обновляйте его время от времени на странице машины — показатели пересчитаются автоматически.",
    art: (
      <div className={s.odo}>
        <span className={s.odoLabel}>Текущий пробег</span>
        <span className={`${s.odoValue} mono numeric`}>87 500<small>км</small></span>
        <span className={s.odoBtn}>Обновить пробег</span>
      </div>
    ),
  },
  {
    title: "Повторная замена — без лишних действий",
    body:
      "При следующей замене нажмите «Повторить замену». Стоимость, заметка и ресурс заполнятся по прошлой записи. Останется проверить данные и сохранить.",
    art: (
      <div className={s.field}>
        <span className={s.fieldLabel}>Стоимость</span>
        <span className={`${s.fieldInput} numeric`}>8450</span>
        <span className={s.fieldHint}>* Стоимость рассчитана по данным прошлой замены</span>
      </div>
    ),
  },
];

export default function IntroCard({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const current = PAGES[page];
  const dialogRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  function close() {
    rememberDismissed();
    onClose();
  }
  // Esc and a click outside count as "Пропустить"; focus starts on "Далее".
  const { overlayClick, trapTab } = useModal(true, close, nextRef);

  return (
    <div className={d.overlay} onClick={overlayClick} role="presentation">
    <div
      ref={dialogRef}
      className={s.card}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(e) => trapTab(e, dialogRef.current)}
    >
      <h2 id={titleId} className="sr-only">Как устроен carfolio</h2>

      {/* Announce only where the reader is, not the whole page again. */}
      <p className="sr-only" aria-live="polite">
        Страница {page + 1} из {PAGES.length}: {current.title}
      </p>
      {/* Keyed by page so each one fades in. */}
      <div key={page} className={s.page}>
        <div className={s.text}>
          <span className={`${s.counter} mono`}>{page + 1} из {PAGES.length}</span>
          <h3 className={s.title}>{current.title}</h3>
          <p className={s.body}>{current.body}</p>
        </div>
        <div className={s.art} aria-hidden="true">
          <span className={s.example}>пример</span>
          {current.art}
        </div>
      </div>

      <div className={s.footer}>
        {last ? (
          <span className={s.reopenHint}>Открыть рассказ снова можно значком «?» вверху</span>
        ) : (
          <button type="button" className={s.skip} onClick={close}>Пропустить</button>
        )}
        <div className={s.nav}>
          <span className={s.dots} aria-hidden="true">
            {PAGES.map((_, i) => (
              <span key={i} className={`${s.dot} ${i === page ? s.dotOn : ""}`} />
            ))}
          </span>
          {page > 0 ? (
            <button type="button" className={d.ghostBtn} onClick={() => setPage(page - 1)}>Назад</button>
          ) : null}
          <button ref={nextRef} type="button" className={d.primary} onClick={last ? close : () => setPage(page + 1)}>
            {last ? "Понятно" : "Далее"}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
