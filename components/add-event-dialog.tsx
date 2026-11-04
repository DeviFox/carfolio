"use client";

import { FormEvent, useId, useMemo, useRef, useState } from "react";
import s from "./dialog.module.css";
import { CloseIcon } from "./icons";
import { useConfirmClose, useModal } from "@/lib/use-modal";
import { useGarage } from "@/lib/store";
import { componentLabel, findActiveInstalledPart, findComponentByName, formatKm } from "@/lib/compute";
import { sortComponentsByName, systemForCategory, type ComponentPosition } from "@/lib/compute";
import { groupInt, groupedChange, intText } from "@/lib/number-input";
import { FLUIDS, POSITIONED_CATEGORIES } from "@/lib/types";
import { PositionPicker } from "./position-picker";
import type { Condition, MaintenanceEvent, MaintenanceType, Vehicle } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  defaultSystemId?: string; // open with a new component in this system
  defaultComponentId?: string; // open for this existing component, e.g. from its panel
  defaultType?: MaintenanceType;
  // Previous record to copy cost, currency and notes from; date and mileage stay today's.
  template?: MaintenanceEvent;
};

import {
  COMPONENT_LABEL,
  CONDITIONS,
  CostFields,
  type Errors,
  FLUID,
  NEW,
  NotesField,
  ResourceFields,
  SUBMIT_LABEL,
  TYPES,
  RepeatSummary,
  errorAttrs,
  formatLongDate,
  hasSameDayRecord,
  lifeOf,
  minorToText,
  resourceLine,
  toNumber,
  today,
} from "./add-event-parts";
import { installsPart } from "@/lib/records";

export default function AddEventDialog({
  open,
  onClose,
  vehicle,
  defaultSystemId,
  defaultComponentId,
  defaultType = "replacement",
  template,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const costRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const systems = useGarage((st) => st.systems);
  const components = useGarage((st) => st.components);
  const installedParts = useGarage((st) => st.installedParts);
  const events = useGarage((st) => st.events);
  const addRecord = useGarage((st) => st.addRecord);

  const vehicleSystems = useMemo(
    () => systems.filter((x) => x.vehicleId === vehicle.id && !x.isArchived).sort((a, b) => a.sortOrder - b.sortOrder),
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
  const [position, setPosition] = useState<ComponentPosition>({});
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState(intText(vehicle.currentMileageKm));
  const templateCost = minorToText(template?.costMinorUnits);
  const templateNotes = template?.notes ?? "";
  const [cost, setCost] = useState(templateCost);
  const [currency, setCurrency] = useState(template?.currency ?? "RUB");
  const [track, setTrack] = useState<boolean | null>(null);
  const [lifeKm, setLifeKm] = useState(() => lifeOf(defaultComponentId, installedParts, "expectedLifeKm"));
  const [lifeDays, setLifeDays] = useState(() => lifeOf(defaultComponentId, installedParts, "expectedLifeDays"));
  const [condition, setCondition] = useState<Condition | "">("");
  const [notes, setNotes] = useState(templateNotes);
  // Repeat mode hides the settled fields (type, component, resource) until asked.
  const [expanded, setExpanded] = useState(!template);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestClose = useConfirmClose(
    [type, pick, name, systemId, position, date, mileage, cost, currency, track, lifeKm, lifeDays, condition, notes],
    onClose,
  );
  // Repeating a job, the price is the one thing to judge, so focus starts there.
  const { overlayClick, trapTab, stacked } = useModal(open, requestClose, template ? costRef : typeRef);

  if (!open) return null;

  const unit = "км";
  const isNote = type === "observation";
  const isFluid = type === "fluid_service";
  const installs = installsPart(type);
  const isNew = !isNote && !isFluid && pick === NEW;
  const fluidComponent = (key: string) => vehicleComponents.find((c) => c.fluid === key);
  // Fluids come only from the catalog: they are topped up, replaced or inspected, never repaired or bought.
  const noFluids = type === "repair" || type === "purchase";
  const choices = vehicleComponents.filter((c) => (isFluid ? !!c.fluid : noFluids ? !c.fluid : true));
  const missingFluids = isNote || noFluids ? [] : FLUIDS.filter((f) => !fluidComponent(f.key));
  const pickedFluid = missingFluids.find((f) => FLUID + f.key === pick);
  const fluidSystem = pickedFluid ? systemForCategory(vehicleSystems, pickedFluid.category) : undefined;
  const selected = isNew ? undefined : choices.find((c) => c.id === pick);
  const pickValue = selected ? selected.id : isNew || pickedFluid ? pick : "";
  const prevPart = selected ? findActiveInstalledPart(selected.id, installedParts) : undefined;
  // Track by default for anything with a resource; inspectables only if a resource was set before.
  const trackAuto = selected
    ? selected.kind !== "inspectable" || !!prevPart?.expectedLifeKm || !!prevPart?.expectedLifeDays
    : true;
  // A purchase is often a one-off (a spare wheel), so its life is opt-in.
  const tracking = installs && (track ?? (type === "replacement" && trackAuto));
  const newSystem = vehicleSystems.find((x) => x.id === systemId);
  const positioned = isNew && !!newSystem && POSITIONED_CATEGORIES.includes(newSystem.category);
  const newPosition = positioned ? position : {};
  const duplicate = isNew ? findComponentByName(vehicleComponents, name, undefined, newPosition) : undefined;
  // The template only speaks for the same job on the same component.
  const repeat = !!template && type === "replacement" && !!selected && selected.id === defaultComponentId;
  const compact = repeat && !expanded;
  const costCarried = repeat && templateCost !== "" && cost === templateCost;
  const notesCarried = repeat && templateNotes.trim() !== "" && notes === templateNotes;

  const groups = vehicleSystems
    .map((sys) => ({ sys, items: sortComponentsByName(choices.filter((c) => c.systemId === sys.id)) }))
    .filter((g) => g.items.length > 0);

  // Leaving the templated job: values copied from it no longer apply.
  function leaveTemplate() {
    if (!template) return;
    if (cost === templateCost) setCost("");
    if (notes === templateNotes) setNotes("");
  }

  function chooseType(value: MaintenanceType) {
    setType(value);
    if (value !== "replacement") leaveTemplate();
  }

  function chooseComponent(value: string) {
    if (value !== defaultComponentId) leaveTemplate();
    setPick(value);
    setTrack(null);
    setErrors((e) => ({ ...e, component: undefined, name: undefined }));
    // A previous part's resource is the only grounded default for the new one.
    const prev = value && value !== NEW ? findActiveInstalledPart(value, installedParts) : undefined;
    setLifeKm(prev?.expectedLifeKm ? intText(prev.expectedLifeKm) : "");
    setLifeDays(prev?.expectedLifeDays ? String(prev.expectedLifeDays) : "");
  }

  function validate(): Errors {
    const e: Errors = {};
    if (isNew) {
      if (!name.trim()) e.name = "Укажите название.";
      else if (findComponentByName(vehicleComponents, name, systemId, newPosition)) {
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
      } else if (vehicle.currentMileageKm !== undefined && n > vehicle.currentMileageKm) {
        e.mileage = `Больше текущего пробега (${formatKm(vehicle.currentMileageKm)}). Сначала обновите пробег автомобиля.`;
      }
    } else if (!isNote) {
      e.mileage = "Укажите пробег.";
    }
    if (cost.trim()) {
      const n = toNumber(cost);
      if (!Number.isFinite(n) || n < 0) e.cost = "Стоимость не может быть отрицательной.";
    }
    if (tracking && lifeKm.trim()) {
      const n = toNumber(lifeKm);
      if (!Number.isFinite(n) || n <= 0) e.lifeKm = "Срок службы должен быть больше нуля.";
    }
    if (tracking && lifeDays.trim() && !(toNumber(lifeDays) > 0)) {
      e.lifeDays = "Срок службы должен быть больше нуля.";
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
    const costMinor = cost.trim() ? Math.round(toNumber(cost) * 100) : undefined;
    const result = addRecord({
      vehicleId: vehicle.id,
      type,
      date,
      mileageKm: mileage.trim() ? toNumber(mileage) : undefined,
      componentId: selected?.id,
      newComponent: isNew
        ? { name: name.trim(), systemId, ...newPosition }
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
    <div className={`${s.overlay} ${stacked ? s.stacked : ""}`} onClick={overlayClick} role="presentation">
      <div
        ref={dialogRef}
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-sub`}
        onKeyDown={(e) => trapTab(e, dialogRef.current)}
      >
        <div className={s.header}>
          <div className={s.titleGroup}>
            <h2 className={s.title} id={titleId}>
              {repeat && selected ? `Замена: ${componentLabel(selected)}` : "Добавить запись"}
            </h2>
            <p className={s.subtitle} id={`${titleId}-sub`}>
              {repeat && template
                ? `Прошлая замена — ${formatLongDate(template.date)}`
                : "Что сделали с автомобилем?"}
            </p>
          </div>
          <button type="button" className={s.close} onClick={requestClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>

        <form className={s.form} onSubmit={onSubmit} noValidate>
          {compact ? (
            <RepeatSummary summary={resourceLine(tracking, lifeKm, lifeDays)} onEdit={() => setExpanded(true)} />
          ) : (
            <>
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-type">Что сделали?</label>
              <select
                id="ar-type"
                ref={typeRef}
                className={s.select}
                value={type}
                onChange={(e) => chooseType(e.target.value as MaintenanceType)}
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
                {...errorAttrs("ar-component", errors.component)}
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
                        <option key={c.id} value={c.id}>{componentLabel(c)}</option>
                      ) : (
                        <option key={f.key} value={FLUID + f.key}>{f.name}</option>
                      );
                    })
                  : groups.map((g) => (
                      <optgroup key={g.sys.id} label={g.sys.name}>
                        {g.items.map((c) => (
                          <option key={c.id} value={c.id}>{componentLabel(c)}</option>
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
              {errors.component && <span className={s.error} id="ar-component-error">{errors.component}</span>}
            </div>
            </>
          )}

          {isNew ? (
            <div className={s.row}>
              <div className={s.field}>
                <label className={s.label} htmlFor="ar-name">Название</label>
                <input
                  id="ar-name"
                  className={`${s.input} ${errors.name ? s.invalid : ""}`}
                  {...errorAttrs("ar-name", errors.name)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, моторное масло"
                  autoComplete="off"
                />
                {errors.name && <span className={s.error} id="ar-name-error">{errors.name}</span>}
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
                  {...errorAttrs("ar-system", errors.system)}
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                >
                  {vehicleSystems.map((sys) => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>
                {errors.system && <span className={s.error} id="ar-system-error">{errors.system}</span>}
              </div>
            </div>
          ) : null}
          {positioned ? <PositionPicker value={position} onChange={setPosition} /> : null}

          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label} htmlFor="ar-date">Дата</label>
              <input
                id="ar-date"
                type="date"
                className={`${s.input} ${errors.date ? s.invalid : ""}`}
                {...errorAttrs("ar-date", errors.date)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today()}
              />
              {errors.date ? (
                <span className={s.error} id="ar-date-error">{errors.date}</span>
              ) : !isNote && hasSameDayRecord(events, selected?.id, type, date) ? (
                <span className={s.warning}>Такая запись на эту дату уже есть</span>
              ) : null}
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
                  {...errorAttrs("ar-mileage", errors.mileage)}
                  value={mileage}
                  onChange={groupedChange(groupInt, setMileage)}
                  autoComplete="off"
                />
                <span className={s.suffix}>{unit}</span>
              </div>
              {errors.mileage && <span className={s.error} id="ar-mileage-error">{errors.mileage}</span>}
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

          <CostFields
            inputRef={costRef}
            cost={cost}
            currency={currency}
            onCostChange={setCost}
            onCurrencyChange={setCurrency}
            carried={costCarried}
            error={errors.cost}
          />

          {installs && !compact ? (
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

          <NotesField
            isNote={isNote}
            value={notes}
            onChange={setNotes}
            carried={notesCarried}
            error={errors.notes}
          />

          {formError && <span className={s.error} role="alert">{formError}</span>}

          <div className={s.footer}>
            <button type="button" className={s.ghostBtn} onClick={requestClose}>
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
