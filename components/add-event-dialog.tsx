"use client";

import { FormEvent, useId, useMemo, useRef, useState } from "react";
import s from "./dialog.module.css";
import { CloseIcon } from "./icons";
import { useModal } from "@/lib/use-modal";
import { useGarage } from "@/lib/store";
import {
  findActiveInstalledPart,
  findComponentByName,
  formatKm,
  sortComponentsByName,
  systemForCategory,
} from "@/lib/compute";
import { FLUIDS } from "@/lib/types";
import type { Condition, InstalledPart, MaintenanceType, Vehicle } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  // Opens the form with a new component in this system.
  defaultSystemId?: string;
  // Opens the form for this existing component, e.g. from its panel.
  defaultComponentId?: string;
  defaultType?: MaintenanceType;
};

import {
  COMPONENT_LABEL,
  CONDITIONS,
  CURRENCIES,
  type Errors,
  FLUID,
  NEW,
  ResourceFields,
  SUBMIT_LABEL,
  TYPES,
  digits,
  toNumber,
  today,
} from "./add-event-parts";

export default function AddEventDialog({
  open,
  onClose,
  vehicle,
  defaultSystemId,
  defaultComponentId,
  defaultType = "replacement",
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const submittingRef = useRef(false);
  const { overlayClick, trapTab } = useModal(open, onClose, firstFieldRef);

  const systems = useGarage((st) => st.systems);
  const components = useGarage((st) => st.components);
  const installedParts = useGarage((st) => st.installedParts);
  const addRecord = useGarage((st) => st.addRecord);

  const vehicleSystems = useMemo(
    () =>
      systems
        .filter((x) => x.vehicleId === vehicle.id && !x.isArchived)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [systems, vehicle.id],
  );
  const vehicleComponents = useMemo(
    () => components.filter((c) => c.vehicleId === vehicle.id && !c.isArchived),
    [components, vehicle.id],
  );

  const [type, setType] = useState<MaintenanceType>(defaultType);
  const [pick, setPick] = useState(
    defaultComponentId ?? (defaultSystemId || vehicleComponents.length === 0 ? NEW : ""),
  );
  const [name, setName] = useState("");
  const [systemId, setSystemId] = useState(defaultSystemId ?? vehicleSystems[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState(String(vehicle.currentMileageKm));
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [track, setTrack] = useState<boolean | null>(null);
  const [lifeKm, setLifeKm] = useState(() =>
    lifeOf(defaultComponentId, installedParts, "expectedLifeKm"),
  );
  const [lifeDays, setLifeDays] = useState(() =>
    lifeOf(defaultComponentId, installedParts, "expectedLifeDays"),
  );
  const [condition, setCondition] = useState<Condition | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const unit = vehicle.units === "km" ? "км" : "миль";
  const isNote = type === "observation";
  const isFluid = type === "fluid_service";
  const isNew = !isNote && !isFluid && pick === NEW;
  const fluidComponent = (key: string) => vehicleComponents.find((c) => c.fluid === key);
  // Fluids come only from the catalog: they are topped up, replaced or inspected, never repaired.
  const choices = vehicleComponents.filter((c) =>
    isFluid ? !!c.fluid : type === "repair" ? !c.fluid : true,
  );
  const missingFluids =
    isNote || type === "repair" ? [] : FLUIDS.filter((f) => !fluidComponent(f.key));
  const pickedFluid = missingFluids.find((f) => FLUID + f.key === pick);
  const fluidSystem = pickedFluid
    ? systemForCategory(vehicleSystems, pickedFluid.category)
    : undefined;
  const selected = isNew ? undefined : choices.find((c) => c.id === pick);
  const pickValue = selected ? selected.id : isNew || pickedFluid ? pick : "";
  const prevPart = selected ? findActiveInstalledPart(selected.id, installedParts) : undefined;
  // Track by default for anything with a resource; inspectables only if a resource was set before.
  const trackAuto = selected
    ? selected.kind !== "inspectable" || !!prevPart?.expectedLifeKm || !!prevPart?.expectedLifeDays
    : true;
  const tracking = type === "replacement" && (track ?? trackAuto);
  const showCost = type === "replacement" || type === "repair" || type === "fluid_service";
  const duplicate = isNew ? findComponentByName(vehicleComponents, name) : undefined;

  const groups = vehicleSystems
    .map((sys) => ({
      sys,
      items: sortComponentsByName(choices.filter((c) => c.systemId === sys.id)),
    }))
    .filter((g) => g.items.length > 0);

  function chooseComponent(value: string) {
    setPick(value);
    setTrack(null);
    setErrors((e) => ({ ...e, component: undefined, name: undefined }));
    // A previous part's resource is the only grounded default for the new one.
    const prev = value && value !== NEW ? findActiveInstalledPart(value, installedParts) : undefined;
    setLifeKm(prev?.expectedLifeKm ? String(prev.expectedLifeKm) : "");
    setLifeDays(prev?.expectedLifeDays ? String(prev.expectedLifeDays) : "");
  }

  function validate(): Errors {
    const e: Errors = {};
    if (isNew) {
      if (!name.trim()) e.name = "Укажите название.";
      else if (findComponentByName(vehicleComponents, name, systemId)) {
        e.name = "Такой компонент уже есть в этой системе.";
      }
      if (!systemId) e.system = "Выберите систему.";
    } else if (pickedFluid && !fluidSystem) {
      e.component = "У автомобиля нет систем, компонент некуда добавить.";
    } else if (!isNote && !selected && !pickedFluid) {
      e.component = isFluid ? "Выберите жидкость." : "Выберите компонент.";
    }
    if (!date) e.date = "Укажите дату.";
    else if (date > today()) e.date = "Дата не может быть в будущем.";
    if (mileage.trim()) {
      const n = toNumber(mileage);
      if (!Number.isFinite(n) || n < 0) {
        e.mileage = "Введите пробег цифрами.";
      } else if (n > vehicle.currentMileageKm) {
        e.mileage = `Больше текущего пробега (${formatKm(vehicle.currentMileageKm, vehicle.units)}). Сначала обновите пробег автомобиля.`;
      }
    } else if (!isNote) {
      e.mileage = "Укажите пробег.";
    }
    if (showCost && cost.trim()) {
      const n = toNumber(cost);
      if (!Number.isFinite(n) || n < 0) e.cost = "Стоимость не может быть отрицательной.";
    }
    if (tracking && lifeKm.trim()) {
      const n = toNumber(lifeKm);
      if (!Number.isFinite(n) || n <= 0) e.lifeKm = "Ресурс должен быть больше нуля.";
    }
    if (tracking && lifeDays.trim() && !(toNumber(lifeDays) > 0)) {
      e.lifeDays = "Ресурс должен быть больше нуля.";
    }
    if (isNote && !notes.trim()) e.notes = "Напишите текст заметки.";
    return e;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    const next = validate();
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length !== 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    const costMinor = showCost && cost.trim() ? Math.round(toNumber(cost) * 100) : undefined;
    const result = addRecord({
      vehicleId: vehicle.id,
      type,
      date,
      mileageKm: mileage.trim() ? toNumber(mileage) : undefined,
      componentId: selected?.id,
      newComponent: isNew
        ? { name: name.trim(), systemId }
        : pickedFluid && fluidSystem
          ? { name: pickedFluid.name, systemId: fluidSystem.id, fluid: pickedFluid.key }
          : undefined,
      costMinorUnits: costMinor,
      currency: costMinor !== undefined ? currency : undefined,
      notes,
      resource: tracking
        ? {
            expectedLifeKm: lifeKm.trim() ? toNumber(lifeKm) : undefined,
            expectedLifeDays: lifeDays.trim() ? toNumber(lifeDays) : undefined,
          }
        : undefined,
      condition: type === "inspection" && condition ? condition : undefined,
    });
    if (!result.ok) {
      setFormError(result.error);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    onClose();
  }

  return (
    <div className={s.overlay} onClick={overlayClick} role="presentation">
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
            <h2 className={s.title} id={titleId}>Добавить запись</h2>
            <p className={s.subtitle}>Что сделали с автомобилем?</p>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <form className={s.form} onSubmit={onSubmit} noValidate>
          <div className={s.field}>
            <label className={s.label} htmlFor="ar-type">Что сделали?</label>
            <select
              id="ar-type"
              ref={firstFieldRef}
              className={s.select}
              value={type}
              onChange={(e) => setType(e.target.value as MaintenanceType)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="ar-component">
              {COMPONENT_LABEL[type]}
              {isNote ? <span className={s.optional}>опционально</span> : null}
            </label>
            <select
              id="ar-component"
              className={`${s.select} ${errors.component ? s.invalid : ""}`}
              value={pickValue}
              onChange={(e) => chooseComponent(e.target.value)}
            >
              <option value="">
                {isNote ? "Без компонента" : isFluid ? "Выберите жидкость" : "Выберите компонент"}
              </option>
              {isFluid
                ? FLUIDS.map((f) => {
                    const c = fluidComponent(f.key);
                    return c ? (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ) : (
                      <option key={f.key} value={FLUID + f.key}>{f.name}</option>
                    );
                  })
                : groups.map((g) => (
                    <optgroup key={g.sys.id} label={g.sys.name}>
                      {g.items.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
              {!isFluid && missingFluids.length > 0 ? (
                <optgroup label="Жидкости">
                  {missingFluids.map((f) => (
                    <option key={f.key} value={FLUID + f.key}>{f.name}</option>
                  ))}
                </optgroup>
              ) : null}
              {!isNote && !isFluid && vehicleSystems.length > 0 ? (
                <option value={NEW}>+ Новый компонент</option>
              ) : null}
            </select>
            {errors.component && <span className={s.error}>{errors.component}</span>}
          </div>

          {isNew ? (
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="ar-name">Название</label>
                <input
                  id="ar-name"
                  className={`${s.input} ${errors.name ? s.invalid : ""}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, моторное масло"
                  autoComplete="off"
                />
                {errors.name && <span className={s.error}>{errors.name}</span>}
                {duplicate ? (
                  <span className={s.hint}>
                    Уже есть
                    {duplicate.systemId !== systemId
                      ? ` в «${vehicleSystems.find((x) => x.id === duplicate.systemId)?.name ?? ""}»`
                      : ""}
                    .{" "}
                    <button
                      type="button"
                      className={s.linkBtn}
                      onClick={() => chooseComponent(duplicate.id)}
                    >
                      Выбрать его
                    </button>
                  </span>
                ) : null}
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="ar-system">Система автомобиля</label>
                <select
                  id="ar-system"
                  className={`${s.select} ${errors.system ? s.invalid : ""}`}
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                >
                  {vehicleSystems.map((sys) => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>
                {errors.system && <span className={s.error}>{errors.system}</span>}
              </div>
            </div>
          ) : null}

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-date">Дата</label>
              <input
                id="ar-date"
                type="date"
                className={`${s.input} ${errors.date ? s.invalid : ""}`}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today()}
              />
              {errors.date && <span className={s.error}>{errors.date}</span>}
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-mileage">
                Пробег
                {isNote ? <span className={s.optional}>опционально</span> : null}
              </label>
              <div className={s.suffixInput}>
                <input
                  id="ar-mileage"
                  type="text"
                  inputMode="numeric"
                  className={`${s.input} ${errors.mileage ? s.invalid : ""}`}
                  value={mileage}
                  onChange={(e) => setMileage(digits(e.target.value))}
                  autoComplete="off"
                />
                <span className={s.suffix}>{unit}</span>
              </div>
              {errors.mileage && <span className={s.error}>{errors.mileage}</span>}
            </div>
          </div>

          {type === "inspection" ? (
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-condition">
                Результат <span className={s.optional}>опционально</span>
              </label>
              <select
                id="ar-condition"
                className={s.select}
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition | "")}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          ) : null}

          {showCost ? (
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="ar-cost">
                  Стоимость <span className={s.optional}>опционально</span>
                </label>
                <input
                  id="ar-cost"
                  type="text"
                  inputMode="decimal"
                  className={`${s.input} ${errors.cost ? s.invalid : ""}`}
                  value={cost}
                  onChange={(e) =>
                    setCost(e.target.value.replace(/[^\d\s,.]/g, "").replace(/\s+/g, " "))
                  }
                  autoComplete="off"
                />
                {errors.cost && <span className={s.error}>{errors.cost}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="ar-cur">Валюта</label>
                <select
                  id="ar-cur"
                  className={s.select}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {type === "replacement" ? (
            <ResourceFields
              tracking={tracking}
              onTrackingChange={setTrack}
              lifeKm={lifeKm}
              lifeDays={lifeDays}
              onLifeKmChange={setLifeKm}
              onLifeDaysChange={setLifeDays}
              unit={unit}
              errors={errors}
            />
          ) : null}

          <div className={s.field}>
            <label className={s.label} htmlFor="ar-notes">
              {isNote ? "Текст заметки" : "Заметка"}
              {isNote ? null : <span className={s.optional}>опционально</span>}
            </label>
            <textarea
              id="ar-notes"
              className={`${s.textarea} ${errors.notes ? s.invalid : ""}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isNote ? undefined : "Марка, артикул или другие подробности"}
            />
            {errors.notes && <span className={s.error}>{errors.notes}</span>}
          </div>

          {formError && <span className={s.error} role="alert">{formError}</span>}

          <div className={s.footer}>
            <button type="button" className={s.ghostBtn} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={s.primary} disabled={submitting}>
              {SUBMIT_LABEL[type]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function lifeOf(
  componentId: string | undefined,
  parts: InstalledPart[],
  key: "expectedLifeKm" | "expectedLifeDays",
): string {
  const value = componentId ? findActiveInstalledPart(componentId, parts)?.[key] : undefined;
  return value ? String(value) : "";
}
