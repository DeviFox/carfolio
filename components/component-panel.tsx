"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import d from "./dialog.module.css";
import s from "./component-panel.module.css";
import StatusPill from "./status-pill";
import { CloseIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";
import { DaysInput } from "./add-event-parts";
import { useModal } from "@/lib/use-modal";
import { useGarage } from "@/lib/store";
import { componentDeleteEffect } from "@/lib/records";
import {
  EVENT_TYPE_LABEL,
  formatDuration,
  formatKm,
  formatMoney,
  formatRatioPercent,
  resourceSummary,
  sortEventsByDateDesc,
  statusFromCondition,
} from "@/lib/compute";
import type { ComponentInspection, MaintenanceEvent, MaintenanceType, Vehicle } from "@/lib/types";
import type { ComponentRow } from "./system-list";

type Props = {
  row: ComponentRow;
  vehicle: Vehicle;
  events: MaintenanceEvent[];
  inspection?: ComponentInspection;
  onClose: () => void;
  // template — a previous record to prefill the form from.
  onAddRecord: (type: MaintenanceType, template?: MaintenanceEvent) => void;
  onOpenEvent: (event: MaintenanceEvent) => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

export default function ComponentPanel({
  row,
  vehicle,
  events,
  inspection,
  onClose,
  onAddRecord,
  onOpenEvent,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Focus lands on the sheet itself, so opening it doesn't ring the close button.
  const { overlayClick, trapTab } = useModal(true, onClose, panelRef);
  const [editingLife, setEditingLife] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteComponent = useGarage((st) => st.deleteComponent);
  // Land on the safe choice, so a stray Enter doesn't delete.
  useEffect(() => {
    if (confirmingDelete) cancelDeleteRef.current?.focus();
  }, [confirmingDelete]);

  const { component, system, part, resource, status } = row;
  const units = vehicle.units;
  const history = sortEventsByDateDesc(events.filter((e) => e.componentIds.includes(component.id)));
  const inspectionStatus = inspection ? statusFromCondition(inspection.condition) : null;
  // What a first record for this component naturally is.
  const firstRecord: MaintenanceType = component.kind === "inspectable" ? "inspection" : "replacement";
  const lifeMissing = resource.kind === "unknown" && resource.reason === "no_expected_life";
  // The last replacement is the template: same part, likely same shop and price.
  const lastReplacement = history.find((e) => e.type === "replacement");
  const deleteNote = componentDeleteEffect(component.id, events);

  return (
    <div className={s.overlay} onClick={overlayClick} role="presentation">
      <div
        ref={panelRef}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => trapTab(e, panelRef.current)}
      >
        <header className={s.header}>
          <div className={s.titleGroup}>
            <EditableTitle id={titleId} componentId={component.id} name={component.name} />
            <p className={s.subtitle}>{system.name}</p>
          </div>
          <button type="button" className={d.close} onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </header>

        <section className={s.section} aria-label="Ресурс">
          <div className={s.statusRow}>
            <StatusPill label={status.label} text={status.text} />
            {resource.kind === "known" ? (
              <span className={`${s.summary} numeric`}>{resourceSummary(resource, units)}</span>
            ) : null}
          </div>

          {resource.kind === "known" ? (
            <>
              <div className={s.meter}>
                <span className={`${s.pct} mono numeric`}>{formatRatioPercent(resource.ratio)}</span>
                <div className={s.bar} aria-hidden="true">
                  <div
                    className={`${s.fill} ${s[`fill-${status.label}`]}`}
                    style={{ width: `${Math.round(resource.ratio * 100)}%` }}
                  />
                </div>
              </div>
              <p className={s.hint}>Прогноз по пробегу и времени с установки, а не замер износа.</p>
            </>
          ) : (
            <p className={s.empty}>
              {lifeMissing
                ? "Ресурс не задан. Укажите его, чтобы считать остаток."
                : resource.kind === "unknown" && resource.reason === "no_current_mileage"
                  ? "Не указан текущий пробег автомобиля. Укажите его, чтобы считать остаток."
                  : part
                  ? "Неизвестно, когда установлена текущая деталь."
                  : component.kind === "inspectable"
                    ? "Ресурс не отслеживается, состояние берётся из осмотров."
                    : "Нет записей о замене. Добавьте её, чтобы считать ресурс."}
            </p>
          )}

          {part ? (
            <dl className={s.facts}>
              <div>
                <dt>Установлено</dt>
                <dd className="numeric">
                  {[
                    part.installedAtDate ? formatDate(part.installedAtDate) : null,
                    part.installedAtMileageKm !== undefined ? formatKm(part.installedAtMileageKm, units) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt>Ресурс</dt>
                <dd className="numeric">
                  {[
                    part.expectedLifeKm ? formatKm(part.expectedLifeKm, units) : null,
                    part.expectedLifeDays ? formatDuration(part.expectedLifeDays) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "не задан"}
                </dd>
              </div>
              {resource.kind === "known" ? (
                <div>
                  <dt>Прошло</dt>
                  <dd className="numeric">
                    {[
                      resource.drivenKm !== undefined ? formatKm(resource.drivenKm, units) : null,
                      resource.elapsedDays !== undefined ? formatDuration(resource.elapsedDays) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {part && (editingLife || lifeMissing) ? (
            <LifeForm
              partId={part.id}
              initialKm={part.expectedLifeKm}
              initialDays={part.expectedLifeDays}
              unit={units === "km" ? "км" : "миль"}
              onDone={() => setEditingLife(false)}
              onCancel={editingLife ? () => setEditingLife(false) : undefined}
            />
          ) : part ? (
            <button type="button" className={s.linkBtn} onClick={() => setEditingLife(true)}>
              Изменить ресурс
            </button>
          ) : null}
        </section>

        {inspection ? (
          <section className={s.section} aria-labelledby={`${titleId}-insp`}>
            <h3 className={s.sectionTitle} id={`${titleId}-insp`}>Последний осмотр</h3>
            <div className={s.inspection}>
              <span className="numeric">{formatDate(inspection.date)}</span>
              {inspectionStatus ? (
                <StatusPill label={inspectionStatus.label} text={inspectionStatus.text} size="sm" />
              ) : null}
            </div>
            {inspection.notes ? <p className={s.note}>{inspection.notes}</p> : null}
          </section>
        ) : null}

        <section className={s.section} aria-labelledby={`${titleId}-hist`}>
          <h3 className={s.sectionTitle} id={`${titleId}-hist`}>
            История
            <span className={`${s.count} mono numeric`}>{history.length}</span>
          </h3>
          {history.length === 0 ? (
            <p className={s.empty}>Записей пока нет.</p>
          ) : (
            <ol className={s.history}>
              {history.map((e) => (
                <li key={e.id} className={s.eventItem}>
                  <button type="button" className={s.event} onClick={() => onOpenEvent(e)}>
                  <div className={s.eventHead}>
                    <span className={s.eventType}>{EVENT_TYPE_LABEL[e.type]}</span>
                    <span className={`${s.eventDate} numeric`}>{formatDate(e.date)}</span>
                  </div>
                  <div className={`${s.eventMeta} numeric`}>
                    {[
                      e.mileageKm !== undefined ? formatKm(e.mileageKm, units) : null,
                      e.costMinorUnits !== undefined ? formatMoney(e.costMinorUnits, e.currency) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {e.notes ? <p className={s.note}>{e.notes}</p> : null}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className={s.footer}>
          {confirmingDelete ? (
            <div
              className={`${d.deleteConfirm} ${s.confirm}`}
              role="alertdialog"
              aria-labelledby={`${titleId}-del`}
              aria-describedby={`${titleId}-del-desc`}
            >
              <p id={`${titleId}-del`} className={d.deleteTitle}>Удалить «{component.name}»?</p>
              <p id={`${titleId}-del-desc`} className={d.deleteText}>
                {deleteNote ? `${deleteNote} ` : ""}Отменить это нельзя.
              </p>
              <div className={d.deleteActions}>
                <button
                  ref={cancelDeleteRef}
                  type="button"
                  className={d.ghostBtn}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Не удалять
                </button>
                <button
                  type="button"
                  className={d.dangerBtn}
                  onClick={() => {
                    onClose();
                    deleteComponent(component.id);
                  }}
                >
                  Удалить деталь
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`${d.close} ${s.trash}`}
                onClick={() => setConfirmingDelete(true)}
                aria-label="Удалить деталь"
                title="Удалить деталь"
              >
                <TrashIcon />
              </button>
              <div className={s.footerActions}>
                {lastReplacement ? (
                  <button
                    type="button"
                    className={d.ghostBtn}
                    onClick={() => onAddRecord("replacement", lastReplacement)}
                  >
                    Повторить замену
                  </button>
                ) : null}
                <button type="button" className={d.primary} onClick={() => onAddRecord(firstRecord)}>
                  <PlusIcon />
                  Добавить запись
                </button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

// The name is the title; clicking it turns it into a field. Enter or leaving
// the field saves, Escape puts the old name back without closing the panel.
function EditableTitle({ id, componentId, name }: { id: string; componentId: string; name: string }) {
  const renameComponent = useGarage((st) => st.renameComponent);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleBtnRef = useRef<HTMLButtonElement>(null);

  // Set once Enter/Escape has decided, so the blur from unmounting is ignored.
  const settledRef = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function start() {
    settledRef.current = false;
    setValue(name);
    setError(null);
    setEditing(true);
  }

  function close() {
    setEditing(false);
    setError(null);
  }

  // Keyboard path: decide, then hand focus back to the title.
  function finish(save: boolean) {
    if (save) {
      const err = renameComponent(componentId, value);
      if (err) {
        setError(err);
        return;
      }
    }
    settledRef.current = true;
    close();
    requestAnimationFrame(() => titleBtnRef.current?.focus());
  }

  if (!editing) {
    return (
      <h2 className={s.title} id={id}>
        <button ref={titleBtnRef} type="button" className={s.titleBtn} onClick={start} title="Переименовать">
          {name}
          <PencilIcon className={s.titlePencil} width={16} height={16} />
        </button>
      </h2>
    );
  }

  return (
    <div className={s.renameField}>
      <h2 className="sr-only" id={id}>{name}</h2>
      <input
        ref={inputRef}
        className={`${d.input} ${s.renameInput} ${error ? d.invalid : ""}`}
        aria-label="Название детали"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-rename-error` : undefined}
        maxLength={80}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finish(true);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            finish(false);
          }
        }}
        onBlur={() => {
          if (settledRef.current) return;
          // Clicking away from an emptied field means "never mind".
          if (!value.trim()) {
            close();
            return;
          }
          // A bad name stays in the field with its error rather than being lost.
          const err = renameComponent(componentId, value);
          if (err) setError(err);
          else close();
        }}
      />
      {error ? (
        <span className={d.error} id={`${id}-rename-error`} role="alert">{error}</span>
      ) : null}
    </div>
  );
}

type LifeFormProps = {
  partId: string;
  initialKm?: number;
  initialDays?: number;
  unit: string;
  onDone: () => void;
  onCancel?: () => void;
};

function LifeForm({ partId, initialKm, initialDays, unit, onDone, onCancel }: LifeFormProps) {
  const updateInstalledPart = useGarage((st) => st.updateInstalledPart);
  const [km, setKm] = useState(initialKm ? String(initialKm) : "");
  const [days, setDays] = useState(initialDays ? String(initialDays) : "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const kmNum = km.trim() ? Number(km.replace(/\s/g, "")) : undefined;
    const daysNum = days.trim() ? Number(days) : undefined;
    if (kmNum === undefined && daysNum === undefined) {
      setError("Укажите хотя бы один параметр.");
      return;
    }
    if ((kmNum !== undefined && !(kmNum > 0)) || (daysNum !== undefined && !(daysNum > 0))) {
      setError("Ресурс должен быть больше нуля.");
      return;
    }
    updateInstalledPart(partId, { expectedLifeKm: kmNum, expectedLifeDays: daysNum });
    onDone();
  }

  return (
    <form className={s.lifeForm} onSubmit={onSubmit} noValidate>
      <div className={d.row}>
        <div className={d.field}>
          <label className={d.label} htmlFor={`${partId}-km`}>По пробегу</label>
          <div className={d.suffixInput}>
            <input
              id={`${partId}-km`}
              className={`${d.input} ${error ? d.invalid : ""}`}
              inputMode="numeric"
              autoComplete="off"
              value={km}
              onChange={(e) => setKm(e.target.value.replace(/[^\d\s]/g, "").replace(/\s+/g, " "))}
            />
            <span className={d.suffix}>{unit}</span>
          </div>
        </div>
        <div className={d.field}>
          <label className={d.label} htmlFor={`${partId}-days`}>По времени</label>
          <DaysInput id={`${partId}-days`} value={days} onChange={setDays} invalid={Boolean(error)} />
        </div>
      </div>
      {error ? <span className={d.error} role="alert">{error}</span> : null}
      <div className={s.lifeActions}>
        {onCancel ? (
          <button type="button" className={d.ghostBtn} onClick={onCancel}>Отмена</button>
        ) : null}
        <button type="submit" className={d.ghostBtn}>Сохранить ресурс</button>
      </div>
    </form>
  );
}
