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
              <div className={s.suffixInput}>
                <input
                  id="ar-life-days"
                  type="text"
                  inputMode="numeric"
                  className={`${s.input} ${errors.lifeDays ? s.invalid : ""}`}
                  value={lifeDays}
                  onChange={(e) => onLifeDaysChange(e.target.value.replace(/[^\d]/g, ""))}
                  autoComplete="off"
                />
                <span className={s.suffix}>дн.</span>
              </div>
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
