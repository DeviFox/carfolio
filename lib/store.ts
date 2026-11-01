"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Component,
  ComponentInspection,
  GarageData,
  ID,
  InstalledPart,
  MaintenanceEvent,
  MileageEntry,
  SCHEMA_VERSION,
  FLUIDS,
  Vehicle,
  VehicleSystem,
  emptyGarage,
} from "./types";
import { findActiveInstalledPart, findComponentByName, formatKm } from "./compute";
import {
  type AddRecordInput,
  type AddRecordResult,
  type EventPatch,
  kindForNewComponent,
  retiredBy,
} from "./records";
import { moveLegacyStorage } from "./legacy-storage";

export type { AddRecordInput, AddRecordResult, EventPatch };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const now = () => new Date().toISOString();

type AddVehicleInput = Omit<Vehicle, "id" | "createdAt" | "updatedAt">;

type AddComponentInput = Omit<Component, "id" | "isArchived">;

type AddInstalledPartInput = Omit<InstalledPart, "id">;

type AddEventInput = Omit<MaintenanceEvent, "id">;


interface GarageState extends GarageData {
  addVehicle: (input: AddVehicleInput) => Vehicle;
  updateVehicle: (id: ID, patch: Partial<Vehicle>) => void;
  deleteVehicle: (id: ID) => void;
  setLastViewedVehicle: (id: ID | null) => void;

  addSystem: (
    input: Omit<VehicleSystem, "id" | "isArchived" | "sortOrder"> & {
      sortOrder?: number;
    },
  ) => VehicleSystem;
  archiveSystem: (id: ID) => void;

  addComponent: (input: AddComponentInput) => Component;
  updateComponent: (id: ID, patch: Partial<Component>) => void;
  archiveComponent: (id: ID) => void;

  addInstalledPart: (input: AddInstalledPartInput) => InstalledPart;

  updateInstalledPart: (
    id: ID,
    patch: Partial<Pick<InstalledPart, "expectedLifeKm" | "expectedLifeDays">>,
  ) => void;

  addEvent: (input: AddEventInput) => MaintenanceEvent;
  // Removes a record and undoes what it did: a replacement's part goes away and
  // the part it retired becomes active again; an inspection's result goes too.
  deleteEvent: (id: ID) => void;
  updateEvent: (id: ID, patch: EventPatch) => AddRecordResult;

  addRecord: (input: AddRecordInput) => AddRecordResult;

  updateMileage: (
    vehicleId: ID,
    mileageKm: number,
    source?: MileageEntry["source"],
    date?: string,
  ) => MileageEntry;

  reset: () => void;
}

export const useGarage = create<GarageState>()(
  persist(
    (set, get) => ({
      ...emptyGarage(),

      addVehicle: (input) => {
        const vehicle: Vehicle = {
          ...input,
          id: uid(),
          createdAt: now(),
          updatedAt: now(),
        };
        // No reading yet means no history entry: unknown is not zero.
        const mileageEntries: MileageEntry[] =
          vehicle.currentMileageKm !== undefined
            ? [{ id: uid(), vehicleId: vehicle.id, mileageKm: vehicle.currentMileageKm, date: now(), source: "owner" }]
            : [];
        set((s) => ({
          vehicles: [...s.vehicles, vehicle],
          mileageHistory: [...s.mileageHistory, ...mileageEntries],
          lastViewedVehicleId: vehicle.id,
        }));
        return vehicle;
      },

      updateVehicle: (id, patch) => {
        set((s) => ({
          vehicles: s.vehicles.map((v) =>
            v.id === id ? { ...v, ...patch, updatedAt: now() } : v,
          ),
        }));
      },

      deleteVehicle: (id) => {
        set((s) => {
          const keepVehicle = (x: { vehicleId?: ID } | { id: ID }) =>
            "vehicleId" in x ? x.vehicleId !== id : true;
          const sysIds = new Set(
            s.systems.filter((x) => x.vehicleId === id).map((x) => x.id),
          );
          const compIds = new Set(
            s.components.filter((x) => x.vehicleId === id).map((x) => x.id),
          );
          return {
            vehicles: s.vehicles.filter((v) => v.id !== id),
            systems: s.systems.filter(keepVehicle),
            components: s.components.filter(keepVehicle),
            installedParts: s.installedParts.filter(
              (p) => !compIds.has(p.componentId),
            ),
            events: s.events.filter(keepVehicle),
            mileageHistory: s.mileageHistory.filter(keepVehicle),
            inspections: s.inspections.filter(
              (i) => !compIds.has(i.componentId),
            ),
            reminders: s.reminders.filter(keepVehicle),
            lastViewedVehicleId:
              s.lastViewedVehicleId === id ? null : s.lastViewedVehicleId,
          };
        });
      },

      setLastViewedVehicle: (id) => set({ lastViewedVehicleId: id }),

      addSystem: (input) => {
        const sortOrder =
          input.sortOrder ??
          get().systems.filter((s) => s.vehicleId === input.vehicleId).length;
        const system: VehicleSystem = {
          ...input,
          id: uid(),
          isArchived: false,
          sortOrder,
        };
        set((s) => ({ systems: [...s.systems, system] }));
        return system;
      },

      archiveSystem: (id) => {
        set((s) => ({
          systems: s.systems.map((x) =>
            x.id === id ? { ...x, isArchived: true } : x,
          ),
        }));
      },

      addComponent: (input) => {
        const component: Component = {
          ...input,
          id: uid(),
          isArchived: false,
        };
        set((s) => ({ components: [...s.components, component] }));
        return component;
      },

      updateComponent: (id, patch) => {
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }));
      },

      archiveComponent: (id) => {
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, isArchived: true } : c,
          ),
        }));
      },

      addInstalledPart: (input) => {
        const part: InstalledPart = { ...input, id: uid() };
        set((s) => ({ installedParts: [...s.installedParts, part] }));
        return part;
      },


      updateInstalledPart: (id, patch) => {
        set((s) => ({
          installedParts: s.installedParts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
      },

      addEvent: (input) => {
        const event: MaintenanceEvent = { ...input, id: uid() };
        set((s) => ({ events: [...s.events, event] }));
        return event;
      },

      deleteEvent: (id) => {
        set((s) => {
          const event = s.events.find((e) => e.id === id);
          if (!event) return {};
          let installedParts = s.installedParts;
          const part = event.installedPartId
            ? s.installedParts.find((p) => p.id === event.installedPartId)
            : undefined;
          if (part) {
            installedParts = installedParts.filter((p) => p.id !== part.id);
            const wasActive = !part.removedAtDate && part.removedAtMileageKm === undefined;
            const previous = wasActive ? retiredBy(part, installedParts) : undefined;
            if (previous) {
              installedParts = installedParts.map((p) =>
                p.id === previous.id
                  ? { ...p, removedAtDate: undefined, removedAtMileageKm: undefined }
                  : p,
              );
            }
          }
          const inspections =
            event.type === "inspection"
              ? s.inspections.filter(
                  (i) =>
                    !(
                      event.componentIds.includes(i.componentId) &&
                      i.date === event.date &&
                      i.mileageKm === event.mileageKm
                    ),
                )
              : s.inspections;
          return {
            events: s.events.filter((e) => e.id !== id),
            installedParts,
            inspections,
          };
        });
      },

      updateEvent: (id, patch) => {
        const fail = (error: string): AddRecordResult => ({ ok: false, error });
        const st = get();
        const event = st.events.find((e) => e.id === id);
        if (!event) return fail("Запись не найдена.");
        const vehicle = st.vehicles.find((v) => v.id === event.vehicleId);
        if (!vehicle) return fail("Автомобиль не найден.");
        if (!patch.date) return fail("Укажите дату.");
        const mileage = patch.mileageKm;
        if (mileage !== undefined && (!Number.isFinite(mileage) || mileage < 0)) {
          return fail("Введите пробег цифрами.");
        }
        if (event.type !== "observation" && mileage === undefined) return fail("Укажите пробег.");
        if (mileage !== undefined && vehicle.currentMileageKm !== undefined && mileage > vehicle.currentMileageKm) {
          return fail(`Больше текущего пробега (${formatKm(vehicle.currentMileageKm, vehicle.units)}).`);
        }
        const notes = patch.notes?.trim() || undefined;
        if (event.type === "observation" && !notes) return fail("Напишите текст заметки.");

        const part = event.installedPartId
          ? st.installedParts.find((p) => p.id === event.installedPartId)
          : undefined;
        const previous = part ? retiredBy(part, st.installedParts) : undefined;
        if (
          previous?.installedAtMileageKm !== undefined &&
          mileage !== undefined &&
          mileage < previous.installedAtMileageKm
        ) {
          return fail(
            `Пробег меньше, чем при прошлой замене (${formatKm(previous.installedAtMileageKm, vehicle.units)}).`,
          );
        }

        const next: MaintenanceEvent = {
          ...event,
          date: patch.date,
          mileageKm: mileage,
          costMinorUnits: patch.costMinorUnits,
          currency: patch.costMinorUnits !== undefined ? patch.currency : undefined,
          notes,
        };
        // The record and the installation it created describe one moment; keep them in step.
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? next : e)),
          installedParts: s.installedParts.map((p) => {
            if (part && p.id === part.id) {
              return { ...p, installedAtDate: next.date, installedAtMileageKm: mileage, notes };
            }
            if (previous && p.id === previous.id) {
              return { ...p, removedAtDate: next.date, removedAtMileageKm: mileage };
            }
            return p;
          }),
          inspections:
            event.type === "inspection"
              ? s.inspections.map((i) =>
                  event.componentIds.includes(i.componentId) &&
                  i.date === event.date &&
                  i.mileageKm === event.mileageKm
                    ? { ...i, date: next.date, mileageKm: mileage, notes }
                    : i,
                )
              : s.inspections,
        }));
        return { ok: true, event: next };
      },

      addRecord: (input) => {
        const fail = (error: string): AddRecordResult => ({ ok: false, error });
        const st = get();
        const vehicle = st.vehicles.find((v) => v.id === input.vehicleId);
        if (!vehicle) return fail("Автомобиль не найден.");
        if (!input.date) return fail("Укажите дату.");
        const mileage = input.mileageKm;
        if (mileage !== undefined && (!Number.isFinite(mileage) || mileage < 0)) {
          return fail("Введите пробег цифрами.");
        }
        if (input.type !== "observation" && mileage === undefined) {
          return fail("Укажите пробег.");
        }
        const notes = input.notes?.trim() || undefined;
        if (input.type === "observation" && !notes) return fail("Напишите текст заметки.");

        let component: Component | undefined;
        let created: Component | undefined;
        if (input.newComponent) {
          if (input.type === "observation") {
            return fail("Заметка не создаёт компонент.");
          }
          const name = input.newComponent.name.trim();
          if (!name) return fail("Укажите название компонента.");
          const system = st.systems.find(
            (x) =>
              x.id === input.newComponent!.systemId &&
              x.vehicleId === vehicle.id &&
              !x.isArchived,
          );
          if (!system) return fail("Выберите систему автомобиля.");
          const vehicleComponents = st.components.filter((c) => c.vehicleId === vehicle.id);
          if (findComponentByName(vehicleComponents, name, system.id)) {
            return fail("Такой компонент уже есть в этой системе.");
          }
          const fluid = input.newComponent.fluid;
          if (fluid !== undefined) {
            if (!FLUIDS.some((f) => f.key === fluid)) return fail("Неизвестная жидкость.");
            if (vehicleComponents.some((c) => c.fluid === fluid && !c.isArchived)) {
              return fail("Эта жидкость уже есть у автомобиля.");
            }
          }
          created = {
            id: uid(),
            vehicleId: vehicle.id,
            systemId: system.id,
            name,
            kind: fluid ? "consumable" : kindForNewComponent(input.type, !!input.resource),
            ...(fluid ? { fluid } : {}),
            isArchived: false,
          };
          component = created;
        } else if (input.componentId) {
          component = st.components.find(
            (c) =>
              c.id === input.componentId && c.vehicleId === vehicle.id && !c.isArchived,
          );
          if (!component) return fail("Компонент не найден.");
        }
        if (input.type !== "observation" && !component) return fail("Выберите компонент.");

        let newPart: InstalledPart | undefined;
        let prevPart: InstalledPart | undefined;
        if (input.type === "replacement" && component) {
          prevPart = created ? undefined : findActiveInstalledPart(component.id, st.installedParts);
          if (
            prevPart?.installedAtMileageKm !== undefined &&
            mileage !== undefined &&
            mileage < prevPart.installedAtMileageKm
          ) {
            return fail(
              `Пробег меньше, чем при прошлой замене (${formatKm(prevPart.installedAtMileageKm, vehicle.units)}). Проверьте значение.`,
            );
          }
          newPart = {
            id: uid(),
            componentId: component.id,
            installedAtMileageKm: mileage,
            installedAtDate: input.date,
            expectedLifeKm: input.resource?.expectedLifeKm,
            expectedLifeDays: input.resource?.expectedLifeDays,
            notes,
          };
        }

        const event: MaintenanceEvent = {
          id: uid(),
          vehicleId: vehicle.id,
          type: input.type,
          date: input.date,
          mileageKm: mileage,
          componentIds: component ? [component.id] : [],
          installedPartId: newPart?.id,
          costMinorUnits: input.costMinorUnits,
          currency: input.costMinorUnits !== undefined ? input.currency : undefined,
          notes,
        };

        const inspection: ComponentInspection | undefined =
          input.type === "inspection" && input.condition && component
            ? {
                id: uid(),
                componentId: component.id,
                date: input.date,
                mileageKm: mileage,
                condition: input.condition,
                notes,
              }
            : undefined;

        // One set() so a record never lands half-written.
        set((s) => ({
          components: created ? [...s.components, created] : s.components,
          installedParts: newPart
            ? [
                ...s.installedParts.map((p) =>
                  p.id === prevPart?.id
                    ? { ...p, removedAtMileageKm: mileage, removedAtDate: input.date }
                    : p,
                ),
                newPart,
              ]
            : s.installedParts,
          events: [...s.events, event],
          inspections: inspection ? [...s.inspections, inspection] : s.inspections,
        }));
        return { ok: true, event };
      },

      updateMileage: (vehicleId, mileageKm, source = "owner", date) => {
        const entry: MileageEntry = {
          id: uid(),
          vehicleId,
          mileageKm,
          date: date ?? now(),
          source,
        };
        set((s) => ({
          mileageHistory: [...s.mileageHistory, entry],
          vehicles: s.vehicles.map((v) =>
            v.id === vehicleId
              ? { ...v, currentMileageKm: mileageKm, updatedAt: now() }
              : v,
          ),
        }));
        return entry;
      },

      reset: () => set(emptyGarage()),
    }),
    {
      name: "carvisio.garage.v1",
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => {
        moveLegacyStorage(localStorage);
        return localStorage;
      }),
      migrate: (persisted, from) => {
        if (from === SCHEMA_VERSION) return persisted as GarageData;
        return { ...emptyGarage(), ...(persisted as object) };
      },
    },
  ),
);

export function useHydrated(): boolean {
  if (typeof window === "undefined") return false;
  return (useGarage.persist?.hasHydrated?.() as boolean) ?? true;
}
