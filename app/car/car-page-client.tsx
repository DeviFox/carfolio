"use client";

import {useEffect, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import styles from "./page.module.css";
import shellStyles from "@/app/page.module.css";
import CarIllustration from "@/components/car-illustration";
import AppRail from "@/components/app-rail";
import AttentionList from "@/components/attention-list";
import ComponentPanel from "@/components/component-panel";
import EventDialog from "@/components/event-dialog";
import RecentWork from "@/components/recent-work";
import SystemList, {type ComponentRow, type SystemGroup} from "@/components/system-list";
import UpdateMileageDialog from "@/components/update-mileage-dialog";
import AddEventDialog from "@/components/add-event-dialog";
import AddCarDialog from "@/components/add-car-dialog";
import {
	ArrowLeftIcon,
	PlusIcon,
	SettingsIcon,
} from "@/components/icons";
import {useGarage} from "@/lib/store";
import {
	componentStatus,
	computeResource,
	formatAgo,
	findActiveInstalledPart,
	latestInspectionFor,
	rollupStatus,
	sortComponentsByName,
	sortEventsByDateDesc,
	type StatusLabel,
} from "@/lib/compute";
import type {MaintenanceType, SystemCategory} from "@/lib/types";

export default function CarPageClient() {
	const searchParams = useSearchParams();
	const id           = searchParams.get("id") ?? "";

	const router                        = useRouter();
	const [hydrated, setHydrated]       = useState(false);
	const [mileageOpen, setMileageOpen] = useState(false);
	// null — closed; systemId — open with a new component in that system.
	const [record, setRecord]           = useState<{
		systemId?: string;
		componentId?: string;
		type?: MaintenanceType;
	} | null>(null);
	const [openComponentId, setOpenComponentId] = useState<string | null>(null);
	const [editEventId, setEditEventId]         = useState<string | null>(null);
	const [editOpen, setEditOpen]       = useState(false);
	// Set while a delete navigates away, so the page doesn't flash "не найден".
	const [leaving, setLeaving]         = useState(false);
	// Hovering or focusing a system row lights up its zone on the sticky car.
	const [hoveredSystem, setHoveredSystem] = useState<SystemCategory | null>(null);
	const [expanded, setExpanded]           = useState<Set<string>>(() => new Set());
	const [flashId, setFlashId]             = useState<string | null>(null);

	const vehicle        = useGarage((s) => s.vehicles.find((v) => v.id === id));
	const systems        = useGarage((s) => s.systems);
	const components     = useGarage((s) => s.components);
	const installedParts = useGarage((s) => s.installedParts);
	const inspections    = useGarage((s) => s.inspections);
	const events         = useGarage((s) => s.events);
	const mileageHistory = useGarage((s) => s.mileageHistory);
	const setLastViewed  = useGarage((s) => s.setLastViewedVehicle);
	const deleteVehicle  = useGarage((s) => s.deleteVehicle);
	const vehicleId      = vehicle?.id;

	useEffect(() => {
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (vehicleId) setLastViewed(vehicleId);
	}, [vehicleId, setLastViewed]);

	// Open systems are a per-viewer convenience, remembered per car.
	useEffect(() => {
		if (!vehicleId) return;
		try {
			const raw = localStorage.getItem(openKey(vehicleId));
			setExpanded(new Set(raw ? (JSON.parse(raw) as string[]) : []));
		} catch {
			setExpanded(new Set());
		}
	}, [vehicleId]);

	if (!hydrated || leaving) {
		return <div className={shellStyles.shell} aria-busy="true"/>;
	}

	if (!vehicle) {
		return (
			<div className={shellStyles.shell}>
				<main className={shellStyles.main}>
					<h1 className={shellStyles.h1}>Автомобиль не найден</h1>
					<p className={shellStyles.sub}>
						Возможно, запись удалена или адрес устарел.
					</p>
					<div style={{marginTop: 24}}>
						<button
							type="button"
							className={shellStyles.primaryBtn}
							onClick={() => router.push("/")}
						>
							<ArrowLeftIcon/>
							В гараж
						</button>
					</div>
				</main>
			</div>
		);
	}

	const vehicleSystems = systems
		.filter((s) => s.vehicleId === vehicle.id && !s.isArchived)
		.sort((a, b) => a.sortOrder - b.sortOrder);

	// Latest reading; the car's own creation counts as the first one.
	const mileageAt = mileageHistory
		.filter((m) => m.vehicleId === vehicle.id)
		.reduce<string>((latest, m) => (m.date > latest ? m.date : latest), vehicle.createdAt);
	const mileageStale = Date.now() - new Date(mileageAt).getTime() > 30 * 24 * 60 * 60 * 1000;

	const vehicleEvents = sortEventsByDateDesc(
		events.filter((e) => e.vehicleId === vehicle.id),
	);

	const groups: SystemGroup[] = vehicleSystems.map((system) => {
		const rows = sortComponentsByName(
			components.filter(
				(c) => c.vehicleId === vehicle.id && c.systemId === system.id && !c.isArchived,
			),
		).map((component): ComponentRow => {
			const part     = findActiveInstalledPart(component.id, installedParts);
			const resource = computeResource(part, vehicle);
			const status   = componentStatus(resource, latestInspectionFor(component.id, inspections));
			return {component, system, part, resource, status};
		});
		return {system, rows, label: rollupStatus(rows.map((r) => r.status.label))};
	});

	const severity  = {critical: 0, attention: 1, ok: 2, unknown: 3} as const;
	const attention = groups
		.flatMap((g) => g.rows)
		.filter((r) => r.status.label === "attention" || r.status.label === "critical")
		.sort(
			(a, b) =>
				severity[a.status.label] - severity[b.status.label] ||
				ratioOf(a) - ratioOf(b),
		);
	const hasComponents = groups.some((g) => g.rows.length > 0);
	const flagged       = groups
		.filter((g) => g.label === "critical" || g.label === "attention")
		.sort((a, b) => severity[a.label] - severity[b.label]);
	const editEvent     = vehicleEvents.find((e) => e.id === editEventId);
	const openRow       = groups.flatMap((g) => g.rows).find((r) => r.component.id === openComponentId);

	const zoneStates: Partial<Record<string, StatusLabel>> = {};
	for (const g of groups) zoneStates[g.system.category] = g.label;
	const availableZones = vehicleSystems.map((s) => s.category);

	function persistOpen(next: Set<string>) {
		try {
			localStorage.setItem(openKey(vehicle!.id), JSON.stringify([...next]));
		} catch {
			// Storage can be unavailable; the open state just won't survive a reload.
		}
	}

	function toggleSystem(systemId: string) {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(systemId)) next.delete(systemId);
			else next.add(systemId);
			persistOpen(next);
			return next;
		});
	}

	// Opens the system, scrolls to the target row and marks it briefly.
	function reveal(systemId: string, componentId?: string) {
		setExpanded((prev) => {
			if (prev.has(systemId)) return prev;
			const next = new Set(prev).add(systemId);
			persistOpen(next);
			return next;
		});
		const target = componentId ?? systemId;
		setFlashId(target);
		requestAnimationFrame(() => {
			const el     = document.getElementById(componentId ? `component-${componentId}` : `system-${systemId}`);
			const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			el?.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: componentId ? "center" : "start"});
		});
		window.setTimeout(() => setFlashId((f) => (f === target ? null : f)), 1400);
	}

	function focusSystem(category: string) {
		const sys = vehicleSystems.find((s) => s.category === category);
		if (sys) reveal(sys.id);
	}

	return (
		<>
			<div className={shellStyles.shell}>
				<header className={shellStyles.topBar}>
					<button
						type="button"
						className={styles.backBtn}
						onClick={() => router.push("/")}
						aria-label="В гараж"
					>
						<ArrowLeftIcon/>
					</button>
					<button
						type="button"
						className={shellStyles.primaryBtn}
						onClick={() => setRecord({})}
						aria-label="Добавить запись"
					>
						<PlusIcon/>
					</button>
				</header>

				<AppRail onHome={() => router.push("/")}/>

				<main className={styles.main}>
					<header className={styles.heroHead}>
						<div>
							<h1 className={styles.carName}>
								{vehicle.name}
								<button
									type="button"
									className={styles.editBtn}
									onClick={() => setEditOpen(true)}
									aria-label="Изменить параметры автомобиля"
									title="Изменить параметры"
								>
									<SettingsIcon/>
								</button>
							</h1>
							<p className={styles.carMeta}>
								{[
									vehicle.year,
									fuelLabel(vehicle.fuelType),
									vehicle.engine,
									bodyTypeLabel(vehicle.bodyType),
								]
									.filter(Boolean)
									.join(" · ") || "—"}
							</p>
						</div>
						<button
							type="button"
							className={`${shellStyles.primaryBtn} ${styles.headCta}`}
							onClick={() => setRecord({})}
						>
							<PlusIcon/>
							Добавить запись
						</button>
					</header>

					<div className={styles.layout}>
						<aside className={styles.stage} aria-label="Состояние автомобиля">
							<div className={styles.carCol}>
								<div className={styles.illustration}>
									<CarIllustration
										bodyType={vehicle.bodyType}
										availableZones={availableZones as never}
										zoneStates={zoneStates as never}
										activeZone={hoveredSystem}
										onZoneClick={focusSystem}
									/>
								</div>
								{flagged.length > 0 ? (
									// Names the dots on the car, and carries "Прочее", which has no zone.
									<ul className={styles.zoneChips} aria-label="Системы, требующие внимания">
										{flagged.map((g) => (
											<li key={g.system.id}>
												<button
													type="button"
													className={styles.zoneChip}
													onClick={() => focusSystem(g.system.category)}
													onMouseEnter={() => setHoveredSystem(g.system.category)}
													onMouseLeave={() => setHoveredSystem(null)}
													onFocus={() => setHoveredSystem(g.system.category)}
													onBlur={() => setHoveredSystem(null)}
												>
													<span className={`${styles.zoneDot} ${styles[`zd-${g.label}`]}`} aria-hidden="true"/>
													{g.system.name}
												</button>
											</li>
										))}
									</ul>
								) : null}
							</div>
							<div className={styles.stageSide}>
								<div className={styles.mileage}>
									<div>
										<div className={styles.mileageLabel}>Текущий пробег</div>
										<div className={`${styles.mileageValue} numeric mono`}>
											{digitGroups(vehicle.currentMileageKm)}
											<span className={styles.mileageUnit}>{vehicle.units === "km" ? "км" : "миль"}</span>
										</div>
										{mileageAt ? (
											// Every forecast is measured from this number, so say how fresh it is.
											<div className={`${styles.mileageAge} ${mileageStale ? styles.mileageStale : ""}`}>
												Обновлён {formatAgo(mileageAt)}
											</div>
										) : null}
									</div>
									<button
										type="button"
										className={styles.ghostAction}
										onClick={() => setMileageOpen(true)}
									>
										Обновить пробег
									</button>
								</div>
								{hasComponents ? (
									<AttentionList
										rows={attention}
										units={vehicle.units}
										onSelect={(row) => reveal(row.system.id, row.component.id)}
									/>
								) : null}
							</div>
						</aside>

						<div className={styles.ledger}>
							<section className={styles.systems} aria-label="Системы автомобиля">
								{groups.length === 0 ? (
									<div className={styles.emptyNote}>У автомобиля нет систем.</div>
								) : (
									<SystemList
										groups={groups}
										units={vehicle.units}
										expanded={expanded}
										flashId={flashId}
										onToggle={toggleSystem}
										onHover={setHoveredSystem}
										onAddComponent={(systemId) => setRecord({systemId})}
										onOpenComponent={setOpenComponentId}
									/>
								)}
							</section>

							<RecentWork
								events={vehicleEvents}
								components={components}
								units={vehicle.units}
								onOpen={(e) => setEditEventId(e.id)}
							/>
						</div>
					</div>
				</main>
			</div>

			<UpdateMileageDialog
				open={mileageOpen}
				onClose={() => setMileageOpen(false)}
				vehicle={vehicle}
			/>
			{record ? (
				<AddEventDialog
					open
					onClose={() => setRecord(null)}
					vehicle={vehicle}
					defaultSystemId={record.systemId}
					defaultComponentId={record.componentId}
					defaultType={record.type}
				/>
			) : null}
			{editEvent ? (
				<EventDialog event={editEvent} vehicle={vehicle} onClose={() => setEditEventId(null)}/>
			) : null}
			{openRow && !record && !editEvent ? (
				<ComponentPanel
					row={openRow}
					vehicle={vehicle}
					events={vehicleEvents}
					inspection={latestInspectionFor(openRow.component.id, inspections)}
					onClose={() => setOpenComponentId(null)}
					onAddRecord={(type) => setRecord({componentId: openRow.component.id, type})}
					onOpenEvent={(e) => setEditEventId(e.id)}
				/>
			) : null}
			<AddCarDialog
				open={editOpen}
				onClose={() => setEditOpen(false)}
				editVehicle={vehicle}
				onDelete={() => {
					setLeaving(true);
					setEditOpen(false);
					deleteVehicle(vehicle.id);
					router.replace("/");
				}}
			/>
		</>
	);
}

// Display-size mono makes the locale's no-break space read as a word gap;
// render digit groups with a narrow optical gap instead.
function digitGroups(n: number) {
	return n
		.toLocaleString("ru-RU")
		.split(/\s/)
		.map((group, i) => (
			<span key={i} className={i > 0 ? styles.digitGroup : undefined}>{group}</span>
		));
}

const openKey = (vehicleId: string) => `carfolio.car.${vehicleId}.open`;

function ratioOf(row: ComponentRow): number {
	return row.resource.kind === "known" ? row.resource.ratio : 1;
}

function bodyTypeLabel(bt?: string): string | null {
	if (!bt) return null;
	const map: Record<string, string> = {
		sedan:     "седан",
		hatchback: "хэтчбек",
		wagon:     "универсал",
		coupe:     "купе",
		crossover: "кроссовер",
		suv:       "внедорожник",
		pickup:    "пикап",
		minivan:   "минивэн",
		van:       "фургон",
		other:     "авто",
	};
	return map[bt] ?? bt;
}

function fuelLabel(fuel?: string): string | null {
	if (!fuel) return null;
	switch (fuel) {
		case "gasoline":
			return "бензин";
		case "diesel":
			return "дизель";
		case "hybrid":
			return "гибрид";
		case "electric":
			return "электро";
		case "lpg":
			return "газ";
		default:
			return fuel;
	}
}

