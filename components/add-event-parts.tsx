import { useEffect, useState } from "react";
import s from "./dialog.module.css";
import type { Condition, MaintenanceType } from "@/lib/types";

type Field = "component" | "name" | "system" | "date" | "mileage" | "cost" | "lifeKm" | "lifeDays" | "notes";
export type Errors = Partial<Record<Field, string>>;

export const TYPES: { value: MaintenanceType; label: string }[] = [
  { value: "replacement", label: "Замена" },
  { value: "repair", label: "Ремонт" },
  { value: "inspection", label: "Осмотр" },
  { value: "fluid_service", label: "Долив жидкости" },
  { value: "observation", label: "Заметка" },
];

export const COMPONENT_LABEL: Record<MaintenanceType, string> = {
  replacement: "Что заменили?",
  repair: "Что ремонтировали?",
  inspection: "Что проверили?",
  fluid_service: "Что долили?",
  observation: "К чему относится",
};

export const SUBMIT_LABEL: Record<MaintenanceType, string> = {
  replacement: "Сохранить замену",
  repair: "Сохранить ремонт",
  inspection: "Сохранить осмотр",
  fluid_service: "Сохранить запись",
  observation: "Сохранить запись",
};

export const CONDITIONS: { value: Condition | ""; label: string }[] = [
  { value: "", label: "Не указан" },
  { value: "good", label: "В норме" },
  { value: "worn", label: "Требует внимания" },
  { value: "critical", label: "Критично" },
];

export const CURRENCIES = ["RUB", "USD", "EUR", "KZT", "UAH", "BYN"];

export const NEW = "__new";
// Catalog fluid the car doesn't have as a component yet: "__fluid:engine_oil".
export const FLUID = "__fluid:";

export const digits = (v: string) => v.replace(/[^\d\s]/g, "").replace(/\s+/g, " ");
export const toNumber = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
export const today = () => new Date().toISOString().slice(0, 10);

const TIME_UNITS = [
  { value: "d", label: "дн.", days: 1 },
  { value: "m", label: "мес.", days: 30 },
  { value: "y", label: "лет", days: 365 },
] as const;
type TimeUnit = (typeof TIME_UNITS)[number]["value"];

function splitDays(days: string): { amount: string; unit: TimeUnit } {
  const n = Number(days);
  if (!days || !(n > 0)) return { amount: "", unit: "m" };
  if (n % 365 === 0) return { amount: String(n / 365), unit: "y" };
  if (n % 30 === 0) return { amount: String(n / 30), unit: "m" };
  return { amount: days, unit: "d" };
}

// Life by time in the unit people think in (months, years); stored as days.
export function DaysInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (days: string) => void;
  invalid?: boolean;
}) {
  const [amount, setAmount] = useState(() => splitDays(value).amount);
  const [unit, setUnit] = useState<TimeUnit>(() => splitDays(value).unit);
  const factor = TIME_UNITS.find((u) => u.value === unit)!.days;

  // Follow outside changes (e.g. a component's previous life prefilled).
  useEffect(() => {
    const own = amount ? String(Number(amount) * factor) : "";
    if (value !== own) {
      const next = splitDays(value);
      setAmount(next.amount);
      setUnit(next.unit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emit(nextAmount: string, nextUnit: TimeUnit) {
    const f = TIME_UNITS.find((u) => u.value === nextUnit)!.days;
    onChange(nextAmount ? String(Number(nextAmount) * f) : "");
  }

  return (
    <div className={s.unitInput}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`${s.input} ${invalid ? s.invalid : ""}`}
        value={amount}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, "");
          setAmount(next);
          emit(next, unit);
        }}
      />
      <select
        className={s.select}
        aria-label="Единица времени"
        value={unit}
        onChange={(e) => {
          const next = e.target.value as TimeUnit;
          setUnit(next);
          emit(amount, next);
        }}
      >
        {TIME_UNITS.map((u) => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>
    </div>
  );
}

type ResourceProps = {
  tracking: boolean;
  onTrackingChange: (v: boolean) => void;
  lifeKm: string;
  lifeDays: string;
  onLifeKmChange: (v: string) => void;
  onLifeDaysChange: (v: string) => void;
  unit: string;
  errors: Errors;
};

export function ResourceFields({
  tracking,
  onTrackingChange,
  lifeKm,
  lifeDays,
  onLifeKmChange,
  onLifeDaysChange,
  unit,
  errors,
}: ResourceProps) {
  return (
    <>
      <div className={s.field}>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={tracking}
            onChange={(e) => onTrackingChange(e.target.checked)}
          />
          Отслеживать ресурс
        </label>
      </div>

      {tracking ? (
        <div className={s.field}>
          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-life-km">Ресурс по пробегу</label>
              <div className={s.suffixInput}>
                <input
                  id="ar-life-km"
                  type="text"
                  inputMode="numeric"
                  className={`${s.input} ${errors.lifeKm ? s.invalid : ""}`}
                  value={lifeKm}
                  onChange={(e) => onLifeKmChange(digits(e.target.value))}
                  autoComplete="off"
                />
                <span className={s.suffix}>{unit}</span>
              </div>
              {errors.lifeKm && <span className={s.error}>{errors.lifeKm}</span>}
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-life-days">Ресурс по времени</label>
              <DaysInput
                id="ar-life-days"
                value={lifeDays}
                onChange={onLifeDaysChange}
                invalid={Boolean(errors.lifeDays)}
              />
              {errors.lifeDays && <span className={s.error}>{errors.lifeDays}</span>}
            </div>
          </div>
          {!lifeKm.trim() && !lifeDays.trim() ? (
            <span className={s.hint}>Для расчёта остатка задайте хотя бы один параметр.</span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
