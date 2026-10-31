"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import AddCarDialog from "@/components/add-car-dialog";
import AppBar, { VersionTag } from "@/components/app-bar";
import { ArrowRightIcon, PlusIcon } from "@/components/icons";
import { useGarage } from "@/lib/store";
import { formatKm } from "@/lib/compute";

export default function Page() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const vehicles = useGarage((s) => s.vehicles);
  const lastViewedVehicleId = useGarage((s) => s.lastViewedVehicleId);
  const components = useGarage((s) => s.components);
  const installedParts = useGarage((s) => s.installedParts);
  const events = useGarage((s) => s.events);

  useEffect(() => {
    setHydrated(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get("dialog") === "add") setOpen(true);
    const seedBody = params.get("seed-body");
    if (seedBody) {
      const g = useGarage.getState();
      g.reset();
      const v = g.addVehicle({
        name: `Demo ${seedBody}`,
        make: "Demo",
        model: seedBody,
        year: 2020,
        bodyType: seedBody as never,
        currentMileageKm: 50000,
        units: "km",
      });
      g.addSystem({ vehicleId: v.id, name: "Двигатель", category: "engine" });
      g.addSystem({ vehicleId: v.id, name: "Охлаждение", category: "cooling" });
      g.addSystem({ vehicleId: v.id, name: "Трансмиссия", category: "transmission" });
      g.addSystem({ vehicleId: v.id, name: "Подвеска", category: "suspension" });
      g.addSystem({ vehicleId: v.id, name: "Тормоза", category: "brakes" });
      g.addSystem({ vehicleId: v.id, name: "Шины", category: "tires" });
      g.addSystem({ vehicleId: v.id, name: "Электрика", category: "electrical" });
      g.addSystem({ vehicleId: v.id, name: "Прочее", category: "other" });
      router.replace(`/car/${v.id}`);
      return;
    }
    if (params.get("seed") === "demo") {
      const g = useGarage.getState();
      if (g.vehicles.length === 0) {
        const v = g.addVehicle({
          name: "Toyota Corolla",
          make: "Toyota",
          model: "Corolla",
          year: 2009,
          fuelType: "gasoline",
          engine: "1.5 1NZ-FE",
          bodyType: "wagon",
          currentMileageKm: 178430,
          units: "km",
        });
        const sys = g.addSystem({
          vehicleId: v.id,
          name: "Двигатель",
          category: "engine",
        });
        const comp = g.addComponent({
          vehicleId: v.id,
          systemId: sys.id,
          name: "Масло двигателя",
          kind: "consumable",
        });
        const part = g.addInstalledPart({
          componentId: comp.id,
          installedAtMileageKm: 76000,
          installedAtDate: "2024-10-12",
          expectedLifeKm: 10000,
          notes: "5W-30, фильтр заменён вместе",
        });
        g.addEvent({
          vehicleId: v.id,
          type: "replacement",
          date: "2024-10-12",
          mileageKm: 76000,
          componentIds: [comp.id],
          installedPartId: part.id,
          costMinorUnits: 650000,
          currency: "RUB",
          notes: "5W-30, фильтр заменён вместе",
        });
        router.replace(`/car/${v.id}`);
      }
    }
  }, [router]);

  const lastViewed = vehicles.find((v) => v.id === lastViewedVehicleId) ?? null;
  const hasCars = hydrated && vehicles.length > 0;

  return (
    <>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.topBrand}>
            <div className={styles.brandMark} aria-hidden="true">c</div>
            <div className={styles.brandName}>carfolio</div>
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setOpen(true)}
            aria-label="Добавить автомобиль"
          >
            <PlusIcon />
            Добавить
          </button>
        </header>
        <AppBar />

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.h1}>Мой гараж</h1>
            </div>
	          {vehicles.length > 0 ?
		          <button
			          type="button"
			          className={styles.primaryBtn}
			          onClick={() => setOpen(true)}
		          >
			          <PlusIcon/>
			          Добавить автомобиль
		          </button>
		          : null}
          </header>

          {hasCars && lastViewed && vehicles.length > 1 ? (
            <button
              type="button"
              className={styles.lastViewed}
              onClick={() => router.push(`/car?id=${encodeURIComponent(lastViewed.id)}`)}
            >
              <span className={styles.lvLabel}>Последний просмотр</span>
              <span className={styles.lvName}>{lastViewed.name}</span>
              <span className={styles.lvMileage}>
                {lastViewed.currentMileageKm !== undefined
                  ? formatKm(lastViewed.currentMileageKm, lastViewed.units)
                  : "пробег не указан"}
              </span>
              <ArrowRightIcon className={styles.lvChevron} />
            </button>
          ) : null}

          <section aria-labelledby="garage-grid-label">
            <h2 id="garage-grid-label" className="sr-only">
              Автомобили в гараже
            </h2>
            <div className={styles.grid} role="list">
              {hydrated ? (
                vehicles.length === 0 ? (
                  <button
                    type="button"
                    className={styles.emptySlot}
                    onClick={() => setOpen(true)}
                    aria-label="Добавить первый автомобиль"
                    role="listitem"
                  >
                    <div className={styles.emptyIcon} aria-hidden="true">
                      <PlusIcon />
                    </div>
                    <div className={styles.emptyTitle}>Добавить автомобиль</div>
                    <div className={styles.emptyDesc}>
                      Марка, модель, год, пробег — остальное появится по мере внесения работ.
                    </div>
                  </button>
                ) : (
                  <>
                    {vehicles.map((v) => {
                      const vehicleComponents = components.filter(
                        (c) => c.vehicleId === v.id && !c.isArchived,
                      );
                      const vehicleEvents = events.filter(
                        (e) => e.vehicleId === v.id,
                      );
                      return (
                        <button
                          key={v.id}
                          type="button"
                          className={styles.carCard}
                          onClick={() => router.push(`/car?id=${encodeURIComponent(v.id)}`)}
                          role="listitem"
                        >
                          <div className={styles.carCardMain}>
                            <div className={styles.carName}>{v.name}</div>
                            <div className={styles.carMeta}>
                              {[v.year, v.fuelType && fuelLabel(v.fuelType), v.engine]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                            <div className={`${styles.carMileage} numeric mono`}>
                              {v.currentMileageKm !== undefined ? formatKm(v.currentMileageKm, v.units) : "Пробег не указан"}
                            </div>
                          </div>
                          <div className={styles.carCardFooter}>
                            <span className={styles.carStat}>
                              <strong>{vehicleComponents.length}</strong> компонент
                              {plural(vehicleComponents.length, "", "а", "ов")}
                            </span>
                            <span className={styles.carStatSep}>·</span>
                            <span className={styles.carStat}>
                              <strong>{vehicleEvents.length}</strong> запис
                              {plural(vehicleEvents.length, "ь", "и", "ей")}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.emptySlot}
                      onClick={() => setOpen(true)}
                      aria-label="Добавить ещё автомобиль"
                      role="listitem"
                    >
                      <div className={styles.emptyIcon} aria-hidden="true">
                        <PlusIcon />
                      </div>
                      <div className={styles.emptyTitle}>Добавить автомобиль</div>
                    </button>
                  </>
                )
              ) : (
                <div className={styles.ghostLoad} aria-hidden="true" />
              )}
            </div>
          </section>

          <div className={styles.statusLine}>
            <span className={styles.statusDot} aria-hidden="true" />
            <strong>{hydrated ? vehicles.length : 0}</strong>
            &nbsp;{plural(vehicles.length, "автомобиль", "автомобиля", "автомобилей")}
            <span className={styles.sep}>·</span>
            данные хранятся только в этом браузере
          </div>
        </main>
        <VersionTag />
      </div>

      <AddCarDialog
        open={open}
        onClose={() => setOpen(false)}
        onSaved={(id) => router.push(`/car?id=${encodeURIComponent(id)}`)}
      />
    </>
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

function fuelLabel(fuel: string): string {
  switch (fuel) {
    case "gasoline": return "бензин";
    case "diesel": return "дизель";
    case "hybrid": return "гибрид";
    case "electric": return "электро";
    case "lpg": return "газ";
    default: return fuel;
  }
}
