"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import s from "./dialog.module.css";
import { CloseIcon } from "./icons";
import { CURRENCIES, digits, errorAttrs, minorToText, toNumber, today } from "./add-event-parts";
import { useConfirmClose, useModal } from "@/lib/use-modal";
import { useGarage } from "@/lib/store";
import { deleteEffect } from "@/lib/records";
import { EVENT_TYPE_LABEL } from "@/lib/compute";
import type { MaintenanceEvent, Vehicle } from "@/lib/types";

type Props = {
  event: MaintenanceEvent;
  vehicle: Vehicle;
  onClose: () => void;
};

type Errors = Partial<Record<"date" | "mileage" | "cost" | "notes", string>>;

const COSTED = new Set(["replacement", "repair", "fluid_service"]);

// Edit or delete one recorded event. Type and component stay fixed: changing
// them is a different record, so the owner deletes this one and adds another.
export default function EventDialog({ event, vehicle, onClose }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const components = useGarage((st) => st.components);
  const installedParts = useGarage((st) => st.installedParts);
  const updateEvent = useGarage((st) => st.updateEvent);
  const deleteEvent = useGarage((st) => st.deleteEvent);

  const isNote = event.type === "observation";
  const showCost = COSTED.has(event.type) || event.costMinorUnits !== undefined;
  const unit = vehicle.units === "km" ? "км" : "миль";
  const names = event.componentIds
    .map((id) => components.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const [date, setDate] = useState(event.date.slice(0, 10));
  const [mileage, setMileage] = useState(event.mileageKm !== undefined ? String(event.mileageKm) : "");
  const [cost, setCost] = useState(minorToText(event.costMinorUnits));
  const [currency, setCurrency] = useState(event.currency ?? "RUB");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const requestClose = useConfirmClose([date, mileage, cost, currency, notes], onClose);
  const { overlayClick, trapTab, stacked } = useModal(true, requestClose, firstFieldRef);

  useEffect(() => {
    if (confirming) cancelDeleteRef.current?.focus();
  }, [confirming]);

  function validate(): Errors {
    const e: Errors = {};
    if (!date) e.date = "Укажите дату.";
    else if (date > today()) e.date = "Дата не может быть в будущем.";
    if (mileage.trim()) {
      const n = toNumber(mileage);
      if (!Number.isFinite(n) || n < 0) e.mileage = "Введите пробег цифрами.";
    } else if (!isNote) {
      e.mileage = "Укажите пробег.";
    }
    if (showCost && cost.trim()) {
      const n = toNumber(cost);
      if (!Number.isFinite(n) || n < 0) e.cost = "Стоимость не может быть отрицательной.";
    }
    if (isNote && !notes.trim()) e.notes = "Напишите текст заметки.";
    return e;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length !== 0) return;
    const costMinor = showCost && cost.trim() ? Math.round(toNumber(cost) * 100) : undefined;
    const result = updateEvent(event.id, {
      date,
      mileageKm: mileage.trim() ? toNumber(mileage) : undefined,
      costMinorUnits: costMinor,
      currency: costMinor !== undefined ? currency : undefined,
      notes,
    });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    onClose();
  }

  const effect = deleteEffect(event, installedParts, vehicle.units);

  return (
    <div className={`${s.overlay} ${stacked ? s.stacked : ""}`} onClick={overlayClick} role="presentation">
      <div
        ref={dialogRef}
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => trapTab(e, dialogRef.current)}
      >
        <div className={s.header}>
          <div className={s.titleGroup}>
            <h2 className={s.title} id={titleId}>
              {EVENT_TYPE_LABEL[event.type]}
              {names ? `: ${names}` : ""}
            </h2>
            <p className={s.subtitle}>Чтобы сменить тип или компонент, удалите запись и добавьте новую.</p>
          </div>
          <button type="button" className={s.close} onClick={requestClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <form className={s.form} onSubmit={onSubmit} noValidate>
          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ev-date">Дата</label>
              <input
                id="ev-date"
                ref={firstFieldRef}
                type="date"
                className={`${s.input} ${errors.date ? s.invalid : ""}`}
                {...errorAttrs("ev-date", errors.date)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today()}
              />
              {errors.date && <span className={s.error} id="ev-date-error">{errors.date}</span>}
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="ev-mileage">
                Пробег
                {isNote ? <span className={s.optional}>опционально</span> : null}
              </label>
              <div className={s.suffixInput}>
                <input
                  id="ev-mileage"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`${s.input} ${errors.mileage ? s.invalid : ""}`}
                  {...errorAttrs("ev-mileage", errors.mileage)}
                  value={mileage}
                  onChange={(e) => setMileage(digits(e.target.value))}
                />
                <span className={s.suffix}>{unit}</span>
              </div>
              {errors.mileage && <span className={s.error} id="ev-mileage-error">{errors.mileage}</span>}
            </div>
          </div>

          {showCost ? (
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="ev-cost">
                  Стоимость <span className={s.optional}>опционально</span>
                </label>
                <input
                  id="ev-cost"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${s.input} ${errors.cost ? s.invalid : ""}`}
                  {...errorAttrs("ev-cost", errors.cost)}
                  value={cost}
                  onChange={(e) => setCost(e.target.value.replace(/[^\d\s,.]/g, "").replace(/\s+/g, " "))}
                />
                {errors.cost && <span className={s.error} id="ev-cost-error">{errors.cost}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="ev-cur">Валюта</label>
                <select id="ev-cur" className={s.select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className={s.field}>
            <label className={s.label} htmlFor="ev-notes">
              {isNote ? "Текст заметки" : "Заметка"}
              {isNote ? null : <span className={s.optional}>опционально</span>}
            </label>
            <textarea
              id="ev-notes"
              className={`${s.textarea} ${errors.notes ? s.invalid : ""}`}
              {...errorAttrs("ev-notes", errors.notes)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {errors.notes && <span className={s.error} id="ev-notes-error">{errors.notes}</span>}
          </div>

          {formError && <span className={s.error} role="alert">{formError}</span>}

          {confirming ? (
            <div className={s.deleteConfirm} role="alertdialog" aria-labelledby="ev-del-title" aria-describedby="ev-del-desc">
              <p id="ev-del-title" className={s.deleteTitle}>Удалить эту запись?</p>
              <p id="ev-del-desc" className={s.deleteText}>
                {effect ? `${effect} ` : ""}Отменить это нельзя.
              </p>
              <div className={s.deleteActions}>
                <button ref={cancelDeleteRef} type="button" className={s.ghostBtn} onClick={() => setConfirming(false)}>
                  Не удалять
                </button>
                <button
                  type="button"
                  className={s.dangerBtn}
                  onClick={() => {
                    deleteEvent(event.id);
                    onClose();
                  }}
                >
                  Удалить запись
                </button>
              </div>
            </div>
          ) : null}

          <div className={s.footer}>
            {confirming ? (
              <span />
            ) : (
              <button type="button" className={s.deleteLink} onClick={() => setConfirming(true)}>
                Удалить запись
              </button>
            )}
            <div className={s.footerActions}>
              <button type="button" className={s.ghostBtn} onClick={requestClose}>
                Отмена
              </button>
              <button type="submit" className={s.primary}>
                Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
