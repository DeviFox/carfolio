"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./dialog.module.css";
import { useGarage } from "@/lib/store";
import type { Vehicle } from "@/lib/types";

type Props = {
  vehicle: Vehicle;
  onDelete: () => void;
};

// Two-step delete inside the car settings dialog: a quiet link, then an
// inline confirmation that says exactly what goes away.
export default function DeleteCar({ vehicle, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const events = useGarage((s) => s.events.filter((e) => e.vehicleId === vehicle.id).length);
  const components = useGarage(
    (s) => s.components.filter((c) => c.vehicleId === vehicle.id).length,
  );
  const mileage = useGarage(
    (s) => s.mileageHistory.filter((m) => m.vehicleId === vehicle.id).length,
  );

  // Land on the safe choice so Enter doesn't delete by accident.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  if (!confirming) {
    return (
      <button type="button" className={styles.deleteLink} onClick={() => setConfirming(true)}>
        Удалить автомобиль
      </button>
    );
  }

  const losses = [
    events > 0 ? `${events} ${plural(events, "запись", "записи", "записей")} обслуживания` : null,
    components > 0 ? `${components} ${plural(components, "компонент", "компонента", "компонентов")}` : null,
    mileage > 0 ? `${mileage} ${plural(mileage, "отметка", "отметки", "отметок")} пробега` : null,
  ].filter(Boolean);

  return (
    <div className={styles.deleteConfirm} role="alertdialog" aria-labelledby="delete-car-title" aria-describedby="delete-car-desc">
      <p id="delete-car-title" className={styles.deleteTitle}>
        Удалить «{vehicle.name}»?
      </p>
      <p id="delete-car-desc" className={styles.deleteText}>
        {losses.length > 0 ? `Вместе с автомобилем удалятся ${losses.join(", ")}. ` : ""}
        Отменить это нельзя.
      </p>
      <div className={styles.deleteActions}>
        <button ref={cancelRef} type="button" className={styles.ghostBtn} onClick={() => setConfirming(false)}>
          Не удалять
        </button>
        <button type="button" className={styles.dangerBtn} onClick={onDelete}>
          Удалить автомобиль
        </button>
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}
