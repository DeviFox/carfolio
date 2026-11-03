import { useState } from "react";
import s from "./position-picker.module.css";
import { useGarage } from "@/lib/store";
import { type ComponentPosition, positionLabel } from "@/lib/compute";
import { AXLE_LABEL, SIDE_LABEL, type Axle, type Component, type Side } from "@/lib/types";

const AXLES = Object.keys(AXLE_LABEL) as Axle[];
const SIDES = Object.keys(SIDE_LABEL) as Side[];

type Props = {
  value: ComponentPosition;
  onChange: (next: ComponentPosition) => void;
  // Shown in place of the label, e.g. when the picker sits under a title.
  label?: string | null;
};

// Two independent toggles: axle and side. Pressing the chosen one again clears it.
export function PositionPicker({ value, onChange, label = "Расположение" }: Props) {
  return (
    <div className={s.picker} role="group" aria-label="Расположение детали">
      {label ? <span className={s.label}>{label}</span> : null}
      <div className={s.groups}>
        <Group
          options={AXLES}
          labels={AXLE_LABEL}
          current={value.axle}
          onPick={(axle) => onChange({ ...value, axle })}
        />
        <Group
          options={SIDES}
          labels={SIDE_LABEL}
          current={value.side}
          onPick={(side) => onChange({ ...value, side })}
        />
      </div>
    </div>
  );
}

function Group<T extends string>({
  options,
  labels,
  current,
  onPick,
}: {
  options: T[];
  labels: Record<T, string>;
  current: T | undefined;
  onPick: (v: T | undefined) => void;
}) {
  return (
    <div className={s.group}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`${s.btn} ${current === o ? s.on : ""}`}
          aria-pressed={current === o}
          onClick={() => onPick(current === o ? undefined : o)}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

// Small read-only badge next to a component's name; nothing when unset.
export function PositionBadge({ value }: { value: ComponentPosition }) {
  const text = positionLabel(value);
  return text ? <span className={s.badge}>{text}</span> : null;
}

// Editable position of an existing component, saved on every press.
export function ComponentPositionField({ component }: { component: Component }) {
  const setComponentPosition = useGarage((st) => st.setComponentPosition);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={s.field}>
      <PositionPicker
        label={null}
        value={{ axle: component.axle, side: component.side }}
        onChange={(next) => setError(setComponentPosition(component.id, next))}
      />
      {error ? <span className={s.error} role="alert">{error}</span> : null}
    </div>
  );
}
