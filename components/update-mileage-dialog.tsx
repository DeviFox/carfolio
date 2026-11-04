"use client";

import { FormEvent, useId, useRef, useState } from "react";
import s from "./dialog.module.css";
import { ArrowRightIcon, CloseIcon } from "./icons";
import { useModal } from "@/lib/use-modal";
import { useGarage } from "@/lib/store";
import { assertNewerMileage, formatKm } from "@/lib/compute";
import { groupInt, groupedChange, intText } from "@/lib/number-input";
import type { Vehicle } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle;
};

export default function UpdateMileageDialog({ open, onClose, vehicle }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const { overlayClick, trapTab } = useModal(open, onClose, firstFieldRef);

  const updateMileage = useGarage((s) => s.updateMileage);

  const [mileage, setMileage] = useState(intText(vehicle.currentMileageKm));
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number(mileage.replace(/\s/g, ""));
    const err = assertNewerMileage(n, vehicle.currentMileageKm);
    if (err) {
      setError(err);
      return;
    }
    updateMileage(vehicle.id, n);
    setError(null);
    onClose();
  }

  return (
    <div className={s.overlay} onClick={overlayClick} role="presentation">
      <div
        ref={dialogRef}
        className={`${s.dialog} ${s.narrow}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => trapTab(e, dialogRef.current)}
      >
        <div className={s.header}>
          <div className={s.titleGroup}>
            <h2 className={s.title} id={titleId}>Обновить пробег</h2>
            <p className={s.subtitle}>
              {vehicle.currentMileageKm !== undefined
                ? `Текущий: ${formatKm(vehicle.currentMileageKm)}`
                : "Пробег ещё не указан."}
            </p>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <form className={s.form} onSubmit={onSubmit} noValidate>
          <div className={s.field}>
            <label className={s.label} htmlFor="mu-mileage">
              Новый пробег <span className={s.required} aria-hidden="true">*</span>
            </label>
            <div className={s.suffixInput}>
              <input
                id="mu-mileage"
                ref={firstFieldRef}
                type="text"
                inputMode="numeric"
                className={`${s.input} ${error ? s.invalid : ""}`}
                value={mileage}
                onChange={groupedChange(groupInt, setMileage)}
                aria-invalid={!!error}
                aria-describedby={error ? "mu-err" : undefined}
                required
              />
              <span className={s.suffix}>{"км"}</span>
            </div>
            {error ? (
              <span className={s.error} id="mu-err">{error}</span>
            ) : (
              <span className={s.hint}>
                Значение с одометра. Пробег не может уменьшаться.
              </span>
            )}
          </div>

          <div className={s.footer}>
            <button type="button" className={s.ghostBtn} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={s.primary}>
              Сохранить
              <ArrowRightIcon />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
