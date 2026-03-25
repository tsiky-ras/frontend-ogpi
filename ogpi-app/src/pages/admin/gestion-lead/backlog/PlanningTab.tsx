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
}


// Computed sprint for rendering
interface ComputedSprint {
  id: number;
  phaseId: number;
  lotId: number;
  name: string;
  order: number;
  fromDay: number; // 1-based
  toDay: number;   // 1-based inclusive
  duration: number; // days
  isManual: boolean; // has explicit fromDay/toDay
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

function dayToDate(base: Date, dayNum: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + (dayNum - 1));
  return d;
}

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

function isoToDate(iso: string): Date {
  return new Date(iso);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
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
  deliverables: Map<number, BacklogDeliverable[]>
): ComputedLot[] {
  const sortedLots = [...lots].sort((a, b) => a.order - b.order);

  let cursor = 1;

  return sortedLots.map((lot) => {
    const sortedPhases = [...(lot.phases ?? [])].sort(
      (a, b) => a.order - b.order
    );

    const computedPhases: ComputedPhase[] = [];
    let phaseCursor = cursor;

    for (const phase of sortedPhases) {
      const sortedSprints = [...(phase.sprints ?? [])].sort(
        (a, b) => a.order - b.order
      );

      const computedSprints: ComputedSprint[] = [];
      let sprintCursor = phaseCursor;

      for (const sprint of sortedSprints) {
        const isManual =
          sprint.fromDay !== null &&
          sprint.fromDay !== undefined &&
          sprint.toDay !== null &&
          sprint.toDay !== undefined &&
          sprint.fromDay > 0 &&
          sprint.toDay > 0;

        let fromDay: number;
        let toDay: number;

        if (isManual) {
          fromDay = sprint.fromDay!;
          toDay = sprint.toDay!;
        } else {
          const duration = calcSprintDuration(sprint.id, lines, lineProfils);
          fromDay = sprintCursor;
          toDay = sprintCursor + duration - 1;
        }

        sprintCursor = toDay + 1;

        const sprintDelivs = (deliverables.get(phase.id) ?? []).filter(
          (d) => d.sprintId === sprint.id
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

      const sprintFroms = computedSprints.map((s) => s.fromDay).filter(Number.isFinite);
      const sprintTos   = computedSprints.map((s) => s.toDay).filter(Number.isFinite);
      const phaseFrom   = sprintFroms.length > 0 ? Math.min(...sprintFroms) : phaseCursor;
      const phaseTo     = sprintTos.length   > 0 ? Math.max(...sprintTos)   : phaseCursor;

      computedPhases.push({
        id: phase.id,
        lotId: lot.id,
        name: phase.name,
        order: phase.order,
        fromDay: phaseFrom,
        toDay: phaseTo,
        sprints: computedSprints,
      });

      phaseCursor = sprintCursor;
    }

    const phaseFroms = computedPhases.map((p) => p.fromDay).filter(Number.isFinite);
    const phaseTos   = computedPhases.map((p) => p.toDay).filter(Number.isFinite);
    const lotFrom    = phaseFroms.length > 0 ? Math.min(...phaseFroms) : cursor;
    const lotTo      = phaseTos.length   > 0 ? Math.max(...phaseTos)   : cursor;

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

function xToDay(px: number, unit: TimeUnit, colW: number): number {
  if (unit === "day") return Math.round(px / colW) + 1;
  return Math.round((px / colW) * DAYS_PER_WEEK) + 1;
}

function snapToUnit(day: number, unit: TimeUnit): number {
  if (unit === "day") return Math.max(1, day);
  return Math.max(1, Math.round((day - 1) / DAYS_PER_WEEK) * DAYS_PER_WEEK + 1);
}

// ─── LEGEND DOT ───────────────────────────────────────────────────────────────

const LDot: React.FC<{ color: string; label: string; square?: boolean }> = ({
  color,
  label,
  square,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
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
}) => {
  const [unit, setUnit] = useState<TimeUnit>("week");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDeliverables, setShowDeliverables] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Date de début planning
  const [startDateInput, setStartDateInput] = useState<string>(
    datedebutPlanning ?? ""
  );
  const [editingDate, setEditingDate] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  // Confirmation effacement date
  const [confirmClearDate, setConfirmClearDate] = useState(false);

  // Sprint drag state
  const [dragState, setDragState] = useState<{
    sprintId: number;
    type: "move" | "resizeR";
    startX: number;
    origFrom: number;
    origTo: number;
  } | null>(null);

  // Live override for drag preview (sprintId → {fromDay, toDay})
  const [liveOverrides, setLiveOverrides] = useState<
    Map<number, { fromDay: number; toDay: number }>
  >(new Map());

  // Pending overrides to save (drag modifications not yet confirmed)
  const [pendingOverrides, setPendingOverrides] = useState<
    Map<number, { fromDay: number; toDay: number }>
  >(new Map());

  // ─── FIX BUG SAVE ──────────────────────────────────────────────────────────
  // Après la sauvegarde, on NE vide PAS pendingOverrides immédiatement.
  // On les transfère dans savedOverrides qui persiste jusqu'à ce que les lots
  // props soient mis à jour par le parent (reload). Ainsi le Gantt ne "saute"
  // pas à l'ancienne position pendant l'intervalle entre save et reload.
  const [savedOverrides, setSavedOverrides] = useState<
    Map<number, { fromDay: number; toDay: number }>
  >(new Map());

  // Dès que les lots props changent (après reload du parent), on nettoie
  // les savedOverrides dont les sprints correspondent aux nouvelles valeurs.
  useEffect(() => {
    if (savedOverrides.size === 0) return;
    setSavedOverrides((prev) => {
      const next = new Map(prev);
      for (const [sprintId, ov] of prev.entries()) {
        // Chercher le sprint dans les lots props mis à jour
        let found = false;
        for (const lot of lots) {
          for (const phase of lot.phases ?? []) {
            for (const sprint of phase.sprints ?? []) {
              if (sprint.id === sprintId) {
                // Si les valeurs du sprint dans les props correspondent à ce qu'on a sauvegardé,
                // les props sont à jour → on peut retirer cet override
                if (sprint.fromDay === ov.fromDay && sprint.toDay === ov.toDay) {
                  next.delete(sprintId);
                }
                found = true;
              }
            }
          }
        }
        // Sprint introuvable (supprimé) → nettoyer
        if (!found) next.delete(sprintId);
      }
      return next;
    });
  }, [lots]);

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const colW = COL_PX[unit];

  const baseDate = useMemo<Date | null>(() => {
    const d = startDateInput || datedebutPlanning;
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }, [startDateInput, datedebutPlanning]);

  // ── Sync scroll ────────────────────────────────────────────────────────────
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

  // ── Base planning : fusionne lots props + savedOverrides + pendingOverrides ─
  // Ordre de priorité : liveOverrides > pendingOverrides > savedOverrides > lots props
  const lotsWithOverrides = useMemo<BacklogLot[]>(() => {
    const hasAny = savedOverrides.size > 0 || pendingOverrides.size > 0;
    if (!hasAny) return lots;
    return lots.map((lot) => ({
      ...lot,
      phases: (lot.phases ?? []).map((phase) => ({
        ...phase,
        sprints: (phase.sprints ?? []).map((sprint) => {
          // pendingOverrides prime sur savedOverrides
          const ov = pendingOverrides.get(sprint.id) ?? savedOverrides.get(sprint.id);
          if (ov) return { ...sprint, fromDay: ov.fromDay, toDay: ov.toDay };
          return sprint;
        }),
      })),
    }));
  }, [lots, savedOverrides, pendingOverrides]);

  const computedBase = useMemo(
    () => computePlanning(lotsWithOverrides, lines, lineProfils, deliverables),
    [lotsWithOverrides, lines, lineProfils, deliverables]
  );

  // Patch live : appliqué uniquement pendant le drag pour un rendu fluide
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
        const phaseFrom = froms.length > 0 ? Math.min(...froms) : phase.fromDay;
        const phaseTo   = tos.length   > 0 ? Math.max(...tos)   : phase.toDay;
        return { ...phase, fromDay: phaseFrom, toDay: phaseTo, sprints: patchedSprints };
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

    // Snapshot des overrides à sauvegarder avant tout état-change
    const toSave = new Map(pendingOverrides);

    try {
      const sprintPayloads: SprintTimeDTO[] = [];

      for (const [sprintId, ov] of toSave.entries()) {
        const payload: SprintTimeDTO = {
          id: sprintId,
          fromDay: ov.fromDay,
          toDay: ov.toDay,
        };
        if (baseDate) {
          payload.dateDebut = addDays(baseDate, ov.fromDay - 1)
            .toISOString()
            .slice(0, 10);
          payload.dateFin = addDays(baseDate, ov.toDay - 1)
            .toISOString()
            .slice(0, 10);
        }
        sprintPayloads.push(payload);
      }

      await planningService.updateSprintTimes(sprintPayloads);

      // ─── FIX : on transfère pending → saved AVANT de vider pending ──────
      // Ainsi le Gantt conserve les positions correctes jusqu'à ce que le
      // parent ait rechargé les lots (et que savedOverrides soit nettoyé
      // par l'effet useEffect([lots]) ci-dessus).
      setSavedOverrides((prev) => {
        const n = new Map(prev);
        for (const [id, ov] of toSave.entries()) n.set(id, ov);
        return n;
      });
      // Vider seulement les pending qui ont été sauvegardés
      setPendingOverrides((prev) => {
        const n = new Map(prev);
        for (const id of toSave.keys()) n.delete(id);
        return n;
      });

      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStartDate = async () => {
    if (!selectedBacklogId || !startDateInput) return;
    setSavingDate(true);
    setSaveErr(null);
    try {
      await planningService.updateStartDate(selectedBacklogId, startDateInput);
      setEditingDate(false);
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur date de début.");
    } finally {
      setSavingDate(false);
    }
  };

  // ─── Effacement date de début ─────────────────────────────────────────────
  const handleClearStartDate = async () => {
    if (!selectedBacklogId) return;
    setSavingDate(true);
    setSaveErr(null);
    try {
      await planningService.updateStartDate(selectedBacklogId, null as any);
      setStartDateInput("");
      setConfirmClearDate(false);
      setEditingDate(false);
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur lors de la suppression de la date.");
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
            {baseDate
              ? `Sem. ${fmtDateShort(addDays(baseDate, w * DAYS_PER_WEEK))}`
              : `Sem. ${w + 1}`}
          </text>
        );
      }
      for (let d = 0; d < nCols; d++) {
        const dx = d * colW;
        const label = baseDate
          ? fmtDateShort(addDays(baseDate, d))
          : `J${d + 1}`;
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
      const isLive = row.kind === "sprint" && row.sprintId !== undefined &&
        liveOverrides.has(row.sprintId!);
      const isSel = selectedId === row.id;

      const bgFill = isSel
        ? "rgba(124,58,237,0.08)"
        : row.kind === "lot"
        ? COLOR.lotBg
        : row.kind === "phase"
        ? COLOR.phaseBg
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
        const barColor = isBeingDragged
          ? COLOR.sprintDrag
          : isPending
          ? COLOR.sprintAlt
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
              onMouseDown={(e) =>
                startDrag(e, row.sprintId!, "move", row.fromDay, row.toDay)
              }
            />
            {isPending && (
              <rect x={bx} y={bY} width={bw} height={bH} rx={3}
                fill="url(#pendingStripe)" style={{ pointerEvents: "none" }} />
            )}
            {bw > HANDLE_W * 2 + 6 && (
              <rect x={bx + bw - HANDLE_W} y={bY} width={HANDLE_W} height={bH}
                rx={2} fill="rgba(0,0,0,0.18)"
                style={{ cursor: "ew-resize" }}
                onMouseDown={(e) =>
                  startDrag(e, row.sprintId!, "resizeR", row.fromDay, row.toDay)
                }
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
        row.kind === "deliverable"
          ? "#fafafa"
          : isSel
          ? "rgba(124,58,237,0.08)"
          : row.kind === "lot"
          ? COLOR.lotBg
          : row.kind === "phase"
          ? COLOR.phaseBg
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
                    : row.kind === "sprint" ? 9.5
                    : 8.5,
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

  // ── Selected row detail ────────────────────────────────────────────────────
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

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      {/* ── Métriques ───────────────────────────────────────────────────────── */}
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
          Durée totale :{" "}
          <strong>
            {totalDays}j ({totalWeeks} sem.)
          </strong>
        </span>
        {baseDate && (
          <>
            <span className="text-muted">|</span>
            <span>
              <strong>{fmtDate(baseDate)}</strong>
              {totalDays > 0 && (
                <>
                  {" → "}
                  <strong>{fmtDate(addDays(baseDate, totalDays - 1))}</strong>
                </>
              )}
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
        className="d-flex align-items-center gap-3 px-3 py-2 mb-2 rounded flex-wrap"
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
                setConfirmClearDate(false);
                setStartDateInput(datedebutPlanning ?? "");
              }}
            >
              Annuler
            </button>
            {/* Bouton effacer date */}
            {!confirmClearDate ? (
              <button
                className="btn btn-sm btn-outline-danger"
                style={{ fontSize: "0.75rem", marginLeft: "auto" }}
                onClick={() => setConfirmClearDate(true)}
                disabled={savingDate}
                title="Supprimer la date de début (mode relatif J/S)"
              >
                ✕ Effacer la date
              </button>
            ) : (
              <div className="d-flex align-items-center gap-2 ms-auto">
                <span style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 600 }}>
                  Confirmer la suppression ?
                </span>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ fontSize: "0.72rem" }}
                  onClick={handleClearStartDate}
                  disabled={savingDate}
                >
                  {savingDate ? "…" : "Oui, effacer"}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: "0.72rem" }}
                  onClick={() => setConfirmClearDate(false)}
                  disabled={savingDate}
                >
                  Non
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <span style={{ color: baseDate ? COLOR.lotBar : "#94a3b8", fontWeight: 600 }}>
              {baseDate ? fmtDate(baseDate) : "Non définie (mode J/S relatif)"}
            </span>
            <button
              className="btn btn-sm btn-outline-secondary"
              style={{ fontSize: "0.72rem" }}
              onClick={() => { setEditingDate(true); setConfirmClearDate(false); }}
            >
              ✎ Modifier
            </button>
          </>
        )}
      </div>

      {saveOk && (
        <div className="alert alert-success py-2 mb-2 small">
          ✓ Planning sauvegardé avec succès.
        </div>
      )}
      {saveErr && (
        <div className="alert alert-danger py-2 mb-2 small">✗ {saveErr}</div>
      )}

      {/* ── Card principale ─────────────────────────────────────────────────── */}
      <div
        className="card shadow-sm mb-3"
        style={{
          border: hasPending
            ? `2px solid ${COLOR.sprintBar}`
            : "1px solid #dee2e6",
        }}
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
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: unit === u ? 700 : 400,
                    padding: "3px 10px",
                  }}
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
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: COLOR.sprintBar,
                    padding: "3px 12px",
                  }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        style={{ width: 10, height: 10 }}
                      />
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
          style={{
            background: "#f8fafc",
            borderBottom: "1px solid #dee2e6",
            fontSize: "0.74rem",
          }}
        >
          <LDot color={COLOR.lotBar} label="Lot" />
          <LDot color={COLOR.phaseBar} label="Phase (auto)" />
          <LDot color={COLOR.sprintBar} label="Sprint (déplaçable)" />
          <LDot color={COLOR.sprintAlt} label="Sprint modifié" />
          {showDeliverables && <LDot color={COLOR.delivLabel} label="Livrable" square />}
          {hasPending && (
            <span className="ms-auto" style={{ color: COLOR.sprintBar, fontWeight: 700 }}>
              ⚠ {pendingOverrides.size} modif. non sauvegardée
              {pendingOverrides.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Gantt layout ────────────────────────────────────────────────── */}
        {rows.length === 0 ? (
          <div className="text-center text-muted py-5">
            Aucun sprint. Ajoutez des lots, phases et sprints dans l'onglet Backlog.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: 580,
              position: "relative",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                position: "sticky",
                top: 0,
                zIndex: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              }}
            >
              <div
                style={{
                  width: LABEL_W,
                  flexShrink: 0,
                  height: HDR_H,
                  background: COLOR.headerBg,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "0 12px",
                  borderRight: `1.5px solid ${COLOR.gridMajor}`,
                }}
              >
                <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                  Lot / Phase / Sprint
                </div>
                {baseDate && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7.5, marginTop: 3 }}>
                    Début : {fmtDate(baseDate)}
                  </div>
                )}
                {!baseDate && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7.5, marginTop: 3 }}>
                    Mode relatif (J / S)
                  </div>
                )}
              </div>
              <div
                ref={headerScrollRef}
                style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}
              >
                <svg width={scrollW} height={HDR_H} style={{ display: "block" }}>
                  {renderHeaderSVG()}
                </svg>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Fixed labels */}
              <div
                style={{
                  width: LABEL_W,
                  flexShrink: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                  borderRight: `1.5px solid ${COLOR.gridMajor}`,
                }}
                onScroll={(e) => {
                  if (bodyScrollRef.current)
                    bodyScrollRef.current.scrollTop = (
                      e.target as HTMLElement
                    ).scrollTop;
                }}
              >
                <svg
                  width={LABEL_W}
                  height={svgBodyH}
                  style={{ display: "block", userSelect: "none" }}
                >
                  <defs>
                    <pattern
                      id="pendingStripe"
                      patternUnits="userSpaceOnUse"
                      width={8}
                      height={8}
                      patternTransform="rotate(45)"
                    >
                      <line
                        x1={0} y1={0} x2={0} y2={8}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth={4}
                      />
                    </pattern>
                  </defs>
                  {renderLabelsSVG()}
                </svg>
              </div>

              {/* Scrollable bars */}
              <div
                ref={bodyScrollRef}
                style={{
                  flex: 1,
                  overflowX: "auto",
                  overflowY: "auto",
                  maxHeight: 500,
                  cursor: dragState ? "grabbing" : "default",
                }}
              >
                <svg
                  width={scrollW}
                  height={svgBodyH}
                  style={{ display: "block", userSelect: "none" }}
                >
                  <defs>
                    <pattern
                      id="pendingStripe"
                      patternUnits="userSpaceOnUse"
                      width={8}
                      height={8}
                      patternTransform="rotate(45)"
                    >
                      <line
                        x1={0} y1={0} x2={0} y2={8}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth={4}
                      />
                    </pattern>
                  </defs>
                  <rect width={scrollW} height={svgBodyH} fill="#f8fbfc" />
                  {renderBodySVG()}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ── Détail sélection ─────────────────────────────────────────────── */}
        {selRow && selRow.kind === "sprint" && (
          <div
            style={{
              borderTop: `2px solid ${COLOR.sprintBar}`,
              background: "#f5f3ff",
            }}
          >
            <div
              className="d-flex align-items-center gap-3 flex-wrap px-3 py-2"
              style={{ fontSize: "0.8rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: COLOR.sprintBar,
                  }}
                />
                <strong style={{ color: COLOR.sprintBar }}>
                  {selRow.label}
                </strong>
              </div>
              <span>
                Durée :{" "}
                <strong>{selRow.toDay - selRow.fromDay + 1} jours</strong>
                {" "}(
                {((selRow.toDay - selRow.fromDay + 1) / DAYS_PER_WEEK).toFixed(1)}{" "}
                sem.)
              </span>
              {baseDate ? (
                <span style={{ color: COLOR.lotBar }}>
                  <strong>
                    {fmtDate(addDays(baseDate, selRow.fromDay - 1))}
                  </strong>
                  {" → "}
                  <strong>
                    {fmtDate(addDays(baseDate, selRow.toDay - 1))}
                  </strong>
                </span>
              ) : (
                <span style={{ color: "#64748b" }}>
                  J{selRow.fromDay} → J{selRow.toDay}
                </span>
              )}
              {pendingOverrides.has(selRow.sprintId!) && (
                <span style={{ color: COLOR.sprintBar, fontSize: "0.75rem" }}>
                  ⚠ Modifié — en attente de sauvegarde
                </span>
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
              <div
                className="px-3 pb-2"
                style={{ fontSize: "0.75rem", color: "#64748b" }}
              >
                <strong>Livrables :</strong>{" "}
                {selRow.deliverables.map((d) => d.name).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningTab;