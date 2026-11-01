"use client";

import { FormEvent, useId, useRef, useState } from "react";
import d from "./dialog.module.css";
import s from "./component-panel.module.css";
import StatusPill from "./status-pill";
import { CloseIcon, PlusIcon } from "./icons";
import { DaysInput } from "./add-event-parts";
import { useModal } from "@/lib/use-modal";
import { useGarage } from "@/lib/store";
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

  const { component, system, part, resource, status } = row;
  const units = vehicle.units;
  const history = sortEventsByDateDesc(events.filter((e) => e.componentIds.includes(component.id)));
  const inspectionStatus = inspection ? statusFromCondition(inspection.condition) : null;
  // What a first record for this component naturally is.
  const firstRecord: MaintenanceType = component.kind === "inspectable" ? "inspection" : "replacement";
  const lifeMissing = resource.kind === "unknown" && resource.reason === "no_expected_life";
  // The last replacement is the template: same part, likely same shop and price.
  const lastReplacement = history.find((e) => e.type === "replacement");

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
            <h2 className={s.title} id={titleId}>{component.name}</h2>
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
          {lastReplacement ? (
            <button
              type="button"
              className={d.ghostBtn}
              onClick={() => onAddRecord("replacement", lastReplacement)}
            >
              Повторить замену
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={d.primary} onClick={() => onAddRecord(firstRecord)}>
            <PlusIcon />
            Добавить запись
          </button>
        </footer>
      </div>
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
