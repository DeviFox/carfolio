"use client";

import {use, useEffect, useMemo, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import styles from "./page.module.css";
import shellStyles from "@/app/page.module.css";
import CarIllustration from "@/components/car-illustration";
import StatusPill from "@/components/status-pill";
import UpdateMileageDialog from "@/components/update-mileage-dialog";
import AddEventDialog from "@/components/add-event-dialog";
import AddCarDialog from "@/components/add-car-dialog";
import {
	ArrowRightIcon,
	CarIcon,
	GarageIcon,
	HistoryIcon,
	PlusIcon,
	SettingsIcon,
} from "@/components/icons";
import {useGarage} from "@/lib/store";
import {
	componentStatus,
	computeResource,
	findActiveInstalledPart,
	formatKm,
	formatRatioPercent,
	latestInspectionFor,
	sortComponentsByName,
	sortEventsByDateDesc,
} from "@/lib/compute";
import type {SystemCategory} from "@/lib/types";

export default function CarPageClient() {
	const searchParams = useSearchParams();
	const id           = searchParams.get("id") ?? "";

	const router                                = useRouter();
	const [hydrated, setHydrated]               = useState(false);
	const [mileageOpen, setMileageOpen]         = useState(false);
	// null — closed; systemId — open with a new component in that system.
	const [record, setRecord]                   = useState<{systemId?: string} | null>(null);
	const [editOpen, setEditOpen]               = useState(false);
	// Hovering a system card lights up its zone on the illustration — two-way dialog
	// between the list and the picture.
	const [hoveredSystem, setHoveredSystem] = useState<SystemCategory | null>(null);

	const vehicle        = useGarage((s) => s.vehicles.find((v) => v.id === id));
	const systems        = useGarage((s) => s.systems);
	const components     = useGarage((s) => s.components);
	const installedParts = useGarage((s) => s.installedParts);
	const inspections    = useGarage((s) => s.inspections);
	const events         = useGarage((s) => s.events);
	const setLastViewed  = useGarage((s) => s.setLastViewedVehicle);

	useEffect(() => {
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (vehicle) setLastViewed(vehicle.id);
	}, [vehicle, setLastViewed]);

	if (!hydrated) {
		return <div className={shellStyles.shell} aria-busy="true"/>;
	}

	if (!vehicle) {
		return (
			<div className={shellStyles.shell}>
				<main className={shellStyles.main}>
					<h1 className={shellStyles.h1}>Машина не найдена</h1>
					<p className={shellStyles.sub}>
						Возможно, запись удалена или адрес устарел.
					</p>
					<div style={{marginTop: 24}}>
						<button
							type="button"
							className={shellStyles.primaryBtn}
							onClick={() => router.push("/")}
						>
							← В гараж
						</button>
					</div>
				</main>
			</div>
		);
	}

	const vehicleSystems = systems
		.filter((s) => s.vehicleId === vehicle.id && !s.isArchived)
		.sort((a, b) => a.sortOrder - b.sortOrder);

	const vehicleEvents = sortEventsByDateDesc(
		events.filter((e) => e.vehicleId === vehicle.id),
	);

	const componentsBySystem = (sysId: string) =>
		sortComponentsByName(
			components.filter(
				(c) => c.vehicleId === vehicle.id && c.systemId === sysId && !c.isArchived,
			),
		);

	const systemStatus = (sysId: string): "ok" | "attention" | "critical" | "unknown" => {
		const list = componentsBySystem(sysId);
		if (list.length === 0) return "unknown";
		let worst: "ok" | "attention" | "critical" | "unknown" = "ok";
		const order                                            = {ok: 0, unknown: 1, attention: 2, critical: 3} as const;
		for (const c of list) {
			const part       = findActiveInstalledPart(c.id, installedParts);
			const inspection = latestInspectionFor(c.id, inspections);
			const resource   = computeResource(part, vehicle);
			const status     = componentStatus(resource, inspection);
			if (order[status.label] > order[worst]) worst = status.label;
		}
		return worst;
	};

	const systemStatusText: Record<string, string> = {
		ok:        "В норме",
		attention: "Требует внимания",
		critical:  "Критично",
		unknown:   "Нет данных",
	};

	const dueAttention = vehicleSystems.reduce((count, sys) => {
		const list = componentsBySystem(sys.id);
		return (
			count +
			list.filter((c) => {
				const part       = findActiveInstalledPart(c.id, installedParts);
				const inspection = latestInspectionFor(c.id, inspections);
				const st         = componentStatus(computeResource(part, vehicle), inspection);
				return st.label === "attention" || st.label === "critical";
			}).length
		);
	}, 0);

	const zoneStates: Partial<Record<string, "ok" | "attention" | "critical" | "unknown">> = {};
	for (const sys of vehicleSystems) {
		zoneStates[sys.category] = systemStatus(sys.id);
	}
	const availableZones = vehicleSystems.map((s) => s.category);

	function focusSystem(category: string) {
		const sys = vehicleSystems.find((s) => s.category === category);
		if (!sys) return;
		const el = document.getElementById(`system-${sys.id}`);
		el?.scrollIntoView({behavior: "smooth", block: "start"});
		el?.classList.add(styles.pulseHighlight);
		setTimeout(() => el?.classList.remove(styles.pulseHighlight), 1200);
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
						<span aria-hidden="true">←</span>
					</button>
					<div className={styles.topTitle}>{vehicle.name}</div>
					<button
						type="button"
						className={shellStyles.primaryBtn}
						onClick={() => setRecord({})}
						aria-label="Добавить запись"
					>
						<PlusIcon/>
					</button>
				</header>

				<aside className={shellStyles.rail} aria-label="Разделы приложения">
					<div className={shellStyles.brand}>
						<div className={shellStyles.brandMark} aria-hidden="true">c</div>
						<div className={shellStyles.brandName}>
							carfolio
							<span className={shellStyles.brandSub}>визуальный гараж</span>
						</div>
					</div>
					<nav>
						<ul className={shellStyles.navList}>
							<li
								className={`${shellStyles.navItem} ${shellStyles.active}`}
								aria-current="page"
								onClick={() => router.push("/")}
								role="link"
								tabIndex={0}
							>
								<GarageIcon/>
								Гараж
							</li>
							<li className={shellStyles.navItem}><CarIcon/>Автомобили</li>
							<li className={shellStyles.navItem}><HistoryIcon/>История</li>
							<li className={shellStyles.navItem}><SettingsIcon/>Настройки</li>
						</ul>
					</nav>
					<div className={shellStyles.navSpacer}/>
					<div className={shellStyles.railFoot}>v0.0.1 · бета</div>
				</aside>

				<main className={styles.main}>
					<button
						type="button"
						className={styles.breadcrumb}
						onClick={() => router.push("/")}
					>
						← Гараж
					</button>

					<header className={styles.heroHead}>
						<div>
							<h1 className={styles.carName}>
								{vehicle.name}
								<button
									type="button"
									className={styles.editBtn}
									onClick={() => setEditOpen(true)}
									aria-label="Изменить параметры машины"
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
							className={styles.primary}
							onClick={() => setRecord({})}
						>
							<PlusIcon/>
							Добавить запись
						</button>
					</header>

					{dueAttention > 0 ? (
						<div className={styles.alertBanner} role="status">
							<span className={styles.alertDot} aria-hidden="true"/>
							<strong>{dueAttention}</strong>
							&nbsp;{plural(dueAttention, "задача требует", "задачи требуют", "задач требуют")} внимания
						</div>
					) : null}

					<section className={styles.hero}>
						<div className={styles.illustration}>
							<CarIllustration
								bodyType={vehicle.bodyType}
								availableZones={availableZones as never}
								zoneStates={zoneStates as never}
								activeZone={hoveredSystem}
								onZoneClick={focusSystem}
							/>
						</div>
						<div className={styles.mileagePanel}>
							<div className={styles.mileageLabel}>Текущий пробег</div>
							<div className={`${styles.mileageValue} numeric mono`}>
								{vehicle.currentMileageKm.toLocaleString("ru-RU")}
								<span className={styles.mileageUnit}>{vehicle.units === "km" ? "км" : "миль"}</span>
							</div>
							<button
								type="button"
								className={styles.ghostAction}
								onClick={() => setMileageOpen(true)}
							>
								Обновить пробег
							</button>
						</div>
					</section>

					<section className={styles.systems} aria-label="Системы автомобиля">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle}>Системы</h2>
							{availableZones.includes("other") ? (
								<button
									type="button"
									className={`${styles.otherChip} ${hoveredSystem === "other" ? styles.otherChipHover : ""}`}
									onClick={() => focusSystem("other")}
									onMouseEnter={() => setHoveredSystem("other")}
									onMouseLeave={() =>
										setHoveredSystem((h) => (h === "other" ? null : h))
									}
									aria-label="Прочее — не привязано к зоне"
								>
									<svg width="16" height="4" viewBox="0 0 16 4" aria-hidden="true">
										<circle cx="2" cy="2" r="1.4"/>
										<circle cx="8" cy="2" r="1.4"/>
										<circle cx="14" cy="2" r="1.4"/>
									</svg>
									Прочее
								</button>
							) : null}
						</div>
						{vehicleSystems.length === 0 ? (
							<div className={styles.emptyNote}>У машины пока нет ни одной системы.</div>
						) : (
							<div className={styles.systemList}>
								{vehicleSystems.map((sys) => {
									const list     = componentsBySystem(sys.id);
									const sysLabel = systemStatus(sys.id);
									return (
										<article
											key={sys.id}
											id={`system-${sys.id}`}
											className={styles.systemCard}
											onMouseEnter={() => setHoveredSystem(sys.category)}
											onMouseLeave={() =>
												setHoveredSystem((h) => (h === sys.category ? null : h))
											}
										>
											<header className={styles.systemHead}>
												<div className={`${styles.systemIcon} ${styles[`si-${sysLabel}`]}`}>
													{systemIcon(sys.category)}
												</div>
												<div className={styles.systemTitleGroup}>
													<h3 className={styles.systemName}>{sys.name}</h3>
													<span className={styles.systemCount}>
                            {list.length === 0
	                            ? "нет компонентов"
	                            : `${list.length} ${plural(list.length, "компонент", "компонента", "компонентов")}`}
                          </span>
												</div>
												<StatusPill label={sysLabel} text={systemStatusText[sysLabel]} size="sm"/>
											</header>

											{list.length > 0 ? (
												<ul className={styles.compList}>
													{list.map((c) => {
														const part       = findActiveInstalledPart(c.id, installedParts);
														const inspection = latestInspectionFor(c.id, inspections);
														const resource   = computeResource(part, vehicle);
														const status     = componentStatus(resource, inspection);
														return (
															<li key={c.id} className={styles.compRow}>
																<div className={styles.compMain}>
																	<div className={styles.compName}>{c.name}</div>
																	<div className={styles.compMeta}>
																		{kindLabel(c.kind)}
																		{part?.installedAtMileageKm !== undefined ? (
																			<>
																				{" · установлено на "}
																				<span className="mono numeric">
                                          {formatKm(part.installedAtMileageKm, vehicle.units)}
                                        </span>
																			</>
																		) : null}
																		{part?.expectedLifeKm ? (
																			<>
																				{" · ресурс "}
																				<span className="mono numeric">
                                          {formatKm(part.expectedLifeKm, vehicle.units)}
                                        </span>
																			</>
																		) : null}
																	</div>
																	{resource.kind === "known" ? (
																		<div className={styles.resourceLine}>
																			<div className={styles.resourceBar} aria-hidden="true">
																				<div
																					className={`${styles.resourceFill} ${styles[`rf-${status.label}`]}`}
																					style={{width: `${Math.round(resource.ratio * 100)}%`}}
																				/>
																			</div>
																			<div className={styles.resourceText}>
                                        <span className="mono numeric">
                                          {formatRatioPercent(resource.ratio)}
                                        </span>
																				{resource.remainingKm !== undefined && resource.remainingKm > 0 ? (
																					<span className={styles.resourceSub}>
                                            {" · ещё "}
																						<span className="mono numeric">
                                              {formatKm(resource.remainingKm, vehicle.units)}
                                            </span>
                                          </span>
																				) : null}
																				{resource.overdue ? (
																					<span className={styles.resourceSub}>
                                            {" · просрочено"}
                                          </span>
																				) : null}
																			</div>
																		</div>
																	) : (
																		<div className={styles.resourceEmpty}>
																			Нет данных для расчёта ресурса
																		</div>
																	)}
																</div>
																<div className={styles.compRight}>
																	<StatusPill label={status.label} text={status.text} size="sm"/>
																</div>
															</li>
														);
													})}
												</ul>
											) : null}

											{list.length === 0 ? (
												<button
													type="button"
													className={styles.addComponentSlot}
													onClick={() => setRecord({systemId: sys.id})}
												>
													<PlusIcon/>
													<span>Добавить компонент</span>
												</button>
											) : (
												<button
													type="button"
													className={styles.addComponentLink}
													onClick={() => setRecord({systemId: sys.id})}
												>
													<PlusIcon/>
													<span>Добавить компонент</span>
												</button>
											)}
										</article>
									);
								})}
							</div>
						)}
					</section>

					{vehicleEvents.length > 0 ? (
						<section className={styles.timeline} aria-label="История обслуживания">
							<div className={styles.sectionHead}>
								<h2 className={styles.sectionTitle}>Недавние работы</h2>
								<span className={styles.sectionLink}>
                  всего: {vehicleEvents.length}
                </span>
							</div>
							<ul className={styles.eventList}>
								{vehicleEvents.slice(0, 5).map((e) => {
									const names = e.componentIds
										.map((id) => components.find((c) => c.id === id)?.name)
										.filter(Boolean)
										.join(", ");
									return (
										<li key={e.id} className={styles.eventRow}>
											<div className={styles.eventDate}>
												<div className={styles.eventDateDay}>
													{new Date(e.date).toLocaleDateString("ru-RU", {
														day:   "2-digit",
														month: "short",
													})}
												</div>
												<div className={styles.eventDateYear}>
													{new Date(e.date).getFullYear()}
												</div>
											</div>
											<div className={styles.eventMain}>
												<div className={styles.eventTitle}>
													{eventTypeLabel(e.type)}
													{names ? `: ${names}` : ""}
												</div>
												<div className={styles.eventMeta}>
													{e.mileageKm !== undefined ? (
														<span className="mono numeric">
                              {formatKm(e.mileageKm, vehicle.units)}
                            </span>
													) : null}
													{e.costMinorUnits !== undefined ? (
														<>
															{" · "}
															<span className="mono numeric">
                                {(e.costMinorUnits / 100).toLocaleString("ru-RU")} {e.currency ?? ""}
                              </span>
														</>
													) : null}
												</div>
												{e.notes ? (
													<div className={styles.eventNotes}>{e.notes}</div>
												) : null}
											</div>
										</li>
									);
								})}
							</ul>
						</section>
					) : null}
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
				/>
			) : null}
			<AddCarDialog
				open={editOpen}
				onClose={() => setEditOpen(false)}
				editVehicle={vehicle}
			/>
		</>
	);
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

function plural(n: number, one: string, few: string, many: string): string {
	const abs = Math.abs(n) % 100;
	const n1  = abs % 10;
	if (abs > 10 && abs < 20) return many;
	if (n1 > 1 && n1 < 5) return few;
	if (n1 === 1) return one;
	return many;
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

function kindLabel(kind: string): string {
	switch (kind) {
		case "consumable":
			return "расходник";
		case "replaceable":
			return "деталь";
		case "inspectable":
			return "осмотр";
		default:
			return kind;
	}
}

function eventTypeLabel(t: string): string {
	switch (t) {
		case "replacement":
			return "Замена";
		case "inspection":
			return "Осмотр";
		case "repair":
			return "Ремонт";
		case "fluid_service":
			return "Долив жидкости";
		case "observation":
			return "Заметка";
		default:
			return t;
	}
}

function systemIcon(category: string) {
	const common = {
		width:          20,
		height:         20,
		viewBox:        "0 0 24 24",
		fill:           "none",
		stroke:         "currentColor",
		strokeWidth:    1.75,
		strokeLinecap:  "round" as const,
		strokeLinejoin: "round" as const,
		"aria-hidden":  true,
	};
	switch (category) {
		case "engine":
			return (
				<svg {...common}>
					<rect x="4" y="8" width="16" height="10" rx="1.5"/>
					<path d="M8 8V5h8v3"/>
					<path d="M4 12h2M18 12h2"/>
					<path d="M9 14h6"/>
				</svg>
			);
		case "brakes":
			return (
				<svg {...common}>
					<circle cx="12" cy="12" r="8"/>
					<circle cx="12" cy="12" r="3"/>
					<path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>
				</svg>
			);
		case "tires":
			return (
				<svg {...common}>
					<circle cx="12" cy="12" r="8"/>
					<circle cx="12" cy="12" r="2"/>
					<path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>
				</svg>
			);
		case "suspension":
			return (
				<svg {...common}>
					<path d="M6 4v6l3 2v6M18 4v6l-3 2v6"/>
					<path d="M4 10h4M16 10h4"/>
				</svg>
			);
		case "transmission":
			return (
				<svg {...common}>
					<circle cx="12" cy="12" r="2"/>
					<path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>
					<path d="M6 6l2 2M18 18l-2-2M18 6l-2 2M6 18l2-2"/>
				</svg>
			);
		case "cooling":
			return (
				<svg {...common}>
					<path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/>
				</svg>
			);
		case "electrical":
			return (
				<svg {...common}>
					<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>
				</svg>
			);
		default:
			return (
				<svg {...common}>
					<circle cx="12" cy="12" r="8"/>
				</svg>
			);
	}
}
