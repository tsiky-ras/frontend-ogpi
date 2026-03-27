import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  BacklogLot,
  BacklogLine,
  BacklogLineProfil,
  BacklogDeliverable,
  BacklogSprint,
} from "../../../../types/lead/Backlog/Backlog.tsx";

import { BacklogDelivrableProjet } from "../../../../types/projet/backlog/BacklogProjet.tsx";

import { BacklogPlanningService, SprintTimeDTO } from "../../../../services/lead/backlog/BacklogPlanningService.tsx";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TimeUnit = "day" | "week";

interface PlanningTabProps {
  lots: BacklogLot[];
  lines: BacklogLine[];
  lineProfils: BacklogLineProfil[];
  deliverables: Map<number, BacklogDeliverable[]> | Map<number, BacklogDelivrableProjet[]>;
  selectedBacklogId: number | null;
  planningService: BacklogPlanningService;
  datedebutPlanning?: string | null;
  onPlanningUpdated?: () => void;
}

// Computed sprint for rendering
interface ComputedSprint {
  id: number;
  phaseId: number;
  lotId: number;
  name: string;
  order: number;
  fromDay: number;
  toDay: number;
  duration: number;
  isManual: boolean;
  deliverables: BacklogDeliverable[];
}

interface ComputedPhase {
  id: number;
  lotId: number;
  name: string;
  order: number;
  fromDay: number;
  toDay: number;
  sprints: ComputedSprint[];
}

interface ComputedLot {
  id: number;
  name: string;
  order: number;
  fromDay: number;
  toDay: number;
  phases: ComputedPhase[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DAYS_PER_WEEK = 5;
const ROW_H = 36;
const LABEL_W = 240;
const HDR_H = 72;
const HDR_ROW1 = 28;
const MIN_BAR = 4;
const HANDLE_W = 7;

const COL_PX: Record<TimeUnit, number> = { day: 36, week: 64 };

const COLOR = {
  lotBar: "#1e3a4a",
  lotBg: "#f0f6f9",
  phaseBar: "#0e7490",
  phaseBg: "#f0fbff",
  sprintBar: "#7c3aed",
  sprintAlt: "#5b21b6",
  sprintBg: "rgba(124,58,237,0.05)",
  sprintDrag: "#a855f7",
  delivLabel: "#6b7280",
  grid: "#dde8ed",
  gridMajor: "#b0c8d4",
  headerBg: "#1e3a4a",
  headerSub: "#163040",
  headerText: "#ffffff",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  today: "rgba(234,179,8,0.18)",
  todayLine: "#ca8a04",
};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
}

function isoToFromDay(iso: string, baseDate: Date): number {
  const d = new Date(iso);
  return Math.max(1, daysBetween(baseDate, d) + 1);
}

function isoToToDay(iso: string, baseDate: Date): number {
  const d = new Date(iso);
  return Math.max(1, daysBetween(baseDate, d) + 1);
}

// ─── AUTO BASE DATE DETECTION ─────────────────────────────────────────────────

function detectBaseDateFromLots(lots: BacklogLot[]): Date | null {
  let minDate: Date | null = null;
  for (const lot of lots) {
    for (const phase of (lot.phases ?? []) as any[]) {
      if (phase.dateDebut) {
        const d = new Date(phase.dateDebut);
        if (!isNaN(d.getTime()) && (!minDate || d < minDate)) minDate = d;
      }
      for (const sprint of (phase.sprints ?? []) as any[]) {
        if (sprint.dateDebut) {
          const d = new Date(sprint.dateDebut);
          if (!isNaN(d.getTime()) && (!minDate || d < minDate)) minDate = d;
        }
      }
    }
  }
  return minDate;
}

// ─── SPRINT DURATION CALCULATION ─────────────────────────────────────────────

function calcSprintDuration(
  sprintId: number,
  lines: BacklogLine[],
  lineProfils: BacklogLineProfil[]
): number {
  const sprintLineIds = new Set(
    lines.filter((l) => l.sprintId === sprintId).map((l) => l.id)
  );
  if (sprintLineIds.size === 0) return 1;

  const profilTotals = new Map<number, number>();
  for (const lp of lineProfils) {
    if (!sprintLineIds.has(lp.lineId)) continue;
    const pid = lp.profil.id;
    profilTotals.set(pid, (profilTotals.get(pid) ?? 0) + lp.volume);
  }

  if (profilTotals.size === 0) return 1;

  return Math.max(1, Math.ceil(Math.max(...profilTotals.values())));
}

// ─── PLANNING COMPUTATION ─────────────────────────────────────────────────────

function computePlanning(
  lots: BacklogLot[],
  lines: BacklogLine[],
  lineProfils: BacklogLineProfil[],
  deliverables: Map<number, BacklogDeliverable[]>,
  baseDate: Date | null
): ComputedLot[] {
  const sortedLots = [...lots].sort((a, b) => a.order - b.order);
  let cursor = 1;

  return sortedLots.map((lot) => {
    const sortedPhases = [...((lot.phases ?? []) as any[])].sort(
      (a, b) => a.order - b.order
    );

    const computedPhases: ComputedPhase[] = [];
    let phaseCursor = cursor;

    for (const phase of sortedPhases) {
      const sortedSprints = [...((phase.sprints ?? []) as any[])].sort(
        (a, b) => a.order - b.order
      );

      const computedSprints: ComputedSprint[] = [];
      let sprintCursor = phaseCursor;

      for (const sprint of sortedSprints) {
        let fromDay: number;
        let toDay: number;
        let isManual = false;

        if (baseDate && sprint.dateDebut && sprint.dateFin) {
          fromDay = isoToFromDay(sprint.dateDebut, baseDate);
          toDay   = isoToToDay(sprint.dateFin, baseDate);
          isManual = true;
        } else if (
          sprint.fromDay != null && sprint.fromDay > 0 &&
          sprint.toDay   != null && sprint.toDay   > 0
        ) {
          fromDay  = sprint.fromDay;
          toDay    = sprint.toDay;
          isManual = true;
        } else {
          const duration = calcSprintDuration(sprint.id, lines, lineProfils);
          fromDay = sprintCursor;
          toDay   = sprintCursor + duration - 1;
        }

        if (toDay >= sprintCursor) sprintCursor = toDay + 1;

        const sprintDelivs = ((deliverables as any).get(phase.id) ?? []).filter(
          (d: any) => d.sprintId === sprint.id
        );

        computedSprints.push({
          id: sprint.id,
          phaseId: phase.id,
          lotId: lot.id,
          name: sprint.name,
          order: sprint.order,
          fromDay,
          toDay,
          duration: toDay - fromDay + 1,
          isManual,
          deliverables: sprintDelivs,
        });
      }

      let phaseFrom: number;
      let phaseTo: number;

      if (baseDate && (phase as any).dateDebut && (phase as any).dateFin) {
        phaseFrom = isoToFromDay((phase as any).dateDebut, baseDate);
        phaseTo   = isoToToDay((phase as any).dateFin, baseDate);
      } else {
        const sprintFroms = computedSprints.map((s) => s.fromDay).filter(Number.isFinite);
        const sprintTos   = computedSprints.map((s) => s.toDay).filter(Number.isFinite);
        phaseFrom = sprintFroms.length > 0 ? Math.min(...sprintFroms) : phaseCursor;
        phaseTo   = sprintTos.length   > 0 ? Math.max(...sprintTos)   : phaseCursor;
      }

      computedPhases.push({
        id: phase.id,
        lotId: lot.id,
        name: phase.name,
        order: phase.order,
        fromDay: phaseFrom,
        toDay: phaseTo,
        sprints: computedSprints,
      });

      phaseCursor = Math.max(phaseCursor, sprintCursor);
    }

    let lotFrom: number;
    let lotTo: number;

    const lotAny = lot as any;
    if (baseDate && lotAny.dateDebut && lotAny.dateFin) {
      lotFrom = isoToFromDay(lotAny.dateDebut, baseDate);
      lotTo   = isoToToDay(lotAny.dateFin, baseDate);
    } else {
      const phaseFroms = computedPhases.map((p) => p.fromDay).filter(Number.isFinite);
      const phaseTos   = computedPhases.map((p) => p.toDay).filter(Number.isFinite);
      lotFrom = phaseFroms.length > 0 ? Math.min(...phaseFroms) : cursor;
      lotTo   = phaseTos.length   > 0 ? Math.max(...phaseTos)   : cursor;
    }

    cursor = phaseCursor;

    return {
      id: lot.id,
      name: lot.name,
      order: lot.order,
      fromDay: lotFrom,
      toDay: lotTo,
      phases: computedPhases,
    };
  });
}

// ─── BURNDOWN COMPUTATION ─────────────────────────────────────────────────────

interface BurndownPoint {
  day: number;          // 1-based
  date?: Date;          // si baseDate définie
  label: string;        // libellé axe X
  ideal: number;        // charge restante idéale (JH)
  remaining: number;    // charge restante réelle (complétée à chaque fin de sprint)
  sprintName?: string;  // sprint terminé à ce jour
}

/**
 * Calcule les points du burndown à partir des sprints calculés et des volumes JH.
 * - Charge totale = somme de toutes les JH du backlog (par profil, max par sprint)
 * - Idéal : décroît linéairement de totalJH à 0 sur la durée totale
 * - Réel  : décroit au fur et à mesure que les sprints se terminent
 */
function computeBurndown(
  computed: ComputedLot[],
  lines: BacklogLine[],
  lineProfils: BacklogLineProfil[],
  totalDays: number,
  baseDate: Date | null
): BurndownPoint[] {
  if (totalDays <= 0) return [];

  // Collecte tous les sprints avec leur charge JH et leur toDay
  const allSprints: { id: number; toDay: number; name: string; jhLoad: number }[] = [];

  for (const lot of computed) {
    for (const phase of lot.phases) {
      for (const sprint of phase.sprints) {
        // Charge JH du sprint = max parmi tous les profils du sprint
        const sprintLineIds = new Set(
          lines.filter((l) => l.sprintId === sprint.id).map((l) => l.id)
        );
        const profilTotals = new Map<number, number>();
        for (const lp of lineProfils) {
          if (!sprintLineIds.has(lp.lineId)) continue;
          profilTotals.set(lp.profil.id, (profilTotals.get(lp.profil.id) ?? 0) + lp.volume);
        }
        const jhLoad = profilTotals.size > 0
          ? Math.max(...profilTotals.values())
          : sprint.duration; // fallback: durée en jours

        allSprints.push({
          id: sprint.id,
          toDay: sprint.toDay,
          name: sprint.name,
          jhLoad,
        });
      }
    }
  }

  const totalJH = allSprints.reduce((s, sp) => s + sp.jhLoad, 0);
  if (totalJH === 0) return [];

  // Trier les sprints par toDay
  const sortedSprints = [...allSprints].sort((a, b) => a.toDay - b.toDay);

  // Construire les points burndown : un point par fin de sprint + point initial + point final
  const points: BurndownPoint[] = [];

  // Point initial (jour 0)
  points.push({
    day: 0,
    date: baseDate ?? undefined,
    label: baseDate ? fmtDateShort(baseDate) : "Début",
    ideal: totalJH,
    remaining: totalJH,
  });

  let jhDone = 0;
  for (const sprint of sortedSprints) {
    jhDone += sprint.jhLoad;
    const remaining = Math.max(0, totalJH - jhDone);
    const date = baseDate ? addDays(baseDate, sprint.toDay - 1) : undefined;
    points.push({
      day: sprint.toDay,
      date,
      label: baseDate ? fmtDateShort(date!) : `J${sprint.toDay}`,
      ideal: Math.max(0, totalJH - (totalJH * sprint.toDay) / totalDays),
      remaining,
      sprintName: sprint.name,
    });
  }

  // Point final (si le dernier sprint ne couvre pas totalDays)
  const lastPoint = points[points.length - 1];
  if (lastPoint.day < totalDays) {
    const date = baseDate ? addDays(baseDate, totalDays - 1) : undefined;
    points.push({
      day: totalDays,
      date,
      label: baseDate ? fmtDateShort(date!) : `J${totalDays}`,
      ideal: 0,
      remaining: lastPoint.remaining,
    });
  }

  return points;
}

// ─── BURNDOWN CHART COMPONENT ────────────────────────────────────────────────

interface BurndownChartProps {
  points: BurndownPoint[];
  totalJH: number;
  totalDays: number;
  baseDate: Date | null;
  unit: TimeUnit;
}

const BurndownChart: React.FC<BurndownChartProps> = ({
  points,
  totalJH,
  totalDays,
  baseDate,
  unit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || points.length < 2) return;

    // Lazy load Chart.js depuis CDN si nécessaire
    const initChart = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const labels = points.map((p) => p.label);
      const idealData = points.map((p) => Math.round(p.ideal * 10) / 10);
      const realData = points.map((p) => Math.round(p.remaining * 10) / 10);

      const Chart = (window as any).Chart;
      if (!Chart) return;

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Idéal",
              data: idealData,
              borderColor: "#0e7490",
              backgroundColor: "rgba(14,116,144,0.08)",
              borderWidth: 2,
              borderDash: [6, 3],
              pointRadius: 3,
              pointBackgroundColor: "#0e7490",
              fill: false,
              tension: 0,
            },
            {
              label: "Réel",
              data: realData,
              borderColor: "#7c3aed",
              backgroundColor: "rgba(124,58,237,0.10)",
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: "#7c3aed",
              fill: true,
              tension: 0.15,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items: any[]) => {
                  const idx = items[0]?.dataIndex;
                  const p = points[idx];
                  if (p?.sprintName) return `Fin de sprint : ${p.sprintName}`;
                  return items[0]?.label ?? "";
                },
                label: (item: any) => {
                  const suffix = " JH";
                  return ` ${item.dataset.label} : ${item.formattedValue}${suffix}`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                font: { size: 10, family: "'DM Sans','Segoe UI',system-ui,sans-serif" },
                color: "#64748b",
                maxRotation: 35,
                autoSkip: true,
                maxTicksLimit: 12,
              },
              grid: { color: "#dde8ed", lineWidth: 0.5 },
            },
            y: {
              min: 0,
              suggestedMax: Math.ceil(totalJH * 1.05),
              ticks: {
                font: { size: 10, family: "'DM Sans','Segoe UI',system-ui,sans-serif" },
                color: "#64748b",
                callback: (v: number) => `${v} JH`,
              },
              grid: { color: "#dde8ed", lineWidth: 0.5 },
              title: {
                display: true,
                text: "Charge restante (JH)",
                font: { size: 10, family: "'DM Sans','Segoe UI',system-ui,sans-serif" },
                color: "#94a3b8",
              },
            },
          },
        },
      });
    };

    // Si Chart.js déjà chargé
    if ((window as any).Chart) {
      initChart();
      return;
    }

    // Sinon charger le script
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = initChart;
    document.head.appendChild(script);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [points, totalJH]);

  if (points.length < 2) {
    return (
      <div className="text-center text-muted py-3" style={{ fontSize: "0.8rem" }}>
        Données insuffisantes pour le burndown (ajoutez des volumes JH).
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: 260 }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

// ─── RENDER ROWS ──────────────────────────────────────────────────────────────

type RowKind = "lot" | "phase" | "sprint" | "deliverable";

interface GRow {
  id: string;
  kind: RowKind;
  label: string;
  fromDay: number;
  toDay: number;
  sprintId?: number;
  phaseId?: number;
  lotId?: number;
  depth: number;
  color: string;
  bgColor: string;
  isDraggable: boolean;
  deliverables?: BacklogDeliverable[];
}

function buildRows(
  computed: ComputedLot[],
  collapsed: Set<string>,
  showDeliverables: boolean
): GRow[] {
  const rows: GRow[] = [];

  for (const lot of computed) {
    const lotId = `lot-${lot.id}`;
    rows.push({
      id: lotId,
      kind: "lot",
      label: lot.name,
      fromDay: lot.fromDay,
      toDay: lot.toDay,
      lotId: lot.id,
      depth: 0,
      color: COLOR.lotBar,
      bgColor: COLOR.lotBg,
      isDraggable: false,
    });

    if (collapsed.has(lotId)) continue;

    for (const phase of lot.phases) {
      const phaseId = `phase-${phase.id}`;
      rows.push({
        id: phaseId,
        kind: "phase",
        label: phase.name,
        fromDay: phase.fromDay,
        toDay: phase.toDay,
        phaseId: phase.id,
        lotId: lot.id,
        depth: 1,
        color: COLOR.phaseBar,
        bgColor: COLOR.phaseBg,
        isDraggable: false,
      });

      if (collapsed.has(phaseId)) continue;

      for (const sprint of phase.sprints) {
        const sprintRowId = `sprint-${sprint.id}`;
        rows.push({
          id: sprintRowId,
          kind: "sprint",
          label: sprint.name,
          fromDay: sprint.fromDay,
          toDay: sprint.toDay,
          sprintId: sprint.id,
          phaseId: phase.id,
          lotId: lot.id,
          depth: 2,
          color: COLOR.sprintBar,
          bgColor: COLOR.sprintBg,
          isDraggable: true,
          deliverables: sprint.deliverables,
        });

        if (showDeliverables && sprint.deliverables && sprint.deliverables.length > 0) {
          for (const deliv of sprint.deliverables) {
            rows.push({
              id: `deliv-${deliv.id}`,
              kind: "deliverable",
              label: deliv.name,
              fromDay: sprint.toDay,
              toDay: sprint.toDay,
              sprintId: sprint.id,
              phaseId: phase.id,
              lotId: lot.id,
              depth: 3,
              color: COLOR.delivLabel,
              bgColor: "#ffffff",
              isDraggable: false,
            });
          }
        }
      }
    }
  }

  return rows;
}

// ─── PIXEL HELPERS ────────────────────────────────────────────────────────────

function dayToX(day: number, unit: TimeUnit, colW: number): number {
  if (!isFinite(day) || day == null) return 0;
  if (unit === "day") return (day - 1) * colW;
  return ((day - 1) / DAYS_PER_WEEK) * colW;
}

function durationToW(days: number, unit: TimeUnit, colW: number): number {
  if (!isFinite(days) || days <= 0) return MIN_BAR;
  if (unit === "day") return Math.max(MIN_BAR, days * colW);
  return Math.max(MIN_BAR, (days / DAYS_PER_WEEK) * colW);
}

// ─── LEGEND DOT ───────────────────────────────────────────────────────────────

const LDot: React.FC<{ color: string; label: string; square?: boolean; dashed?: boolean }> = ({
  color,
  label,
  square,
  dashed,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    {dashed ? (
      <svg width={18} height={10} style={{ flexShrink: 0 }}>
        <line x1={0} y1={5} x2={18} y2={5}
          stroke={color} strokeWidth={2}
          strokeDasharray="5,3" />
      </svg>
    ) : (
      <div
        style={{
          width: 10,
          height: 10,
          background: color,
          borderRadius: square ? 2 : 5,
          border: "1px solid rgba(0,0,0,0.12)",
          flexShrink: 0,
        }}
      />
    )}
    <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{label}</span>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const PlanningTab: React.FC<PlanningTabProps> = ({
  lots,
  lines,
  lineProfils,
  deliverables,
  selectedBacklogId,
  planningService,
  datedebutPlanning,
  onPlanningUpdated,
}) => {
  const [unit, setUnit] = useState<TimeUnit>("week");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDeliverables, setShowDeliverables] = useState(true);
  const [showBurndown, setShowBurndown] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [startDateInput, setStartDateInput] = useState<string>(
    datedebutPlanning ?? ""
  );
  const [editingDate, setEditingDate] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  const [dragState, setDragState] = useState<{
    sprintId: number;
    type: "move" | "resizeR";
    startX: number;
    origFrom: number;
    origTo: number;
  } | null>(null);

  const [liveOverrides, setLiveOverrides] = useState<
    Map<number, { fromDay: number; toDay: number }>
  >(new Map());

  const [pendingOverrides, setPendingOverrides] = useState<
    Map<number, { fromDay: number; toDay: number }>
  >(new Map());

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const colW = COL_PX[unit];

  const autoBaseDate = useMemo(() => detectBaseDateFromLots(lots), [lots]);

  const baseDate = useMemo<Date | null>(() => {
    const explicit = startDateInput || datedebutPlanning;
    if (explicit) {
      const parsed = new Date(explicit);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return autoBaseDate;
  }, [startDateInput, datedebutPlanning, autoBaseDate]);

  useEffect(() => {
    if (!startDateInput && !datedebutPlanning && autoBaseDate) {
      const iso = autoBaseDate.toISOString().slice(0, 10);
      setStartDateInput(iso);
    }
  }, [autoBaseDate]);

  useEffect(() => {
    if (datedebutPlanning) setStartDateInput(datedebutPlanning);
  }, [datedebutPlanning]);

  useEffect(() => {
    const hEl = headerScrollRef.current;
    const bEl = bodyScrollRef.current;
    if (!hEl || !bEl) return;
    const onBody = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      hEl.scrollLeft = bEl.scrollLeft;
      isSyncingScroll.current = false;
    };
    const onHeader = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      bEl.scrollLeft = hEl.scrollLeft;
      isSyncingScroll.current = false;
    };
    bEl.addEventListener("scroll", onBody);
    hEl.addEventListener("scroll", onHeader);
    return () => {
      bEl.removeEventListener("scroll", onBody);
      hEl.removeEventListener("scroll", onHeader);
    };
  }, []);

  const lotsWithPending = useMemo<BacklogLot[]>(() => {
    if (pendingOverrides.size === 0) return lots;
    return lots.map((lot) => ({
      ...lot,
      phases: ((lot.phases ?? []) as any[]).map((phase: any) => ({
        ...phase,
        sprints: (phase.sprints ?? []).map((sprint: any) => {
          const ov = pendingOverrides.get(sprint.id);
          if (ov) return { ...sprint, fromDay: ov.fromDay, toDay: ov.toDay };
          return sprint;
        }),
      })),
    }));
  }, [lots, pendingOverrides]);

  const computedBase = useMemo(
    () => computePlanning(lotsWithPending, lines, lineProfils, deliverables as any, baseDate),
    [lotsWithPending, lines, lineProfils, deliverables, baseDate]
  );

  const computed = useMemo<ComputedLot[]>(() => {
    if (liveOverrides.size === 0) return computedBase;
    return computedBase.map((lot) => {
      const patchedPhases = lot.phases.map((phase) => {
        const patchedSprints = phase.sprints.map((sprint) => {
          const ov = liveOverrides.get(sprint.id);
          if (!ov) return sprint;
          return {
            ...sprint,
            fromDay: ov.fromDay,
            toDay: ov.toDay,
            duration: ov.toDay - ov.fromDay + 1,
            isManual: true,
          };
        });
        const froms = patchedSprints.map((s) => s.fromDay).filter(isFinite);
        const tos   = patchedSprints.map((s) => s.toDay).filter(isFinite);
        return {
          ...phase,
          fromDay: froms.length > 0 ? Math.min(...froms) : phase.fromDay,
          toDay:   tos.length   > 0 ? Math.max(...tos)   : phase.toDay,
          sprints: patchedSprints,
        };
      });
      const lFroms = patchedPhases.map((p) => p.fromDay).filter(isFinite);
      const lTos   = patchedPhases.map((p) => p.toDay).filter(isFinite);
      return {
        ...lot,
        fromDay: lFroms.length > 0 ? Math.min(...lFroms) : lot.fromDay,
        toDay:   lTos.length   > 0 ? Math.max(...lTos)   : lot.toDay,
        phases: patchedPhases,
      };
    });
  }, [computedBase, liveOverrides]);

  const rows = useMemo(
    () => buildRows(computed, collapsed, showDeliverables),
    [computed, collapsed, showDeliverables]
  );

  const totalDays = useMemo(() => {
    if (computed.length === 0) return 1;
    const vals = computed.map((l) => l.toDay).filter(Number.isFinite);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [computed]);

  const nCols = useMemo(() => {
    if (unit === "day") return totalDays + 4;
    return Math.ceil(totalDays / DAYS_PER_WEEK) + 3;
  }, [totalDays, unit]);

  const scrollW = nCols * colW;
  const svgBodyH = Math.max(1, rows.length) * ROW_H;

  // ── Burndown data — synchronisé avec computed ──────────────────────────────
  const burndownPoints = useMemo(
    () => computeBurndown(computed, lines, lineProfils, totalDays, baseDate),
    [computed, lines, lineProfils, totalDays, baseDate]
  );

  const totalJH = useMemo(
    () => burndownPoints.length > 0 ? burndownPoints[0].remaining : 0,
    [burndownPoints]
  );

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const startDrag = useCallback(
    (
      e: React.MouseEvent,
      sprintId: number,
      type: "move" | "resizeR",
      fromDay: number,
      toDay: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDragState({ sprintId, type, startX: e.clientX, origFrom: fromDay, origTo: toDay });
    },
    []
  );

  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: MouseEvent) => {
      const dPx = e.clientX - dragState.startX;
      const pxPerDay = unit === "day" ? colW : colW / DAYS_PER_WEEK;
      const dDays = Math.round(dPx / pxPerDay);
      const duration = dragState.origTo - dragState.origFrom + 1;

      let newFrom: number;
      let newTo: number;

      if (dragState.type === "move") {
        newFrom = Math.max(1, dragState.origFrom + dDays);
        newTo   = newFrom + duration - 1;
      } else {
        newFrom = dragState.origFrom;
        newTo   = Math.max(dragState.origFrom, dragState.origTo + dDays);
      }

      setLiveOverrides((prev) => {
        const n = new Map(prev);
        n.set(dragState.sprintId, { fromDay: newFrom, toDay: newTo });
        return n;
      });
    };

    const onUp = () => {
      setLiveOverrides((prev) => {
        const ov = prev.get(dragState.sprintId);
        if (ov) {
          setPendingOverrides((p) => {
            const n = new Map(p);
            n.set(dragState.sprintId, ov);
            return n;
          });
        }
        const n = new Map(prev);
        n.delete(dragState.sprintId);
        return n;
      });
      setDragState(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, colW, unit]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (pendingOverrides.size === 0) return;
    setSaving(true);
    setSaveErr(null);
    setSaveOk(false);

    try {
      const sprintPayloads: SprintTimeDTO[] = [];

      for (const [sprintId, ov] of pendingOverrides.entries()) {
        const payload: SprintTimeDTO = {
          id: sprintId,
          fromDay: ov.fromDay,
          toDay: ov.toDay,
        };
        if (baseDate) {
          payload.dateDebut = addDays(baseDate, ov.fromDay - 1).toISOString().slice(0, 10);
          payload.dateFin   = addDays(baseDate, ov.toDay - 1).toISOString().slice(0, 10);
        }
        sprintPayloads.push(payload);
      }

      await planningService.updateSprintTimes(sprintPayloads);

      setPendingOverrides(new Map());
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
      onPlanningUpdated?.();
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStartDate = async () => {
    if (!selectedBacklogId || !startDateInput) return;
    setSavingDate(true);
    try {
      await planningService.updateStartDate(selectedBacklogId, startDateInput);
      setEditingDate(false);
      onPlanningUpdated?.();
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur date de début.");
    } finally {
      setSavingDate(false);
    }
  };

  const handleCancelPending = () => {
    setPendingOverrides(new Map());
    setLiveOverrides(new Map());
  };

  // ── Header SVG ─────────────────────────────────────────────────────────────
  const renderHeaderSVG = () => {
    const el: React.ReactNode[] = [];

    if (unit === "day") {
      const nWeeks = Math.ceil(nCols / DAYS_PER_WEEK);
      for (let w = 0; w < nWeeks; w++) {
        const wx = w * DAYS_PER_WEEK * colW;
        const ww = Math.min(DAYS_PER_WEEK, nCols - w * DAYS_PER_WEEK) * colW;
        el.push(
          <rect key={`wbg-${w}`} x={wx} y={0} width={ww} height={HDR_ROW1}
            fill={w % 2 === 0 ? COLOR.headerBg : COLOR.headerSub} />,
          <text key={`wlbl-${w}`} x={wx + ww / 2} y={HDR_ROW1 / 2 + 4}
            textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700} fontFamily="inherit">
            {baseDate ? `Sem. ${fmtDateShort(addDays(baseDate, w * DAYS_PER_WEEK))}` : `Sem. ${w + 1}`}
          </text>
        );
      }
      for (let d = 0; d < nCols; d++) {
        const dx = d * colW;
        const label = baseDate ? fmtDateShort(addDays(baseDate, d)) : `J${d + 1}`;
        el.push(
          <rect key={`dbg-${d}`} x={dx} y={HDR_ROW1} width={colW} height={HDR_H - HDR_ROW1}
            fill={d % 2 === 0 ? "#f0f6f9" : "#e4eff5"} stroke={COLOR.grid} strokeWidth={0.5} />,
          <text key={`dlbl-${d}`} x={dx + colW / 2} y={HDR_ROW1 + 14 + (HDR_H - HDR_ROW1) / 2 - 6}
            textAnchor="middle" fill="#1e3a4a" fontSize={8} fontFamily="inherit" fontWeight={600}>
            {label}
          </text>
        );
      }
    } else {
      const nMonths = Math.ceil(nCols / 4);
      for (let m = 0; m < nMonths; m++) {
        const mx = m * 4 * colW;
        const mw = Math.min(4, nCols - m * 4) * colW;
        el.push(
          <rect key={`mbg-${m}`} x={mx} y={0} width={mw} height={HDR_ROW1}
            fill={m % 2 === 0 ? COLOR.headerBg : COLOR.headerSub} />,
          <text key={`mlbl-${m}`} x={mx + mw / 2} y={HDR_ROW1 / 2 + 4}
            textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700} fontFamily="inherit">
            {baseDate
              ? addDays(baseDate, m * 4 * DAYS_PER_WEEK).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
              : `Mois ${m + 1}`}
          </text>
        );
      }
      for (let w = 0; w < nCols; w++) {
        const wx = w * colW;
        const label = baseDate
          ? `S. ${fmtDateShort(addDays(baseDate, w * DAYS_PER_WEEK))}`
          : `S${w + 1}`;
        el.push(
          <rect key={`wbg2-${w}`} x={wx} y={HDR_ROW1} width={colW} height={HDR_H - HDR_ROW1}
            fill={w % 2 === 0 ? "#f0f6f9" : "#e4eff5"} stroke={COLOR.grid} strokeWidth={0.5} />,
          <text key={`wlbl2-${w}`} x={wx + colW / 2} y={HDR_ROW1 + (HDR_H - HDR_ROW1) / 2 + 4}
            textAnchor="middle" fill="#1e3a4a" fontSize={baseDate ? 7 : 9} fontFamily="inherit" fontWeight={600}>
            {label}
          </text>
        );
      }
    }

    el.push(
      <line key="hbottom" x1={0} y1={HDR_H} x2={scrollW} y2={HDR_H}
        stroke={COLOR.gridMajor} strokeWidth={1.5} />
    );
    return el;
  };

  // ── Body SVG ───────────────────────────────────────────────────────────────
  const renderBodySVG = () => {
    const el: React.ReactNode[] = [];

    for (let i = 0; i <= nCols; i++) {
      const x = i * colW;
      const isMajor = unit === "day" ? i % DAYS_PER_WEEK === 0 : true;
      el.push(
        <line key={`vg-${i}`} x1={x} y1={0} x2={x} y2={svgBodyH}
          stroke={isMajor ? COLOR.gridMajor : COLOR.grid}
          strokeWidth={isMajor ? 1 : 0.5} />
      );
    }

    rows.forEach((_, ri) => {
      el.push(
        <line key={`hg-${ri}`} x1={0} y1={ri * ROW_H} x2={scrollW} y2={ri * ROW_H}
          stroke={COLOR.grid} strokeWidth={0.5} />
      );
    });

    rows.forEach((row, ri) => {
      const y = ri * ROW_H;
      const cy = y + ROW_H / 2;

      if (row.kind === "deliverable") {
        el.push(
          <rect key={`delbg-${row.id}`} x={0} y={y} width={scrollW} height={ROW_H}
            fill="#fafafa" style={{ pointerEvents: "none" }} />
        );
        return;
      }

      const bx = dayToX(row.fromDay, unit, colW);
      const bw = durationToW(row.toDay - row.fromDay + 1, unit, colW);
      const isPending = row.kind === "sprint" && row.sprintId !== undefined &&
        pendingOverrides.has(row.sprintId!);
      const isSel = selectedId === row.id;

      const bgFill = isSel
        ? "rgba(124,58,237,0.08)"
        : row.kind === "lot" ? COLOR.lotBg
        : row.kind === "phase" ? COLOR.phaseBg
        : COLOR.sprintBg;

      el.push(
        <rect key={`rbg-${row.id}`} x={0} y={y} width={scrollW} height={ROW_H}
          fill={bgFill} style={{ cursor: "pointer" }}
          onClick={() => setSelectedId(isSel ? null : row.id)} />
      );

      if (row.kind === "lot") {
        el.push(
          <rect key={`lot-${row.id}`} x={bx} y={cy - 3} width={bw} height={6}
            rx={3} fill={COLOR.lotBar} opacity={0.75} />,
          <rect key={`lot-tick-l-${row.id}`} x={bx} y={cy - 8} width={2} height={16} fill={COLOR.lotBar} opacity={0.6} />,
          <rect key={`lot-tick-r-${row.id}`} x={bx + bw - 2} y={cy - 8} width={2} height={16} fill={COLOR.lotBar} opacity={0.6} />
        );
        return;
      }

      if (row.kind === "phase") {
        const bH = ROW_H * 0.55;
        const bY = cy - bH / 2;
        el.push(
          <rect key={`phase-${row.id}`} x={bx} y={bY} width={bw} height={bH}
            rx={3} fill={COLOR.phaseBar} opacity={0.7} />,
          bw > 50
            ? <text key={`phase-lbl-${row.id}`} x={bx + bw / 2} y={cy + 3}
                textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700} fontFamily="inherit"
                style={{ pointerEvents: "none" }}>
                {baseDate
                  ? `${fmtDateShort(addDays(baseDate, row.fromDay - 1))} → ${fmtDateShort(addDays(baseDate, row.toDay - 1))}`
                  : `J${row.fromDay}→J${row.toDay}`}
              </text>
            : null
        );
        return;
      }

      if (row.kind === "sprint") {
        const bH = ROW_H * 0.62;
        const bY = cy - bH / 2;
        const isBeingDragged = dragState?.sprintId === row.sprintId;
        const barColor = isBeingDragged ? COLOR.sprintDrag
          : isPending ? COLOR.sprintAlt
          : COLOR.sprintBar;

        el.push(
          <g key={`sprint-${row.id}`}>
            {isSel && (
              <rect x={bx - 2} y={bY - 2} width={bw + 4} height={bH + 4}
                rx={4} fill="rgba(124,58,237,0.2)" />
            )}
            <rect x={bx} y={bY} width={bw} height={bH} rx={3}
              fill={barColor} opacity={isBeingDragged ? 0.85 : 1}
              style={{ cursor: "grab" }}
              onMouseDown={(e) => startDrag(e, row.sprintId!, "move", row.fromDay, row.toDay)}
            />
            {isPending && (
              <rect x={bx} y={bY} width={bw} height={bH} rx={3}
                fill="url(#pendingStripe)" style={{ pointerEvents: "none" }} />
            )}
            {bw > HANDLE_W * 2 + 6 && (
              <rect x={bx + bw - HANDLE_W} y={bY} width={HANDLE_W} height={bH}
                rx={2} fill="rgba(0,0,0,0.18)" style={{ cursor: "ew-resize" }}
                onMouseDown={(e) => startDrag(e, row.sprintId!, "resizeR", row.fromDay, row.toDay)}
              />
            )}
            {bw > 54 && (
              <text x={bx + bw / 2} y={cy + 3}
                textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700}
                fontFamily="inherit" style={{ pointerEvents: "none" }}>
                {row.label}
                {baseDate && ` · ${fmtDateShort(addDays(baseDate, row.toDay - 1))}`}
              </text>
            )}
          </g>
        );
      }
    });

    return el;
  };

  // ── Labels column ──────────────────────────────────────────────────────────
  const renderLabelsSVG = () => {
    const el: React.ReactNode[] = [];

    rows.forEach((row, ri) => {
      const y = ri * ROW_H;
      const isSel = selectedId === row.id;
      const isPending = row.kind === "sprint" && row.sprintId !== undefined &&
        pendingOverrides.has(row.sprintId!);

      const bgFill =
        row.kind === "deliverable" ? "#fafafa"
        : isSel ? "rgba(124,58,237,0.08)"
        : row.kind === "lot" ? COLOR.lotBg
        : row.kind === "phase" ? COLOR.phaseBg
        : COLOR.sprintBg;

      el.push(
        <foreignObject key={`lbl-${row.id}`} x={0} y={y} width={LABEL_W} height={ROW_H}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              height: ROW_H,
              display: "flex",
              alignItems: "center",
              paddingLeft: 8 + row.depth * 10,
              paddingRight: 6,
              gap: 5,
              overflow: "hidden",
              boxSizing: "border-box",
              background: bgFill,
              cursor: row.kind === "lot" || row.kind === "phase" ? "pointer" : "default",
              borderBottom: `1px solid ${COLOR.grid}`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (row.kind === "lot" || row.kind === "phase") {
                setCollapsed((prev) => {
                  const n = new Set(prev);
                  n.has(row.id) ? n.delete(row.id) : n.add(row.id);
                  return n;
                });
              } else {
                setSelectedId(isSel ? null : row.id);
              }
            }}
          >
            {(row.kind === "lot" || row.kind === "phase") && (
              <span style={{ fontSize: 9, color: "#64748b", flexShrink: 0, width: 10 }}>
                {collapsed.has(row.id) ? "▸" : "▾"}
              </span>
            )}
            {row.kind === "deliverable" && (
              <span style={{ fontSize: 8, color: COLOR.delivLabel, flexShrink: 0 }}>•</span>
            )}
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: row.color, flexShrink: 0,
                opacity: row.kind === "deliverable" ? 0.5 : 1,
              }}
            />
            <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
              <div
                style={{
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontSize:
                    row.kind === "lot" ? 11.5
                    : row.kind === "phase" ? 10.5
                    : row.kind === "sprint" ? 9.5 : 8.5,
                  fontWeight:
                    row.kind === "lot" ? 700
                    : row.kind === "phase" ? 600
                    : row.kind === "sprint" ? 600 : 400,
                  fontStyle: row.kind === "deliverable" ? "italic" : "normal",
                  color:
                    row.kind === "lot" ? COLOR.lotBar
                    : row.kind === "phase" ? COLOR.phaseBar
                    : row.kind === "sprint" ? COLOR.sprintBar
                    : COLOR.delivLabel,
                  lineHeight: 1.2,
                }}
                title={row.label}
              >
                {row.label}
              </div>
              {row.kind === "sprint" && baseDate && (
                <div style={{ fontSize: 7, color: "#94a3b8", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                  {fmtDate(addDays(baseDate, row.fromDay - 1))} → {fmtDate(addDays(baseDate, row.toDay - 1))}
                </div>
              )}
              {row.kind === "sprint" && !baseDate && (
                <div style={{ fontSize: 7, color: "#94a3b8", lineHeight: 1.1 }}>
                  J{row.fromDay} → J{row.toDay} ({row.toDay - row.fromDay + 1}j)
                </div>
              )}
            </div>
            {isPending && (
              <span title="Non sauvegardé" style={{ fontSize: 7, color: COLOR.sprintBar, flexShrink: 0 }}>●</span>
            )}
            {row.kind === "sprint" && (
              <span style={{ fontSize: 7.5, color: "#94a3b8", flexShrink: 0 }}>
                {row.toDay - row.fromDay + 1}j
              </span>
            )}
          </div>
        </foreignObject>
      );
    });

    return el;
  };

  const selRow = selectedId ? rows.find((r) => r.id === selectedId) : null;

  if (!selectedBacklogId) {
    return (
      <div className="text-center text-muted py-5">
        Veuillez sélectionner un backlog pour voir le planning prévisionnel.
      </div>
    );
  }

  const hasPending = pendingOverrides.size > 0;
  const totalWeeks = Math.ceil(totalDays / DAYS_PER_WEEK);

  const dateSource: "manual" | "prop" | "auto" | null =
    startDateInput && startDateInput !== datedebutPlanning ? "manual"
    : datedebutPlanning ? "prop"
    : autoBaseDate ? "auto"
    : null;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>

      {/* ── Métriques ─────────────────────────────────────────────────────── */}
      <div
        className="d-flex align-items-center gap-3 flex-wrap px-3 py-2 mb-2 rounded"
        style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", fontSize: "0.82rem" }}
      >
        <strong style={{ color: COLOR.lotBar }}>
          {computed.length} lot{computed.length > 1 ? "s" : ""}
          {" · "}
          {computed.reduce((s, l) => s + l.phases.length, 0)} phases
          {" · "}
          {computed.reduce((s, l) => s + l.phases.reduce((ps, p) => ps + p.sprints.length, 0), 0)} sprints
        </strong>
        <span className="text-muted">|</span>
        <span>
          Durée totale : <strong>{totalDays}j ({totalWeeks} sem.)</strong>
        </span>
        {totalJH > 0 && (
          <>
            <span className="text-muted">|</span>
            <span>
              Charge totale : <strong>{Math.round(totalJH)} JH</strong>
            </span>
          </>
        )}
        {baseDate && (
          <>
            <span className="text-muted">|</span>
            <span>
              <strong>{fmtDate(baseDate)}</strong>
              {totalDays > 0 && <> {" → "} <strong>{fmtDate(addDays(baseDate, totalDays - 1))}</strong></>}
            </span>
          </>
        )}
        {hasPending && (
          <>
            <span className="text-muted">|</span>
            <span style={{ color: COLOR.sprintBar, fontWeight: 700 }}>
              {pendingOverrides.size} sprint{pendingOverrides.size > 1 ? "s" : ""} modifié{pendingOverrides.size > 1 ? "s" : ""}
            </span>
          </>
        )}
        <small className="ms-auto text-muted">
          Glisser pour déplacer · bord droit pour redimensionner
        </small>
      </div>

      {/* ── Date de début planning ──────────────────────────────────────────── */}
      <div
        className="d-flex align-items-center gap-3 px-3 py-2 mb-2 rounded"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
      >
        <span style={{ color: "#475569", fontWeight: 600 }}>Date de début :</span>
        {editingDate ? (
          <>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: 160, fontSize: "0.8rem" }}
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />
            <button
              className="btn btn-sm btn-success"
              style={{ fontSize: "0.75rem" }}
              onClick={handleSaveStartDate}
              disabled={savingDate || !startDateInput}
            >
              {savingDate ? "…" : "✓ Confirmer"}
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              style={{ fontSize: "0.75rem" }}
              onClick={() => {
                setEditingDate(false);
                setStartDateInput(datedebutPlanning ?? autoBaseDate?.toISOString().slice(0, 10) ?? "");
              }}
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <span style={{ color: baseDate ? COLOR.lotBar : "#94a3b8", fontWeight: 600 }}>
              {baseDate ? fmtDate(baseDate) : "Non définie"}
            </span>
            {dateSource === "auto" && (
              <span
                title="Date détectée automatiquement depuis le premier sprint"
                style={{
                  fontSize: "0.65rem", padding: "1px 6px",
                  background: "#fef3c7", color: "#92400e",
                  border: "1px solid #fcd34d", borderRadius: 8,
                }}
              >
                auto-détectée
              </span>
            )}
            {dateSource === "prop" && (
              <span
                style={{
                  fontSize: "0.65rem", padding: "1px 6px",
                  background: "#ecfdf5", color: "#065f46",
                  border: "1px solid #6ee7b7", borderRadius: 8,
                }}
              >
                définie sur le backlog
              </span>
            )}
            <button
              className="btn btn-sm btn-outline-secondary"
              style={{ fontSize: "0.72rem" }}
              onClick={() => setEditingDate(true)}
            >
              ✎ Modifier
            </button>
          </>
        )}
      </div>

      {saveOk && (
        <div className="alert alert-success py-2 mb-2 small">✓ Planning sauvegardé avec succès.</div>
      )}
      {saveErr && (
        <div className="alert alert-danger py-2 mb-2 small">✗ {saveErr}</div>
      )}

      {/* ── Card principale Gantt ────────────────────────────────────────────── */}
      <div
        className="card shadow-sm mb-3"
        style={{ border: hasPending ? `2px solid ${COLOR.sprintBar}` : "1px solid #dee2e6" }}
      >
        {/* Card header */}
        <div
          className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: COLOR.lotBar, padding: "10px 16px" }}
        >
          <div>
            <h5 className="mb-0" style={{ color: "#fff", fontSize: "1rem" }}>
              Planning Prévisionnel
            </h5>
            {baseDate && totalDays > 0 && (
              <small style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem" }}>
                {fmtDate(baseDate)} → {fmtDate(addDays(baseDate, totalDays - 1))} · {totalDays}j / {totalWeeks} sem.
              </small>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {(["day", "week"] as TimeUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`btn ${unit === u ? "btn-light" : "btn-outline-light"}`}
                  style={{ fontSize: "0.72rem", fontWeight: unit === u ? 700 : 400, padding: "3px 10px" }}
                  onClick={() => setUnit(u)}
                >
                  {u === "day" ? "Jours" : "Semaines"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`btn btn-sm ${showDeliverables ? "btn-light" : "btn-outline-light"}`}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
              onClick={() => setShowDeliverables((v) => !v)}
            >
              Livrables
            </button>
            {hasPending && (
              <>
                <button
                  className="btn btn-sm btn-outline-light"
                  style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                  onClick={handleCancelPending}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-sm btn-light"
                  style={{ fontSize: "0.72rem", fontWeight: 700, color: COLOR.sprintBar, padding: "3px 12px" }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />
                      …
                    </>
                  ) : (
                    `✓ Valider (${pendingOverrides.size} modif.)`
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Légende */}
        <div
          className="d-flex gap-3 flex-wrap align-items-center px-3 py-2"
          style={{ background: "#f8fafc", borderBottom: "1px solid #dee2e6", fontSize: "0.74rem" }}
        >
          <LDot color={COLOR.lotBar} label="Lot" />
          <LDot color={COLOR.phaseBar} label="Phase" />
          <LDot color={COLOR.sprintBar} label="Sprint (déplaçable)" />
          <LDot color={COLOR.sprintAlt} label="Sprint modifié" />
          {showDeliverables && <LDot color={COLOR.delivLabel} label="Livrable" square />}
          {hasPending && (
            <span className="ms-auto" style={{ color: COLOR.sprintBar, fontWeight: 700 }}>
              ⚠ {pendingOverrides.size} modif. non sauvegardée{pendingOverrides.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Gantt layout ──────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div className="text-center text-muted py-5">
            Aucun sprint. Ajoutez des lots, phases et sprints dans l'onglet Backlog.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 580, position: "relative" }}>
            {/* Header row */}
            <div style={{ display: "flex", flexShrink: 0, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
              <div
                style={{
                  width: LABEL_W, flexShrink: 0, height: HDR_H,
                  background: COLOR.headerBg,
                  display: "flex", flexDirection: "column", justifyContent: "center",
                  padding: "0 12px", borderRight: `1.5px solid ${COLOR.gridMajor}`,
                }}
              >
                <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>Lot / Phase / Sprint</div>
                {baseDate && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7.5, marginTop: 3 }}>
                    Début : {fmtDate(baseDate)}{dateSource === "auto" && " (auto)"}
                  </div>
                )}
                {!baseDate && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7.5, marginTop: 3 }}>
                    Mode relatif (J / S)
                  </div>
                )}
              </div>
              <div ref={headerScrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
                <svg width={scrollW} height={HDR_H} style={{ display: "block" }}>
                  {renderHeaderSVG()}
                </svg>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Fixed labels */}
              <div
                style={{ width: LABEL_W, flexShrink: 0, overflowY: "auto", overflowX: "hidden", borderRight: `1.5px solid ${COLOR.gridMajor}` }}
                onScroll={(e) => {
                  if (bodyScrollRef.current)
                    bodyScrollRef.current.scrollTop = (e.target as HTMLElement).scrollTop;
                }}
              >
                <svg width={LABEL_W} height={svgBodyH} style={{ display: "block", userSelect: "none" }}>
                  <defs>
                    <pattern id="pendingStripe" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
                      <line x1={0} y1={0} x2={0} y2={8} stroke="rgba(255,255,255,0.22)" strokeWidth={4} />
                    </pattern>
                  </defs>
                  {renderLabelsSVG()}
                </svg>
              </div>

              {/* Scrollable bars */}
              <div
                ref={bodyScrollRef}
                style={{ flex: 1, overflowX: "auto", overflowY: "auto", maxHeight: 500, cursor: dragState ? "grabbing" : "default" }}
              >
                <svg width={scrollW} height={svgBodyH} style={{ display: "block", userSelect: "none" }}>
                  <defs>
                    <pattern id="pendingStripe" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
                      <line x1={0} y1={0} x2={0} y2={8} stroke="rgba(255,255,255,0.22)" strokeWidth={4} />
                    </pattern>
                  </defs>
                  <rect width={scrollW} height={svgBodyH} fill="#f8fbfc" />
                  {renderBodySVG()}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ── Détail sélection ──────────────────────────────────────────────── */}
        {selRow && selRow.kind === "sprint" && (
          <div style={{ borderTop: `2px solid ${COLOR.sprintBar}`, background: "#f5f3ff" }}>
            <div className="d-flex align-items-center gap-3 flex-wrap px-3 py-2" style={{ fontSize: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR.sprintBar }} />
                <strong style={{ color: COLOR.sprintBar }}>{selRow.label}</strong>
              </div>
              <span>
                Durée : <strong>{selRow.toDay - selRow.fromDay + 1} jours</strong>
                {" "}({((selRow.toDay - selRow.fromDay + 1) / DAYS_PER_WEEK).toFixed(1)} sem.)
              </span>
              {baseDate ? (
                <span style={{ color: COLOR.lotBar }}>
                  <strong>{fmtDate(addDays(baseDate, selRow.fromDay - 1))}</strong>
                  {" → "}
                  <strong>{fmtDate(addDays(baseDate, selRow.toDay - 1))}</strong>
                </span>
              ) : (
                <span style={{ color: "#64748b" }}>J{selRow.fromDay} → J{selRow.toDay}</span>
              )}
              {pendingOverrides.has(selRow.sprintId!) && (
                <span style={{ color: COLOR.sprintBar, fontSize: "0.75rem" }}>⚠ Modifié — en attente de sauvegarde</span>
              )}
              {pendingOverrides.has(selRow.sprintId!) && (
                <button
                  className="btn btn-link btn-sm p-0 ms-auto text-muted"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => {
                    setPendingOverrides((prev) => {
                      const n = new Map(prev);
                      n.delete(selRow.sprintId!);
                      return n;
                    });
                  }}
                >
                  ↺ Réinitialiser
                </button>
              )}
            </div>
            {selRow.deliverables && selRow.deliverables.length > 0 && (
              <div className="px-3 pb-2" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                <strong>Livrables :</strong> {selRow.deliverables.map((d) => d.name).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
</div>
  );
};

export default PlanningTab;