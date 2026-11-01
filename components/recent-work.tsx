"use client";

import { useState } from "react";
import styles from "@/app/car/page.module.css";
import { EVENT_TYPE_LABEL, formatKm, formatMoney } from "@/lib/compute";
import type { Component, MaintenanceEvent, Vehicle } from "@/lib/types";

const VISIBLE = 5;

type Props = {
  events: MaintenanceEvent[]; // newest first
  components: Component[];
  units: Vehicle["units"];
  onOpen: (event: MaintenanceEvent) => void;
};

// The car's maintenance timeline. Shows the latest five until История ships;
// every row opens the record so a typo can be fixed or removed.
export default function RecentWork({ events, components, units, onOpen }: Props) {
  const [showAll, setShowAll] = useState(false);
  if (events.length === 0) return null;
  const shown = showAll ? events : events.slice(0, VISIBLE);

  return (
    <section aria-labelledby="recent-work-title">
      <div className={styles.sectionHead}>
        <h2 id="recent-work-title" className={styles.sectionTitle}>
          {showAll ? "Все работы" : "Недавние работы"}
        </h2>
        {events.length > VISIBLE ? (
          <button type="button" className={styles.sectionLink} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Свернуть" : `Показать все ${events.length}`}
          </button>
        ) : null}
      </div>
      <ul className={styles.eventList}>
        {shown.map((e) => {
          const names = e.componentIds
            .map((id) => components.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", ");
          const date = new Date(e.date);
          return (
            <li key={e.id} className={styles.eventItem}>
              <button type="button" className={styles.eventRow} onClick={() => onOpen(e)}>
                <span className={styles.eventDate}>
                  <span className={styles.eventDateDay}>
                    {date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                  </span>
                  <span className={styles.eventDateYear}>{date.getFullYear()}</span>
                </span>
                <span className={styles.eventMain}>
                  <span className={styles.eventTitle}>
                    {EVENT_TYPE_LABEL[e.type]}
                    {names ? `: ${names}` : ""}
                  </span>
                  <span className={`${styles.eventMeta} numeric`}>
                    {[
                      e.mileageKm !== undefined ? formatKm(e.mileageKm, units) : null,
                      e.costMinorUnits !== undefined ? formatMoney(e.costMinorUnits, e.currency) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {e.notes ? <span className={styles.eventNotes}>{e.notes}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
