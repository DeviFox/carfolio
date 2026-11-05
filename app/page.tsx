"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import AddCarDialog from "@/components/add-car-dialog";
import AppBar, { VersionTag } from "@/components/app-bar";
import AccountControl from "@/components/account-control";
import AuthNotice from "@/components/auth-notice";
import IntroCard, { introDismissed } from "@/components/intro-card";
import { HelpIcon, PlusIcon } from "@/components/icons";
import { useGarage } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { useHydrated } from "@/lib/use-hydrated";
import { formatKm, vehicleHealth } from "@/lib/compute";
import StatusPill from "@/components/status-pill";
import { SYSTEM_STATUS_TEXT } from "@/components/system-list";

export default function Page() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  // The story about how carvisio works, until the owner dismisses it.
  const [showIntro, setShowIntro] = useState(false);
  // Opened by itself (not from "?"): on close, focus goes to the next step, adding a car.
  const introAuto = useRef(false);
  const addSlotRef = useRef<HTMLButtonElement>(null);

  const vehicles = useGarage((s) => s.vehicles);
  const components = useGarage((s) => s.components);
  const installedParts = useGarage((s) => s.installedParts);
  const inspections = useGarage((s) => s.inspections);
  const inAccount = useGarage((s) => s.ownerId !== null);
  const offline = useSync((s) => s.offline);
  const refused = useSync((s) => s.refused);

  useEffect(() => {
    // Opens by itself once, for someone arriving to an empty garage.
    const auto = !introDismissed() && useGarage.getState().vehicles.length === 0;
    introAuto.current = auto;
    // Mount-only read of browser state (localStorage, the URL), which the
    // static server render can't see; it can't be a useState initializer
    // without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowIntro(auto);
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


  return (
    <>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.topBrand}>
            <div className={styles.brandMark} aria-hidden="true">c</div>
            <div className={styles.brandName}>carvisio</div>
          </div>
          <div className={styles.topActions}>
            <button type="button" className={styles.toolBtn} onClick={() => setShowIntro(true)} aria-label="Как это работает">
              <HelpIcon />
            </button>
            <AccountControl compact />
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setOpen(true)}
              aria-label="Добавить автомобиль"
            >
              <PlusIcon />
              Добавить
            </button>
          </div>
        </header>
        <AppBar onHelp={() => setShowIntro(true)} />

        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.h1}>Мой гараж</h1>
              <AuthNotice />
            </div>
          </header>


          <section aria-labelledby="garage-grid-label">
            <h2 id="garage-grid-label" className="sr-only">
              Автомобили в гараже
            </h2>
            <div className={styles.grid}>
              {hydrated ? (
                vehicles.length === 0 ? (
                  <button
                    type="button"
                    ref={addSlotRef}
                    className={styles.emptySlot}
                    onClick={() => setOpen(true)}
                    aria-label="Добавить первый автомобиль"
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
                      const health = vehicleHealth(v, components, installedParts, inspections);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          className={styles.carCard}
                          onClick={() => router.push(`/car?id=${encodeURIComponent(v.id)}`)}
                        >
                          <div className={styles.carCardMain}>
                            <div className={styles.carName}>{v.name}</div>
                            <div className={styles.carMeta}>
                              {[v.year, v.fuelType && fuelLabel(v.fuelType), v.engine]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                            {v.currentMileageKm !== undefined ? (
                              <div className={`${styles.carMileage} numeric mono`}>{formatKm(v.currentMileageKm)}</div>
                            ) : (
                              <div className={styles.carMileageMissing}>Пробег не указан</div>
                            )}
                          </div>
                          {/* The car's state, not its bookkeeping: worst status, then what it is about. */}
                          <div className={styles.carCardFooter}>
                            <StatusPill label={health.label} text={SYSTEM_STATUS_TEXT[health.label]} size="sm" />
                            <span className={styles.carHealth}>
                              {health.flagged.length > 0
                                ? health.flagged.join(", ")
                                : health.known > 0
                                  ? `Отслеживается ${health.known} ${plural(health.known, "деталь", "детали", "деталей")}`
                                  : health.total > 0
                                    ? "Срок службы деталей не задан"
                                    : "Добавьте первую замену"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      ref={addSlotRef}
                      className={styles.emptySlot}
                      onClick={() => setOpen(true)}
                      aria-label="Добавить ещё автомобиль"
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
            {plural(vehicles.length, "автомобиль", "автомобиля", "автомобилей")}
            <span className={styles.sep}>·</span>
            <span className={styles.statusNote}>
              {!hydrated || !inAccount
                ? "Машины хранятся на этом устройстве. Войдите, чтобы получить доступ к гаражу на всех устройствах."
                : refused > 0
                  ? "Часть изменений не сохранена. Они останутся на этом устройстве, попробуем отправить снова при следующем открытии."
                  : offline
                  ? "Нет связи с сервером. Изменения сохранены локально и будут синхронизированы, когда связь появится."
                  : "Гараж синхронизирован."}
            </span>
          </div>
        </main>
        <VersionTag />
      </div>

      {showIntro ? (
        <IntroCard
          onClose={() => {
            setShowIntro(false);
            if (introAuto.current) requestAnimationFrame(() => addSlotRef.current?.focus());
            introAuto.current = false;
          }}
        />
      ) : null}

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
