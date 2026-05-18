import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { AxiosInstance } from "axios";
import {
  BacklogLot,
  BacklogLine,
  BacklogLineProfil,
  BacklogDeliverable,
  BacklogSprint,
} from "../../../../types/lead/Backlog/Backlog.tsx";

import { BacklogDelivrableProjet } from "../../../../types/projet/backlog/BacklogProjet.tsx";

import { BacklogPlanningService, SprintTimeDTO, PhaseTimeDTO, LotTimeDTO } from "../../../../services/lead/backlog/BacklogPlanningService.tsx";
import { JoursFeriesService } from "../../../../services/projet/calendrier/JoursFeriesService.tsx";
import { JourFerie } from "../../../../types/projet/calendrier/JourFerie.tsx";

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
  api: AxiosInstance;
}

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
const LABEL_W = 260;
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
  holiday: "rgba(150,150,150,0.18)",
  holidayHeader: "#9ca3af",
  holidayStroke: "#d1d5db",
};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
}

function fmtDateShort(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function addCalendarDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── JOURS FERIES ENGINE ──────────────────────────────────────────────────────

function buildHolidaySet(joursFeries: JourFerie[], years: number[]): Set<string> {
  const set = new Set<string>();
  for (const jf of joursFeries) {
    if (!jf.actif) continue;
    if (jf.type === "FIXE" && jf.mois && jf.jour) {
      for (const y of years) {
        set.add(`${y}-${String(jf.mois).padStart(2, "0")}-${String(jf.jour).padStart(2, "0")}`);
      }
    } else if (jf.type === "VARIABLE" && jf.dateExacte) {
      set.add(jf.dateExacte.slice(0, 10));
    }
  }
  return set;
}

function workingDayToDate(index: number, baseDate: Date, holidaySet: Set<string>): Date {
  let count = 0;
  let cur = new Date(baseDate);
  let safety = 0;
  while (safety < 3650) {
    if (!holidaySet.has(toISO(cur))) {
      count++;
      if (count === index) return new Date(cur);
    }
    cur = addCalendarDays(cur, 1);
    safety++;
  }
  return cur;
}

function dateToWorkingDayIndex(baseDate: Date, targetDate: Date, holidaySet: Set<string>): number {
  let count = 0;
  let cur = new Date(baseDate);
  const endMs = new Date(targetDate).setHours(23, 59, 59, 999);
  while (cur.getTime() <= endMs) {
    if (!holidaySet.has(toISO(cur))) count++;
    cur = addCalendarDays(cur, 1);
  }
  return Math.max(1, count);
}

function dateFinToWorkingDayIndex(baseDate: Date, targetDate: Date, holidaySet: Set<string>): number {
  let effective = new Date(targetDate);
  let safety = 0;
  while (holidaySet.has(toISO(effective)) && safety < 30) {
    effective = addCalendarDays(effective, 1);
    safety++;
  }
  return dateToWorkingDayIndex(baseDate, effective, holidaySet);
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
  const sprintLineIds = new Set(lines.filter((l) => l.sprintId === sprintId).map((l) => l.id));
  if (sprintLineIds.size === 0) return 1;
  const profilTotals = new Map<number, number>();
  for (const lp of lineProfils) {
    if (!sprintLineIds.has(lp.lineId)) continue;
    profilTotals.set(lp.profil.id, (profilTotals.get(lp.profil.id) ?? 0) + lp.volume);
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
  baseDate: Date | null,
  holidaySet: Set<string>
): ComputedLot[] {
  const sortedLots = [...lots].sort((a, b) => a.order - b.order);
  let cursor = 1;

  return sortedLots.map((lot) => {
    const sortedPhases = [...((lot.phases ?? []) as any[])].sort((a, b) => a.order - b.order);
    const computedPhases: ComputedPhase[] = [];
    let phaseCursor = cursor;

    for (const phase of sortedPhases) {
      const sortedSprints = [...((phase.sprints ?? []) as any[])].sort((a, b) => a.order - b.order);
      const computedSprints: ComputedSprint[] = [];
      let sprintCursor = phaseCursor;

      for (const sprint of sortedSprints) {
        let fromDay: number;
        let toDay: number;
        let isManual = false;

        if (sprint.fromDay != null && sprint.fromDay > 0 && sprint.toDay != null && sprint.toDay > 0) {
          fromDay = sprint.fromDay;
          toDay = sprint.toDay;
          isManual = true;
        } else if (baseDate && sprint.dateDebut && sprint.dateFin) {
          fromDay = dateToWorkingDayIndex(baseDate, new Date(sprint.dateDebut), holidaySet);
          toDay = dateFinToWorkingDayIndex(baseDate, new Date(sprint.dateFin), holidaySet);
          isManual = true;
        } else {
          const duration = calcSprintDuration(sprint.id, lines, lineProfils);
          fromDay = sprintCursor;
          toDay = sprintCursor + duration - 1;
        }

        if (toDay >= sprintCursor) sprintCursor = toDay + 1;

        const sprintDelivs = ((deliverables as any).get(phase.id) ?? []).filter(
          (d: any) => d.sprintId === sprint.id
        );

        computedSprints.push({
          id: sprint.id, phaseId: phase.id, lotId: lot.id,
          name: sprint.name, order: sprint.order,
          fromDay, toDay, duration: toDay - fromDay + 1,
          isManual, deliverables: sprintDelivs,
        });
      }

      const sprintFroms = computedSprints.map((s) => s.fromDay).filter(Number.isFinite);
      const sprintTos = computedSprints.map((s) => s.toDay).filter(Number.isFinite);
      let phaseFrom: number;
      let phaseTo: number;
      if (sprintFroms.length > 0) {
        phaseFrom = Math.min(...sprintFroms);
        phaseTo = Math.max(...sprintTos);
      } else if (baseDate && (phase as any).dateDebut && (phase as any).dateFin) {
        phaseFrom = dateToWorkingDayIndex(baseDate, new Date((phase as any).dateDebut), holidaySet);
        phaseTo = dateFinToWorkingDayIndex(baseDate, new Date((phase as any).dateFin), holidaySet);
      } else {
        phaseFrom = phaseCursor;
        phaseTo = phaseCursor;
      }

      computedPhases.push({
        id: phase.id, lotId: lot.id, name: phase.name, order: phase.order,
        fromDay: phaseFrom, toDay: phaseTo, sprints: computedSprints,
      });

      phaseCursor = Math.max(phaseCursor, sprintCursor);
    }

    const phaseFromsForLot = computedPhases.map((p) => p.fromDay).filter(Number.isFinite);
    const phaseTosForLot = computedPhases.map((p) => p.toDay).filter(Number.isFinite);
    let lotFrom: number;
    let lotTo: number;
    const lotAny = lot as any;
    if (phaseFromsForLot.length > 0) {
      lotFrom = Math.min(...phaseFromsForLot);
      lotTo = Math.max(...phaseTosForLot);
    } else if (baseDate && lotAny.dateDebut && lotAny.dateFin) {
      lotFrom = dateToWorkingDayIndex(baseDate, new Date(lotAny.dateDebut), holidaySet);
      lotTo = dateFinToWorkingDayIndex(baseDate, new Date(lotAny.dateFin), holidaySet);
    } else {
      lotFrom = cursor;
      lotTo = cursor;
    }

    cursor = phaseCursor;
    return { id: lot.id, name: lot.name, order: lot.order, fromDay: lotFrom, toDay: lotTo, phases: computedPhases };
  });
}

// ─── BURNDOWN ─────────────────────────────────────────────────────────────────

interface BurndownPoint {
  day: number;
  date?: Date;
  label: string;
  ideal: number;
  remaining: number;
  sprintName?: string;
}

function computeBurndown(
  computed: ComputedLot[],
  lines: BacklogLine[],
  lineProfils: BacklogLineProfil[],
  totalDays: number,
  baseDate: Date | null,
  holidaySet: Set<string>
): BurndownPoint[] {
  if (totalDays <= 0) return [];
  const allSprints: { id: number; toDay: number; name: string; jhLoad: number }[] = [];
  for (const lot of computed) {
    for (const phase of lot.phases) {
      for (const sprint of phase.sprints) {
        const ids = new Set(lines.filter((l) => l.sprintId === sprint.id).map((l) => l.id));
        const totals = new Map<number, number>();
        for (const lp of lineProfils) {
          if (!ids.has(lp.lineId)) continue;
          totals.set(lp.profil.id, (totals.get(lp.profil.id) ?? 0) + lp.volume);
        }
        allSprints.push({
          id: sprint.id, toDay: sprint.toDay, name: sprint.name,
          jhLoad: totals.size > 0 ? Math.max(...totals.values()) : sprint.duration,
        });
      }
    }
  }
  const totalJH = allSprints.reduce((s, sp) => s + sp.jhLoad, 0);
  if (totalJH === 0) return [];
  const sorted = [...allSprints].sort((a, b) => a.toDay - b.toDay);
  const points: BurndownPoint[] = [];
  points.push({ day: 0, date: baseDate ?? undefined, label: baseDate ? fmtDateShort(baseDate) : "Debut", ideal: totalJH, remaining: totalJH });
  let jhDone = 0;
  for (const sprint of sorted) {
    jhDone += sprint.jhLoad;
    const remaining = Math.max(0, totalJH - jhDone);
    const date = baseDate ? workingDayToDate(sprint.toDay, baseDate, holidaySet) : undefined;
    points.push({
      day: sprint.toDay, date, label: baseDate ? fmtDateShort(date!) : `J${sprint.toDay}`,
      ideal: Math.max(0, totalJH - (totalJH * sprint.toDay) / totalDays), remaining, sprintName: sprint.name,
    });
  }
  const last = points[points.length - 1];
  if (last.day < totalDays) {
    const date = baseDate ? workingDayToDate(totalDays, baseDate, holidaySet) : undefined;
    points.push({ day: totalDays, date, label: baseDate ? fmtDateShort(date!) : `J${totalDays}`, ideal: 0, remaining: last.remaining });
  }
  return points;
}

// ─── BURNDOWN CHART ──────────────────────────────────────────────────────────

const BurndownChart: React.FC<{ points: BurndownPoint[]; totalJH: number }> = ({ points, totalJH }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  useEffect(() => {
    if (!canvasRef.current || points.length < 2) return;
    const init = () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      const Chart = (window as any).Chart;
      if (!Chart) return;
      chartRef.current = new Chart(canvasRef.current!.getContext("2d")!, {
        type: "line",
        data: {
          labels: points.map((p) => p.label),
          datasets: [
            { label: "Ideal", data: points.map((p) => Math.round(p.ideal * 10) / 10), borderColor: "#0e7490", backgroundColor: "rgba(14,116,144,0.08)", borderWidth: 2, borderDash: [6, 3], pointRadius: 3, pointBackgroundColor: "#0e7490", fill: false, tension: 0 },
            { label: "Reel", data: points.map((p) => Math.round(p.remaining * 10) / 10), borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.10)", borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: "#7c3aed", fill: true, tension: 0.15 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (i: any) => ` ${i.dataset.label} : ${i.formattedValue} JH` } } },
          scales: {
            x: { ticks: { font: { size: 10 }, color: "#64748b", maxRotation: 35, autoSkip: true, maxTicksLimit: 12 }, grid: { color: "#dde8ed", lineWidth: 0.5 } },
            y: { min: 0, suggestedMax: Math.ceil(totalJH * 1.05), ticks: { font: { size: 10 }, color: "#64748b", callback: (v: number) => `${v} JH` }, grid: { color: "#dde8ed", lineWidth: 0.5 }, title: { display: true, text: "Charge restante (JH)", font: { size: 10 }, color: "#94a3b8" } },
          },
        },
      });
    };
    if ((window as any).Chart) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = init;
    document.head.appendChild(s);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [points, totalJH]);
  if (points.length < 2) return <div style={{ textAlign: "center", color: "#94a3b8", padding: "12px", fontSize: "0.8rem" }}>Données insuffisantes pour le burndown.</div>;
  return <div style={{ position: "relative", width: "100%", height: 260 }}><canvas ref={canvasRef} /></div>;
};

// ─── ROW BUILDING ─────────────────────────────────────────────────────────────

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
  /** Pour les livrables : jour ouvrable de fin du sprint parent */
  parentSprintToDay?: number;
}

function buildRows(computed: ComputedLot[], collapsed: Set<string>, showDeliverables: boolean): GRow[] {
  const rows: GRow[] = [];
  for (const lot of computed) {
    const lotId = `lot-${lot.id}`;
    rows.push({ id: lotId, kind: "lot", label: lot.name, fromDay: lot.fromDay, toDay: lot.toDay, lotId: lot.id, depth: 0, color: COLOR.lotBar, bgColor: COLOR.lotBg, isDraggable: false });
    if (collapsed.has(lotId)) continue;
    for (const phase of lot.phases) {
      const phaseId = `phase-${phase.id}`;
      rows.push({ id: phaseId, kind: "phase", label: phase.name, fromDay: phase.fromDay, toDay: phase.toDay, phaseId: phase.id, lotId: lot.id, depth: 1, color: COLOR.phaseBar, bgColor: COLOR.phaseBg, isDraggable: false });
      if (collapsed.has(phaseId)) continue;
      for (const sprint of phase.sprints) {
        const sprintRowId = `sprint-${sprint.id}`;
        rows.push({ id: sprintRowId, kind: "sprint", label: sprint.name, fromDay: sprint.fromDay, toDay: sprint.toDay, sprintId: sprint.id, phaseId: phase.id, lotId: lot.id, depth: 2, color: COLOR.sprintBar, bgColor: COLOR.sprintBg, isDraggable: true, deliverables: sprint.deliverables });
        if (showDeliverables && sprint.deliverables?.length > 0) {
          for (const d of sprint.deliverables) {
            rows.push({
              id: `deliv-${d.id}`, kind: "deliverable", label: d.name,
              fromDay: sprint.toDay, toDay: sprint.toDay,
              sprintId: sprint.id, phaseId: phase.id, lotId: lot.id,
              depth: 3, color: COLOR.delivLabel, bgColor: "#fff", isDraggable: false,
              parentSprintToDay: sprint.toDay,
            });
          }
        }
      }
    }
  }
  return rows;
}

// ─── CALENDAR COORDINATE HELPERS ─────────────────────────────────────────────

function workingDayToCalIndex(wdIdx: number, baseDate: Date, holidaySet: Set<string>): number {
  const date = workingDayToDate(wdIdx, baseDate, holidaySet);
  return calendarDaysBetween(baseDate, date);
}

function calendarDaysBetween(d1: Date, d2: Date): number {
  const t1 = new Date(d1); t1.setHours(0, 0, 0, 0);
  const t2 = new Date(d2); t2.setHours(0, 0, 0, 0);
  return Math.round((t2.getTime() - t1.getTime()) / 86_400_000);
}

function calColsNeeded(totalWorkingDays: number, baseDate: Date | null, holidaySet: Set<string>, extra = 4): number {
  if (!baseDate || totalWorkingDays <= 0) return totalWorkingDays + extra;
  const lastDate = workingDayToDate(totalWorkingDays, baseDate, holidaySet);
  return calendarDaysBetween(baseDate, lastDate) + 1 + extra;
}

function wdToX(wdIdx: number, unit: TimeUnit, colW: number, baseDate: Date | null, holidaySet: Set<string>): number {
  if (!isFinite(wdIdx) || wdIdx == null) return 0;
  if (!baseDate || holidaySet.size === 0) {
    return unit === "day" ? (wdIdx - 1) * colW : ((wdIdx - 1) / DAYS_PER_WEEK) * colW;
  }
  const calIdx = workingDayToCalIndex(wdIdx, baseDate, holidaySet);
  return unit === "day" ? calIdx * colW : (calIdx / 7) * colW;
}

function wdToW(fromWd: number, toWd: number, unit: TimeUnit, colW: number, baseDate: Date | null, holidaySet: Set<string>): number {
  if (!isFinite(fromWd) || !isFinite(toWd) || fromWd > toWd) return MIN_BAR;
  if (!baseDate || holidaySet.size === 0) {
    const days = toWd - fromWd + 1;
    return unit === "day" ? Math.max(MIN_BAR, days * colW) : Math.max(MIN_BAR, (days / DAYS_PER_WEEK) * colW);
  }
  const fromCal = workingDayToCalIndex(fromWd, baseDate, holidaySet);
  const toCal = workingDayToCalIndex(toWd, baseDate, holidaySet);
  const calSpan = toCal - fromCal + 1;
  return unit === "day" ? Math.max(MIN_BAR, calSpan * colW) : Math.max(MIN_BAR, (calSpan / 7) * colW);
}

const LDot: React.FC<{ color: string; label: string; square?: boolean; dashed?: boolean }> = ({ color, label, square, dashed }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
    {dashed ? (
      <svg width={18} height={10} style={{ flexShrink: 0 }}><line x1={0} y1={5} x2={18} y2={5} stroke={color} strokeWidth={2} strokeDasharray="5,3" /></svg>
    ) : (
      <div style={{ width: 10, height: 10, background: color, borderRadius: square ? 2 : 5, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
    )}
    <span style={{ color: "#64748b", fontSize: "0.72rem" }}>{label}</span>
  </div>
);

// ─── CONFIRM DIALOG ────────────────────────────────────────────────────────────

const ConfirmDialog: React.FC<{ message: string; onConfirm: () => void; onCancel: () => void }> = ({ message, onConfirm, onCancel }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ background: "#fff", borderRadius: 10, padding: "24px 28px", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
      <p style={{ marginBottom: 20, color: "#1e3a4a", fontWeight: 600, fontSize: "0.9rem" }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>Annuler</button>
        <button className="btn btn-sm btn-danger" onClick={onConfirm}>Confirmer</button>
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const PlanningTab: React.FC<PlanningTabProps> = ({
  lots, lines, lineProfils, deliverables,
  selectedBacklogId, planningService, datedebutPlanning, onPlanningUpdated, api,
}) => {
  const [unit, setUnit] = useState<TimeUnit>("week");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDeliverables, setShowDeliverables] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [startDateInput, setStartDateInput] = useState<string>(datedebutPlanning ?? "");
  const [editingDate, setEditingDate] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [showRemoveDateConfirm, setShowRemoveDateConfirm] = useState(false);

  const [dragState, setDragState] = useState<{
    sprintId: number; type: "move" | "resizeR"; startX: number; origFrom: number; origTo: number;
  } | null>(null);
  const [liveOverrides, setLiveOverrides] = useState<Map<number, { fromDay: number; toDay: number }>>(new Map());

  // ─────────────────────────────────────────────────────────────────────────────
  // FIX : pendingOverrides est la SOURCE DE VÉRITÉ locale après drag.
  // On ne le vide QU'APRÈS confirmation du serveur, en synchronisant les nouvelles
  // données reçues via `lots` dans un useEffect dédié.
  // ─────────────────────────────────────────────────────────────────────────────
  const [pendingOverrides, setPendingOverrides] = useState<Map<number, { fromDay: number; toDay: number }>>(new Map());
  // Quand `lots` change (après onPlanningUpdated), on purge les overrides dont la
  // valeur est maintenant reflétée dans les données serveur.
  useEffect(() => {
    if (pendingOverrides.size === 0) return;
    setPendingOverrides((prev) => {
      const next = new Map(prev);
      for (const [sprintId, ov] of prev.entries()) {
        // Chercher le sprint dans les nouvelles données
        for (const lot of lots) {
          for (const phase of (lot.phases ?? []) as any[]) {
            for (const sprint of (phase.sprints ?? []) as any[]) {
              if (sprint.id === sprintId) {
                // Si les données serveur correspondent à l'override, le purger
                const serverFrom = sprint.fromDay ?? 0;
                const serverTo = sprint.toDay ?? 0;
                if (serverFrom === ov.fromDay && serverTo === ov.toDay) {
                  next.delete(sprintId);
                }
              }
            }
          }
        }
      }
      return next;
    });
  }, [lots]); // eslint-disable-line react-hooks/exhaustive-deps

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  const joursFeriesService = useMemo(() => new JoursFeriesService(api), [api]);

  const colW = COL_PX[unit];
  const autoBaseDate = useMemo(() => detectBaseDateFromLots(lots), [lots]);

  const baseDate = useMemo<Date | null>(() => {
    const explicit = startDateInput || datedebutPlanning;
    if (explicit) { const p = new Date(explicit); return isNaN(p.getTime()) ? null : p; }
    return autoBaseDate;
  }, [startDateInput, datedebutPlanning, autoBaseDate]);

  useEffect(() => {
    if (!startDateInput && !datedebutPlanning && autoBaseDate)
      setStartDateInput(autoBaseDate.toISOString().slice(0, 10));
  }, [autoBaseDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (datedebutPlanning) setStartDateInput(datedebutPlanning); }, [datedebutPlanning]);

  useEffect(() => {
    const hEl = headerScrollRef.current; const bEl = bodyScrollRef.current;
    if (!hEl || !bEl) return;
    const onBody = () => { if (isSyncingScroll.current) return; isSyncingScroll.current = true; hEl.scrollLeft = bEl.scrollLeft; isSyncingScroll.current = false; };
    const onHeader = () => { if (isSyncingScroll.current) return; isSyncingScroll.current = true; bEl.scrollLeft = hEl.scrollLeft; isSyncingScroll.current = false; };
    bEl.addEventListener("scroll", onBody); hEl.addEventListener("scroll", onHeader);
    return () => { bEl.removeEventListener("scroll", onBody); hEl.removeEventListener("scroll", onHeader); };
  }, []);

  const holidaySet = useMemo(() => {
    if (joursFeries.length === 0) return new Set<string>();
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    if (baseDate) {
      years.add(baseDate.getFullYear());
      years.add(addCalendarDays(baseDate, 400).getFullYear());
    }
    return buildHolidaySet(joursFeries, [...years]);
  }, [joursFeries, baseDate]);

  // lotsWithPending : injecte pendingOverrides dans les données brutes pour le calcul
  const lotsWithPending = useMemo<BacklogLot[]>(() => {
    if (pendingOverrides.size === 0) return lots;
    return lots.map((lot) => ({
      ...lot,
      phases: ((lot.phases ?? []) as any[]).map((phase: any) => ({
        ...phase,
        sprints: (phase.sprints ?? []).map((sprint: any) => {
          const ov = pendingOverrides.get(sprint.id);
          return ov ? { ...sprint, fromDay: ov.fromDay, toDay: ov.toDay } : sprint;
        }),
      })),
    }));
  }, [lots, pendingOverrides]);

  const computedBase = useMemo(
    () => computePlanning(lotsWithPending, lines, lineProfils, deliverables as any, baseDate, holidaySet),
    [lotsWithPending, lines, lineProfils, deliverables, baseDate, holidaySet]
  );

  // Applique les liveOverrides (pendant le drag) par-dessus le computedBase
  const computed = useMemo<ComputedLot[]>(() => {
    if (liveOverrides.size === 0) return computedBase;
    return computedBase.map((lot) => {
      const phasedLot = lot.phases.map((phase) => {
        const patchedSprints = phase.sprints.map((sprint) => {
          const ov = liveOverrides.get(sprint.id);
          if (!ov) return sprint;
          return { ...sprint, fromDay: ov.fromDay, toDay: ov.toDay, duration: ov.toDay - ov.fromDay + 1, isManual: true };
        });
        const froms = patchedSprints.map((s) => s.fromDay).filter(isFinite);
        const tos = patchedSprints.map((s) => s.toDay).filter(isFinite);
        return { ...phase, fromDay: froms.length ? Math.min(...froms) : phase.fromDay, toDay: tos.length ? Math.max(...tos) : phase.toDay, sprints: patchedSprints };
      });
      const lf = phasedLot.map((p) => p.fromDay).filter(isFinite);
      const lt = phasedLot.map((p) => p.toDay).filter(isFinite);
      return { ...lot, fromDay: lf.length ? Math.min(...lf) : lot.fromDay, toDay: lt.length ? Math.max(...lt) : lot.toDay, phases: phasedLot };
    });
  }, [computedBase, liveOverrides]);

  const rows = useMemo(() => buildRows(computed, collapsed, showDeliverables), [computed, collapsed, showDeliverables]);

  const totalDays = useMemo(() => {
    if (computed.length === 0) return 1;
    const vals = computed.map((l) => l.toDay).filter(Number.isFinite);
    return vals.length ? Math.max(...vals) : 1;
  }, [computed]);

  useEffect(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    if (baseDate) {
      years.add(baseDate.getFullYear());
      years.add(addCalendarDays(baseDate, Math.max(totalDays * 2, 400)).getFullYear());
    }
    Promise.all([...years].map((y) => joursFeriesService.getForYear(y)))
      .then((arrays) => setJoursFeries(arrays.flat()))
      .catch(() => {});
  }, [baseDate, totalDays, joursFeriesService]);

  const nCalCols = useMemo(() => {
    if (unit === "week") {
      const totalCalDays = calColsNeeded(totalDays, baseDate, holidaySet, 6);
      return Math.ceil(totalCalDays / 7) + 2;
    }
    return calColsNeeded(totalDays, baseDate, holidaySet, 4);
  }, [totalDays, baseDate, holidaySet, unit]);

  const nCols = nCalCols;
  const scrollW = nCols * colW;
  const svgBodyH = Math.max(1, rows.length) * ROW_H;

  const wd2date = useCallback(
    (idx: number): Date | null => baseDate ? workingDayToDate(idx, baseDate, holidaySet) : null,
    [baseDate, holidaySet]
  );

  const burndownPoints = useMemo(
    () => computeBurndown(computed, lines, lineProfils, totalDays, baseDate, holidaySet),
    [computed, lines, lineProfils, totalDays, baseDate, holidaySet]
  );
  const totalJH = useMemo(() => burndownPoints.length ? burndownPoints[0].remaining : 0, [burndownPoints]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const startDrag = useCallback((e: React.MouseEvent, sprintId: number, type: "move" | "resizeR", fromDay: number, toDay: number) => {
    e.preventDefault(); e.stopPropagation();
    setDragState({ sprintId, type, startX: e.clientX, origFrom: fromDay, origTo: toDay });
  }, []);

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const dPx = e.clientX - dragState.startX;
      const pxPerDay = unit === "day" ? colW : colW / DAYS_PER_WEEK;
      const dDays = Math.round(dPx / pxPerDay);
      const dur = dragState.origTo - dragState.origFrom + 1;
      const newFrom = dragState.type === "move" ? Math.max(1, dragState.origFrom + dDays) : dragState.origFrom;
      const newTo = dragState.type === "move" ? newFrom + dur - 1 : Math.max(dragState.origFrom, dragState.origTo + dDays);
      setLiveOverrides((prev) => { const n = new Map(prev); n.set(dragState.sprintId, { fromDay: newFrom, toDay: newTo }); return n; });
    };
    const onUp = () => {
      setLiveOverrides((prev) => {
        const ov = prev.get(dragState.sprintId);
        if (ov) setPendingOverrides((p) => { const n = new Map(p); n.set(dragState.sprintId, ov); return n; });
        const n = new Map(prev); n.delete(dragState.sprintId); return n;
      });
      setDragState(null);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragState, colW, unit]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (pendingOverrides.size === 0) return;
    setSaving(true); setSaveErr(null); setSaveOk(false);
    try {
      const wd2iso = (idx: number): string | undefined =>
        baseDate ? workingDayToDate(idx, baseDate, holidaySet).toISOString().slice(0, 10) : undefined;

      const sprintPayloads: SprintTimeDTO[] = [];
      for (const [sprintId, ov] of pendingOverrides.entries()) {
        sprintPayloads.push({
          id: sprintId,
          fromDay: ov.fromDay,
          toDay: ov.toDay,
          dateDebut: wd2iso(ov.fromDay),
          dateFin: wd2iso(ov.toDay),
        });
      }

      const phasePayloads: PhaseTimeDTO[] = [];
      const lotPayloads: LotTimeDTO[] = [];
      const modifiedSprintIds = new Set(pendingOverrides.keys());

      for (const lot of lots) {
        const phases = (lot.phases ?? []) as any[];
        let lotMin: number | null = null;
        let lotMax: number | null = null;
        let lotTouched = false;

        for (const phase of phases) {
          const phaseSprints: any[] = phase.sprints ?? [];
          const bounds = phaseSprints.map((s: any) => {
            const ov = pendingOverrides.get(s.id);
            if (ov) return { from: ov.fromDay, to: ov.toDay };
            if (s.fromDay > 0 && s.toDay > 0) return { from: s.fromDay as number, to: s.toDay as number };
            if (baseDate && s.dateDebut && s.dateFin) {
              return {
                from: dateToWorkingDayIndex(baseDate, new Date(s.dateDebut), holidaySet),
                to: dateFinToWorkingDayIndex(baseDate, new Date(s.dateFin), holidaySet),
              };
            }
            return null;
          }).filter(Boolean) as { from: number; to: number }[];

          if (bounds.length === 0) continue;

          const phaseFrom = Math.min(...bounds.map((b) => b.from));
          const phaseTo = Math.max(...bounds.map((b) => b.to));

          lotMin = lotMin === null ? phaseFrom : Math.min(lotMin, phaseFrom);
          lotMax = lotMax === null ? phaseTo : Math.max(lotMax, phaseTo);

          const phaseTouched = phaseSprints.some((s: any) => modifiedSprintIds.has(s.id));
          if (phaseTouched) {
            lotTouched = true;
            phasePayloads.push({ id: phase.id, fromDay: phaseFrom, toDay: phaseTo, dateDebut: wd2iso(phaseFrom), dateFin: wd2iso(phaseTo) });
          }
        }

        if (lotTouched && lotMin !== null && lotMax !== null) {
          lotPayloads.push({ id: lot.id, fromDay: lotMin, toDay: lotMax, dateDebut: wd2iso(lotMin), dateFin: wd2iso(lotMax) });
        }
      }

      await planningService.updateSprintTimes(sprintPayloads, phasePayloads, lotPayloads);

      // NE PAS vider pendingOverrides ici — le useEffect sur `lots` s'en chargera
      // une fois que onPlanningUpdated() aura retourné les nouvelles données.
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
      setSaveErr(err?.message ?? "Erreur date de debut.");
    } finally {
      setSavingDate(false);
    }
  };

  const handleRemoveStartDate = async () => {
    if (!selectedBacklogId) return;
    setSavingDate(true);
    setShowRemoveDateConfirm(false);
    try {
      // Envoie null / chaîne vide selon l'API
      await planningService.updateStartDate(selectedBacklogId, "");
      setStartDateInput("");
      setEditingDate(false);
      onPlanningUpdated?.();
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur suppression date de debut.");
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
      let wStart = 0;
      while (wStart < nCols) {
        const wEnd = Math.min(wStart + 7, nCols);
        const wx = wStart * colW;
        const ww = (wEnd - wStart) * colW;
        const wDate = baseDate ? addCalendarDays(baseDate, wStart) : null;
        const wIdx = Math.floor(wStart / 7);
        el.push(
          <rect key={`wbg-${wStart}`} x={wx} y={0} width={ww} height={HDR_ROW1} fill={wIdx % 2 === 0 ? COLOR.headerBg : COLOR.headerSub} />,
          <text key={`wlbl-${wStart}`} x={wx + ww / 2} y={HDR_ROW1 / 2 + 4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700} fontFamily="inherit">
            {wDate ? `Sem. ${fmtDateShort(wDate)}` : `Sem. ${wIdx + 1}`}
          </text>
        );
        wStart = wEnd;
      }

      for (let d = 0; d < nCols; d++) {
        const dx = d * colW;
        const calDate = baseDate ? addCalendarDays(baseDate, d) : null;
        const iso = calDate ? toISO(calDate) : null;
        const isHol = iso ? holidaySet.has(iso) : false;

        let holidayName = "";
        if (isHol && iso) {
          const jf = joursFeries.find((j) => {
            if (j.type === "FIXE" && j.mois && j.jour && calDate)
              return calDate.getMonth() + 1 === j.mois && calDate.getDate() === j.jour;
            return j.dateExacte?.slice(0, 10) === iso;
          });
          holidayName = jf?.libelle ?? "Jour ferié";
        }

        const bgFill = isHol ? COLOR.holiday : d % 2 === 0 ? "#f0f6f9" : "#e4eff5";
        const textFill = isHol ? COLOR.holidayHeader : "#1e3a4a";
        const label = calDate ? fmtDateShort(calDate) : `J${d + 1}`;

        if (isHol) {
          el.push(
            <g key={`day-${d}`} style={{ cursor: "help" }}>
              <title>{holidayName}</title>
              <rect x={dx} y={HDR_ROW1} width={colW} height={HDR_H - HDR_ROW1} fill={bgFill} stroke={COLOR.holidayStroke} strokeWidth={0.5} />
              <text x={dx + colW / 2} y={HDR_ROW1 + (HDR_H - HDR_ROW1) / 2 - 3} textAnchor="middle" fill={textFill} fontSize={8} fontFamily="inherit" fontWeight={400} fontStyle="italic">{label}</text>
              {colW >= 28 && <text x={dx + colW / 2} y={HDR_H - 5} textAnchor="middle" fill={textFill} fontSize={7} fontFamily="inherit">🗓</text>}
            </g>
          );
        } else {
          el.push(
            <rect key={`dbg-${d}`} x={dx} y={HDR_ROW1} width={colW} height={HDR_H - HDR_ROW1} fill={bgFill} stroke={COLOR.grid} strokeWidth={0.5} />,
            <text key={`dlbl-${d}`} x={dx + colW / 2} y={HDR_ROW1 + (HDR_H - HDR_ROW1) / 2 + 3} textAnchor="middle" fill={textFill} fontSize={8} fontFamily="inherit" fontWeight={600}>{label}</text>
          );
        }
      }
    } else {
      const nMonths = Math.ceil(nCols / 4);
      for (let m = 0; m < nMonths; m++) {
        const mx = m * 4 * colW;
        const mw = Math.min(4, nCols - m * 4) * colW;
        const mDate = baseDate ? addCalendarDays(baseDate, m * 28) : null;
        el.push(
          <rect key={`mbg-${m}`} x={mx} y={0} width={mw} height={HDR_ROW1} fill={m % 2 === 0 ? COLOR.headerBg : COLOR.headerSub} />,
          <text key={`mlbl-${m}`} x={mx + mw / 2} y={HDR_ROW1 / 2 + 4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700} fontFamily="inherit">
            {mDate ? mDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : `Mois ${m + 1}`}
          </text>
        );
      }

      for (let w = 0; w < nCols; w++) {
        const wx = w * colW;
        const weekStart = baseDate ? addCalendarDays(baseDate, w * 7) : null;
        let hasHoliday = false;
        const weekHolidayNames: string[] = [];
        if (weekStart && holidaySet.size > 0) {
          for (let cd = 0; cd < 7; cd++) {
            const check = addCalendarDays(weekStart, cd);
            const iso = toISO(check);
            if (holidaySet.has(iso)) {
              hasHoliday = true;
              const jf = joursFeries.find((j) => {
                if (j.type === "FIXE" && j.mois && j.jour) return check.getMonth() + 1 === j.mois && check.getDate() === j.jour;
                return j.dateExacte?.slice(0, 10) === iso;
              });
              const name = jf?.libelle ?? "Jour ferié";
              const dateStr = check.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
              weekHolidayNames.push(`${dateStr} : ${name}`);
            }
          }
        }
        const holidayShort = weekHolidayNames.length > 0 ? weekHolidayNames[0].split(":")[1]?.trim().slice(0, 14) ?? "" : "";
        const tooltipText = weekHolidayNames.join("\n");
        const bgFill = hasHoliday ? COLOR.holiday : w % 2 === 0 ? "#f0f6f9" : "#e4eff5";
        const textFill = hasHoliday ? COLOR.holidayHeader : "#1e3a4a";
        const label = weekStart ? `S. ${fmtDateShort(weekStart)}` : `S${w + 1}`;

        if (hasHoliday) {
          el.push(
            <g key={`week-${w}`} style={{ cursor: "help" }}>
              <title>{tooltipText}</title>
              <rect x={wx} y={HDR_ROW1} width={colW} height={HDR_H - HDR_ROW1} fill={bgFill} stroke={COLOR.holidayStroke} strokeWidth={0.5} />
              <text x={wx + colW / 2} y={HDR_ROW1 + (HDR_H - HDR_ROW1) / 2 - 4} textAnchor="middle" fill={textFill} fontSize={weekStart ? 7 : 9} fontFamily="inherit" fontWeight={600}>{label}</text>
              <text x={wx + colW / 2} y={HDR_ROW1 + (HDR_H - HDR_ROW1) / 2 + 7} textAnchor="middle" fill={COLOR.holidayHeader} fontSize={6} fontFamily="inherit" fontStyle="italic">{holidayShort}</text>
            </g>
          );
        } else {
          el.push(
            <rect key={`wbg2-${w}`} x={wx} y={HDR_ROW1} width={colW} height={HDR_H - HDR_ROW1} fill={bgFill} stroke={COLOR.grid} strokeWidth={0.5} />,
            <text key={`wlbl2-${w}`} x={wx + colW / 2} y={HDR_ROW1 + (HDR_H - HDR_ROW1) / 2 + 4} textAnchor="middle" fill={textFill} fontSize={weekStart ? 7 : 9} fontFamily="inherit" fontWeight={600}>{label}</text>
          );
        }
      }
    }

    el.push(<line key="hbottom" x1={0} y1={HDR_H} x2={scrollW} y2={HDR_H} stroke={COLOR.gridMajor} strokeWidth={1.5} />);
    return el;
  };

  // ── Body SVG ───────────────────────────────────────────────────────────────

  const renderBodySVG = () => {
    const el: React.ReactNode[] = [];
    const elHolidayOverlay: React.ReactNode[] = [];

    for (let i = 0; i <= nCols; i++) {
      const x = i * colW;
      const isMajor = unit === "day" ? i % 7 === 0 : true;
      el.push(<line key={`vg-${i}`} x1={x} y1={0} x2={x} y2={svgBodyH} stroke={isMajor ? COLOR.gridMajor : COLOR.grid} strokeWidth={isMajor ? 1 : 0.5} />);
    }

    const holidayCols = new Set<number>();
    if (baseDate && holidaySet.size > 0 && unit === "day") {
      for (let d = 0; d < nCols; d++) {
        if (holidaySet.has(toISO(addCalendarDays(baseDate, d)))) holidayCols.add(d);
      }
    }
    const holidayWeekCols = new Set<number>();
    if (baseDate && holidaySet.size > 0 && unit === "week") {
      for (let w = 0; w < nCols; w++) {
        const weekStart = addCalendarDays(baseDate, w * 7);
        for (let cd = 0; cd < 7; cd++) {
          if (holidaySet.has(toISO(addCalendarDays(weekStart, cd)))) { holidayWeekCols.add(w); break; }
        }
      }
    }

    rows.forEach((_, ri) => {
      el.push(<line key={`hg-${ri}`} x1={0} y1={ri * ROW_H} x2={scrollW} y2={ri * ROW_H} stroke={COLOR.grid} strokeWidth={0.5} />);
    });

    rows.forEach((row, ri) => {
      const y = ri * ROW_H; const cy = y + ROW_H / 2;

      if (row.kind === "deliverable") {
        el.push(<rect key={`delbg-${row.id}`} x={0} y={y} width={scrollW} height={ROW_H} fill="#fafafa" style={{ pointerEvents: "none" }} />);
        const dx = wdToX(row.toDay, unit, colW, baseDate, holidaySet);
        el.push(
          <g key={`deliv-diamond-${row.id}`} style={{ pointerEvents: "none" }}>
            <polygon points={`${dx},${cy - 7} ${dx + 7},${cy} ${dx},${cy + 7} ${dx - 7},${cy}`}
              fill={COLOR.delivLabel} opacity={0.7} />
          </g>
        );
        return;
      }

      const bx = wdToX(row.fromDay, unit, colW, baseDate, holidaySet);
      const bw = wdToW(row.fromDay, row.toDay, unit, colW, baseDate, holidaySet);

      const isPending = row.kind === "sprint" && row.sprintId !== undefined && pendingOverrides.has(row.sprintId!);
      const isSel = selectedId === row.id;

      const bgFill = isSel ? "rgba(124,58,237,0.08)" : row.kind === "lot" ? COLOR.lotBg : row.kind === "phase" ? COLOR.phaseBg : COLOR.sprintBg;
      el.push(<rect key={`rbg-${row.id}`} x={0} y={y} width={scrollW} height={ROW_H} fill={bgFill} style={{ cursor: "pointer" }} onClick={() => setSelectedId(isSel ? null : row.id)} />);

      if (row.kind === "lot") {
        el.push(
          <rect key={`lot-${row.id}`} x={bx} y={cy - 3} width={bw} height={6} rx={3} fill={COLOR.lotBar} opacity={0.75} />,
          <rect key={`lot-tick-l-${row.id}`} x={bx} y={cy - 8} width={2} height={16} fill={COLOR.lotBar} opacity={0.6} />,
          <rect key={`lot-tick-r-${row.id}`} x={bx + bw - 2} y={cy - 8} width={2} height={16} fill={COLOR.lotBar} opacity={0.6} />
        );
        return;
      }

      if (row.kind === "phase") {
        const bH = ROW_H * 0.55; const bY = cy - bH / 2;
        const fd = wd2date(row.fromDay); const td = wd2date(row.toDay);
        el.push(
          <rect key={`phase-${row.id}`} x={bx} y={bY} width={bw} height={bH} rx={3} fill={COLOR.phaseBar} opacity={0.7} />,
          bw > 50 ? <text key={`phase-lbl-${row.id}`} x={bx + bw / 2} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700} fontFamily="inherit" style={{ pointerEvents: "none" }}>
            {fd && td ? `${fmtDateShort(fd)} → ${fmtDateShort(td)}` : `J${row.fromDay}→J${row.toDay}`}
          </text> : null
        );
        return;
      }

      if (row.kind === "sprint") {
        const bH = ROW_H * 0.62; const bY = cy - bH / 2;
        const isBeingDragged = dragState?.sprintId === row.sprintId;
        const barColor = isBeingDragged ? COLOR.sprintDrag : isPending ? COLOR.sprintAlt : COLOR.sprintBar;
        const toDate = wd2date(row.toDay);
        el.push(
          <g key={`sprint-${row.id}`}>
            {isSel && <rect x={bx - 2} y={bY - 2} width={bw + 4} height={bH + 4} rx={4} fill="rgba(124,58,237,0.2)" />}
            <rect x={bx} y={bY} width={bw} height={bH} rx={3} fill={barColor} opacity={isBeingDragged ? 0.85 : 1} style={{ cursor: "grab" }}
              onMouseDown={(e) => startDrag(e, row.sprintId!, "move", row.fromDay, row.toDay)} />
            {isPending && <rect x={bx} y={bY} width={bw} height={bH} rx={3} fill="url(#pendingStripe)" style={{ pointerEvents: "none" }} />}
            {bw > HANDLE_W * 2 + 6 && <rect x={bx + bw - HANDLE_W} y={bY} width={HANDLE_W} height={bH} rx={2} fill="rgba(0,0,0,0.18)" style={{ cursor: "ew-resize" }}
              onMouseDown={(e) => startDrag(e, row.sprintId!, "resizeR", row.fromDay, row.toDay)} />}
            {bw > 54 && <text x={bx + bw / 2} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={8} fontWeight={700} fontFamily="inherit" style={{ pointerEvents: "none" }}>
              {row.label}{toDate && ` · ${fmtDateShort(toDate)}`}
            </text>}
          </g>
        );
      }
    });

    if (unit === "day" && holidayCols.size > 0 && baseDate) {
      for (const d of holidayCols) {
        const calDate = addCalendarDays(baseDate, d);
        const iso = toISO(calDate);
        const jf = joursFeries.find((j) => {
          if (j.type === "FIXE" && j.mois && j.jour) return calDate.getMonth() + 1 === j.mois && calDate.getDate() === j.jour;
          return j.dateExacte?.slice(0, 10) === iso;
        });
        const name = jf?.libelle ?? "Jour ferié";
        const dateStr = calDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        elHolidayOverlay.push(
          <g key={`hol-top-${d}`} style={{ pointerEvents: "none" }}>
            <title>{`${dateStr}\n${name}`}</title>
            <rect x={d * colW} y={0} width={colW} height={svgBodyH} fill={COLOR.holiday} />
            <line x1={d * colW} y1={0} x2={d * colW} y2={svgBodyH} stroke={COLOR.holidayStroke} strokeWidth={1} strokeDasharray="3,3" />
          </g>
        );
      }
    }
    if (unit === "week" && holidayWeekCols.size > 0 && baseDate) {
      for (const w of holidayWeekCols) {
        const weekStart = addCalendarDays(baseDate, w * 7);
        const weekHolNames: string[] = [];
        for (let cd = 0; cd < 7; cd++) {
          const check = addCalendarDays(weekStart, cd);
          const iso = toISO(check);
          if (holidaySet.has(iso)) {
            const jf = joursFeries.find((j) => {
              if (j.type === "FIXE" && j.mois && j.jour) return check.getMonth() + 1 === j.mois && check.getDate() === j.jour;
              return j.dateExacte?.slice(0, 10) === iso;
            });
            const name = jf?.libelle ?? "Jour ferié";
            const dateStr = check.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
            weekHolNames.push(`${dateStr} : ${name}`);
          }
        }
        elHolidayOverlay.push(
          <g key={`hol-top-week-${w}`} style={{ pointerEvents: "none" }}>
            <title>{weekHolNames.join("\n")}</title>
            <rect x={w * colW} y={0} width={colW} height={svgBodyH} fill={COLOR.holiday} />
            <line x1={w * colW} y1={0} x2={w * colW} y2={svgBodyH} stroke={COLOR.holidayStroke} strokeWidth={1} strokeDasharray="3,3" />
          </g>
        );
      }
    }

    return [...el, ...elHolidayOverlay];
  };

  // ── Labels column ──────────────────────────────────────────────────────────

  const renderLabelsSVG = () => {
    const el: React.ReactNode[] = [];
    rows.forEach((row, ri) => {
      const y = ri * ROW_H;
      const isSel = selectedId === row.id;
      const isPending = row.kind === "sprint" && row.sprintId !== undefined && pendingOverrides.has(row.sprintId!);
      const bgFill = row.kind === "deliverable" ? "#fafafa" : isSel ? "rgba(124,58,237,0.08)" : row.kind === "lot" ? COLOR.lotBg : row.kind === "phase" ? COLOR.phaseBg : COLOR.sprintBg;

      // Dates pour le sprint
      const fromDate = (row.kind === "sprint") ? wd2date(row.fromDay) : null;
      const toDate = (row.kind === "sprint") ? wd2date(row.toDay) : null;
      // Date pour les livrables (= date fin du sprint parent)
      const delivDate = (row.kind === "deliverable" && row.parentSprintToDay)
        ? wd2date(row.parentSprintToDay)
        : null;

      // Libellé de la date livrable : si baseDate → date, sinon J{n}
      const delivDateLabel = delivDate
        ? fmtDateShort(delivDate)
        : row.kind === "deliverable"
          ? `J${row.parentSprintToDay ?? row.toDay}`
          : null;

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
                setCollapsed((prev) => { const n = new Set(prev); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; });
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
              <span style={{ fontSize: 8, color: COLOR.delivLabel, flexShrink: 0 }}>◆</span>
            )}
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0, opacity: row.kind === "deliverable" ? 0.5 : 1 }} />
            <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
              {/* Label principal */}
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: row.kind === "lot" ? 11.5 : row.kind === "phase" ? 10.5 : row.kind === "sprint" ? 9.5 : 8.5,
                  fontWeight: row.kind === "lot" ? 700 : row.kind === "phase" ? 600 : row.kind === "sprint" ? 600 : 400,
                  fontStyle: row.kind === "deliverable" ? "italic" : "normal",
                  color: row.kind === "lot" ? COLOR.lotBar : row.kind === "phase" ? COLOR.phaseBar : row.kind === "sprint" ? COLOR.sprintBar : COLOR.delivLabel,
                  lineHeight: 1.2,
                }}
                title={row.label}
              >
                {row.label}
              </div>

              {/* Sprint : dates début → fin */}
              {row.kind === "sprint" && (fromDate && toDate ? (
                <div style={{ fontSize: 7, color: "#94a3b8", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                  {fmtDate(fromDate)} → {fmtDate(toDate)}
                </div>
              ) : (
                <div style={{ fontSize: 7, color: "#94a3b8", lineHeight: 1.1 }}>
                  J{row.fromDay} → J{row.toDay} ({row.toDay - row.fromDay + 1}j)
                </div>
              ))}

              {/* Livrable : date de livraison (= fin du sprint) */}
              {row.kind === "deliverable" && delivDateLabel && (
                <div style={{ fontSize: 7, color: "#94a3b8", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                  📅 {delivDateLabel}
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
      <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
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
  const endDateReal = baseDate && totalDays > 0 ? workingDayToDate(totalDays, baseDate, holidaySet) : null;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>

      {showRemoveDateConfirm && (
        <ConfirmDialog
          message="Supprimer la date de début du planning ? Le Gantt passera en mode relatif (J1, J2…)."
          onConfirm={handleRemoveStartDate}
          onCancel={() => setShowRemoveDateConfirm(false)}
        />
      )}

      {/* Métriques */}
      <div className="d-flex align-items-center gap-3 flex-wrap px-3 py-2 mb-2 rounded"
        style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", fontSize: "0.82rem" }}>
        <strong style={{ color: COLOR.lotBar }}>
          {computed.length} lot{computed.length > 1 ? "s" : ""}{" · "}
          {computed.reduce((s, l) => s + l.phases.length, 0)} phases{" · "}
          {computed.reduce((s, l) => s + l.phases.reduce((ps, p) => ps + p.sprints.length, 0), 0)} sprints
        </strong>
        <span className="text-muted">|</span>
        <span>Durée : <strong>{totalDays}j ouvrables ({totalWeeks} sem.)</strong></span>
        {totalJH > 0 && <><span className="text-muted">|</span><span>Charge : <strong>{Math.round(totalJH)} JH</strong></span></>}
        {baseDate && endDateReal && (
          <><span className="text-muted">|</span>
            <span><strong>{fmtDate(baseDate)}</strong>{" → "}<strong>{fmtDate(endDateReal)}</strong></span></>
        )}
        {holidaySet.size > 0 && (
          <><span className="text-muted">|</span>
            <span style={{ color: COLOR.holidayHeader, fontSize: "0.78rem" }}>
              🗓 {holidaySet.size} férié{holidaySet.size > 1 ? "s" : ""} exclus
            </span></>
        )}
        {hasPending && (
          <><span className="text-muted">|</span>
            <span style={{ color: COLOR.sprintBar, fontWeight: 700 }}>
              {pendingOverrides.size} sprint{pendingOverrides.size > 1 ? "s" : ""} modifié{pendingOverrides.size > 1 ? "s" : ""}
            </span></>
        )}
        <small className="ms-auto text-muted">Glisser pour déplacer · bord droit pour redimensionner</small>
      </div>

      {/* Date de début */}
      <div className="d-flex align-items-center gap-3 px-3 py-2 mb-2 rounded flex-wrap"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
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
            <button className="btn btn-sm btn-success" style={{ fontSize: "0.75rem" }}
              onClick={handleSaveStartDate} disabled={savingDate || !startDateInput}>
              {savingDate ? "…" : "✓ Confirmer"}
            </button>
            <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: "0.75rem" }}
              onClick={() => { setEditingDate(false); setStartDateInput(datedebutPlanning ?? autoBaseDate?.toISOString().slice(0, 10) ?? ""); }}>
              Annuler
            </button>
            {/* Option : supprimer la date */}
            {(datedebutPlanning || startDateInput) && (
              <button
                className="btn btn-sm btn-outline-danger"
                style={{ fontSize: "0.75rem" }}
                onClick={() => setShowRemoveDateConfirm(true)}
                disabled={savingDate}
                title="Supprimer la date de début (mode relatif)"
              >
                🗑 Supprimer
              </button>
            )}
          </>
        ) : (
          <>
            <span style={{ color: baseDate ? COLOR.lotBar : "#94a3b8", fontWeight: 600 }}>
              {baseDate ? fmtDate(baseDate) : "Non définie"}
            </span>
            {dateSource === "auto" && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", borderRadius: 8 }}>
                auto-détectée
              </span>
            )}
            {dateSource === "prop" && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", background: "#ecfdf5", color: "#065f46", border: "1px solid #6ee7b7", borderRadius: 8 }}>
                définie sur le backlog
              </span>
            )}
            <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: "0.72rem" }} onClick={() => setEditingDate(true)}>
              ✎ Modifier
            </button>
          </>
        )}
      </div>

      {saveOk && <div className="alert alert-success py-2 mb-2 small">✓ Planning sauvegardé avec succès.</div>}
      {saveErr && <div className="alert alert-danger py-2 mb-2 small">✗ {saveErr}</div>}

      {/* Card Gantt */}
      <div className="card shadow-sm mb-3" style={{ border: hasPending ? `2px solid ${COLOR.sprintBar}` : "1px solid #dee2e6" }}>
        <div
          className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: COLOR.lotBar, padding: "10px 16px" }}
        >
          <div>
            <h5 className="mb-0" style={{ color: "#fff", fontSize: "1rem" }}>Planning Prévisionnel</h5>
            {baseDate && endDateReal && (
              <small style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem" }}>
                {fmtDate(baseDate)} → {fmtDate(endDateReal)} · {totalDays}j ouvrables / {totalWeeks} sem.
                {holidaySet.size > 0 && ` · ${holidaySet.size} férié${holidaySet.size > 1 ? "s" : ""} exclus`}
              </small>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {(["day", "week"] as TimeUnit[]).map((u) => (
                <button key={u} type="button"
                  className={`btn ${unit === u ? "btn-light" : "btn-outline-light"}`}
                  style={{ fontSize: "0.72rem", fontWeight: unit === u ? 700 : 400, padding: "3px 10px" }}
                  onClick={() => setUnit(u)}>
                  {u === "day" ? "Jours" : "Semaines"}
                </button>
              ))}
            </div>
            <button type="button"
              className={`btn btn-sm ${showDeliverables ? "btn-light" : "btn-outline-light"}`}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
              onClick={() => setShowDeliverables((v) => !v)}>
              Livrables
            </button>
            {hasPending && (
              <>
                <button className="btn btn-sm btn-outline-light" style={{ fontSize: "0.72rem", padding: "3px 10px" }} onClick={handleCancelPending} disabled={saving}>
                  Annuler
                </button>
                <button className="btn btn-sm btn-light" style={{ fontSize: "0.72rem", fontWeight: 700, color: COLOR.sprintBar, padding: "3px 12px" }} onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />…</>
                    : `✓ Valider (${pendingOverrides.size} modif.)`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Légende */}
        <div className="d-flex gap-3 flex-wrap align-items-center px-3 py-2"
          style={{ background: "#f8fafc", borderBottom: "1px solid #dee2e6", fontSize: "0.74rem" }}>
          <LDot color={COLOR.lotBar} label="Lot" />
          <LDot color={COLOR.phaseBar} label="Phase" />
          <LDot color={COLOR.sprintBar} label="Sprint" />
          <LDot color={COLOR.sprintAlt} label="Sprint modifie" />
          {showDeliverables && <LDot color={COLOR.delivLabel} label="Livrable" square />}
          {holidaySet.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR.holiday, border: `1px solid ${COLOR.holidayStroke}`, flexShrink: 0 }} />
              <span style={{ color: "#64748b", fontSize: "0.72rem" }}>Sem. avec férié (exclue du calcul)</span>
            </div>
          )}
          {hasPending && (
            <span className="ms-auto" style={{ color: COLOR.sprintBar, fontWeight: 700 }}>
              ⚠ {pendingOverrides.size} modif. non sauvegardée{pendingOverrides.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Gantt */}
        {rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
            Aucun sprint. Ajoutez des lots, phases et sprints dans l'onglet Backlog.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 580, position: "relative" }}>
            {/* Header sticky */}
            <div style={{ display: "flex", flexShrink: 0, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
              <div style={{ width: LABEL_W, flexShrink: 0, height: HDR_H, background: COLOR.headerBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", borderRight: `1.5px solid ${COLOR.gridMajor}` }}>
                <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>Lot / Phase / Sprint</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7.5, marginTop: 3 }}>
                  {baseDate
                    ? `Début : ${fmtDate(baseDate)}${dateSource === "auto" ? " (auto)" : ""}${holidaySet.size > 0 ? ` · ${holidaySet.size} férié${holidaySet.size > 1 ? "s" : ""} exclus` : ""}`
                    : "Mode relatif (J / S)"}
                </div>
              </div>
              <div ref={headerScrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
                <svg width={scrollW} height={HDR_H} style={{ display: "block" }}>{renderHeaderSVG()}</svg>
              </div>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Colonne labels */}
              <div
                style={{ width: LABEL_W, flexShrink: 0, overflowY: "auto", overflowX: "hidden", borderRight: `1.5px solid ${COLOR.gridMajor}` }}
                onScroll={(e) => { if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = (e.target as HTMLElement).scrollTop; }}
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

              {/* Corps Gantt */}
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

        {/* Détail sélection sprint */}
        {selRow && selRow.kind === "sprint" && (() => {
          const fd = wd2date(selRow.fromDay); const td = wd2date(selRow.toDay);
          return (
            <div style={{ borderTop: `2px solid ${COLOR.sprintBar}`, background: "#f5f3ff" }}>
              <div className="d-flex align-items-center gap-3 flex-wrap px-3 py-2" style={{ fontSize: "0.8rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLOR.sprintBar }} />
                  <strong style={{ color: COLOR.sprintBar }}>{selRow.label}</strong>
                </div>
                <span>Durée : <strong>{selRow.toDay - selRow.fromDay + 1} jours ouvrables</strong>{" "}({((selRow.toDay - selRow.fromDay + 1) / DAYS_PER_WEEK).toFixed(1)} sem.)</span>
                {fd && td ? (
                  <span style={{ color: COLOR.lotBar }}><strong>{fmtDate(fd)}</strong>{" → "}<strong>{fmtDate(td)}</strong></span>
                ) : (
                  <span style={{ color: "#64748b" }}>J{selRow.fromDay} → J{selRow.toDay}</span>
                )}
                {pendingOverrides.has(selRow.sprintId!) && (
                  <span style={{ color: COLOR.sprintBar, fontSize: "0.75rem" }}>⚠ Modifié — en attente de sauvegarde</span>
                )}
                {pendingOverrides.has(selRow.sprintId!) && (
                  <button className="btn btn-link btn-sm p-0 ms-auto text-muted" style={{ fontSize: "0.75rem" }}
                    onClick={() => { setPendingOverrides((prev) => { const n = new Map(prev); n.delete(selRow.sprintId!); return n; }); }}>
                    ↺ Réinitialiser
                  </button>
                )}
              </div>
              {selRow.deliverables && selRow.deliverables.length > 0 && (
                <div className="px-3 pb-2" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  <strong>Livrables :</strong>{" "}
                  {selRow.deliverables.map((d) => {
                    const delivDate = td ? fmtDateShort(td) : `J${selRow.toDay}`;
                    return (
                      <span key={d.id} style={{ marginRight: 8 }}>
                        ◆ {d.name} <span style={{ color: "#94a3b8" }}>({delivDate})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PlanningTab;