import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";

import {
  BacklogLot,
  BacklogLine,
  BacklogLineProfil,
  BacklogDeliverable,
} from "../../../../types/lead/Backlog/Backlog.tsx";
import {
  BacklogPlanningService,
  UpsertPlanningRequest,
} from "../../../../services/lead/backlog/BacklogPlanningService.tsx";

// ─────────────────────────────────────────────────────────────
// CONSTANTES MÉTIER
// ─────────────────────────────────────────────────────────────
const HOURS_PER_DAY   = 8;
const DAYS_PER_WEEK   = 5;
const WEEKS_PER_MONTH = 4;
const HOURS_PER_WEEK  = HOURS_PER_DAY * DAYS_PER_WEEK;    // 40
const HOURS_PER_MONTH = HOURS_PER_WEEK * WEEKS_PER_MONTH;  // 160

// ─────────────────────────────────────────────────────────────
// CONSTANTES VISUELLES
// ─────────────────────────────────────────────────────────────
type TimeUnit = "hour" | "day" | "week" | "month";

const COL_PX: Record<TimeUnit, number> = {
  hour: 18, day: 32, week: 64, month: 120,
};

const ROW_H    = 38;
const LABEL_W  = 230;
const HDR_H    = 56;
const MIN_BAR  = 4;
const HANDLE_W = 8;

const COLOR = {
  lotBar:      "#1a6b38",
  phaseAuto:   "#28a745",
  phaseManual: "#7b3fbe",
  delivAuto:   "#6ec997",
  delivManual: "#a67ce0",
  ghost:       "#c8e6c9",
  lotBg:       "#f0f7f1",
  phaseBg:     "#fafffe",
  selectedBg:  "#f0e8ff",
  grid:        "#e4eae4",
  gridMajor:   "#c5d5c5",
  headerBg:    "#1a6b38",
  headerSub:   "#2e7d52",
  headerText:  "#ffffff",
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface PhaseOverride {
  heures: number;
}

interface GRow {
  id:           string;
  kind:         "lot" | "phase" | "deliverable";
  label:        string;
  phaseId?:     number;
  delivId?:     number;
  lotId?:       number;
  startH:       number;
  endH:         number;
  autoStartH:   number;
  autoEndH:     number;
  isOverridden: boolean;
  color:        string;
  depth:        number;
  totalJH:      number;
}

// ─────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────
interface PlanningTabProps {
  lots:              BacklogLot[];
  lines:             BacklogLine[];
  lineProfils:       BacklogLineProfil[];
  deliverables:      Map<number, BacklogDeliverable[]>;
  selectedBacklogId: number | null;
  planningService:   BacklogPlanningService;
  initialOverrides?: Map<string, { heures: number }>;
}

// ─────────────────────────────────────────────────────────────
// HELPERS PURS
// ─────────────────────────────────────────────────────────────
const safeNum = (v: number, fallback = 0): number =>
  isFinite(v) ? v : fallback;

const jhToH = (jh: number, profils: number): number =>
  Math.max(
    HOURS_PER_DAY,
    safeNum((jh / Math.max(1, profils)) * HOURS_PER_DAY, HOURS_PER_DAY),
  );

const unitH = (u: TimeUnit): number =>
  u === "hour" ? 1
  : u === "day"   ? HOURS_PER_DAY
  : u === "week"  ? HOURS_PER_WEEK
  : HOURS_PER_MONTH;

const snap = (h: number, u: TimeUnit): number => {
  const uh = unitH(u);
  return Math.max(uh, Math.round(safeNum(h, uh) / uh) * uh);
};

const fmtDuration = (hours: number): string => {
  const h = safeNum(hours, 0);
  if (h < HOURS_PER_DAY)   return `${h}h`;
  if (h < HOURS_PER_WEEK)  return `${(h / HOURS_PER_DAY).toFixed(1)}j`;
  if (h < HOURS_PER_MONTH) return `${(h / HOURS_PER_WEEK).toFixed(1)} sem.`;
  return `${(h / HOURS_PER_MONTH).toFixed(1)} mois`;
};

const majorLabel = (u: TimeUnit, gi: number): string =>
  u === "hour"  ? `Jour ${gi + 1}`
  : u === "day"   ? `Semaine ${gi + 1}`
  : u === "week"  ? `Mois ${gi + 1}`
  : `Trimestre ${gi + 1}`;

const minorLabel = (u: TimeUnit, i: number): string =>
  u === "hour" ? `H${i + 1}` : u === "day" ? `J${i + 1}`
  : u === "week" ? `S${i + 1}` : `M${i + 1}`;

const minorPerMajor = (u: TimeUnit): number =>
  u === "hour" ? HOURS_PER_DAY : u === "day" ? DAYS_PER_WEEK
  : u === "week" ? WEEKS_PER_MONTH : 3;

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
const PlanningTab: React.FC<PlanningTabProps> = ({
  lots,
  lines,
  lineProfils,
  deliverables,
  selectedBacklogId,
  planningService,
  initialOverrides,
}) => {
  const [unit, setUnit] = useState<TimeUnit>("week");

  // Initialisation depuis initialOverrides (pré-chargé par BacklogModal)
  const [overrides, setOverrides] = useState<Map<string, PhaseOverride>>(
    () => initialOverrides ? new Map(initialOverrides) : new Map()
  );
  const [pending,    setPending]   = useState<Map<string, PhaseOverride>>(new Map());
  const [loadingOv,  setLoadingOv] = useState(false);
  const [saving,     setSaving]    = useState(false);
  const [saveOk,     setSaveOk]    = useState(false);
  const [saveErr,    setSaveErr]   = useState<string | null>(null);
  const [showGhosts, setShowGhosts]= useState(true);
  const [collapsed,  setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId]= useState<string | null>(null);

  const [drag, setDrag] = useState<{
    rowId: string; type: "move" | "resizeL" | "resizeR";
    startX: number; origStart: number; origEnd: number;
  } | null>(null);
  const [liveOv, setLiveOv] = useState<{ rowId: string; h: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!selectedBacklogId) return;

    const loadPlanning = async () => {
      setLoadingOv(true);

      try {
        const exists = await planningService.hasPlanning(selectedBacklogId);

        if (exists) {
          const entries = await planningService.getByBacklogId(selectedBacklogId);

          const map = new Map<string, PhaseOverride>();
          entries.forEach(e => {
            const heures = (e as any).heures ?? (e as any).heure;
            map.set(`phase-${e.phaseId}`, { heures });
          });

          setOverrides(map);
          console.log("Overrides chargés depuis BDD", map);
        } else {
          // Aucun planning → mode auto JH
          setOverrides(new Map());
          console.log("Aucun planning BDD → calcul auto JH");
        }

        setPending(new Map());
      } catch (e) {
        console.error("Erreur chargement planning", e);
        setOverrides(new Map());
      } finally {
        setLoadingOv(false);
      }
    };

    loadPlanning();
  }, [selectedBacklogId]);

  // ── Nombre de profils actifs ──────────────────────────────
  const activeProfilCount = useMemo(() => {
    const ids = new Set(lineProfils.filter(lp => lp.volume > 0).map(lp => lp.profil.id));
    return Math.max(1, ids.size);
  }, [lineProfils]);

  // ── JH helper ─────────────────────────────────────────────
  const getJH = useCallback(
    (lineIds: number[]) =>
      lineProfils
        .filter(lp => lineIds.includes(lp.lineId))
        .reduce((s, lp) => s + lp.volume, 0),
    [lineProfils],
  );

  const getAutoH = useCallback(
    (phaseId: number): number => {
      const lineIds = lines.filter(l => l.phaseId === phaseId).map(l => l.id);
      const jh = getJH(lineIds);
      return jhToH(jh, activeProfilCount);
    },
    [lines, getJH, activeProfilCount],
  );

  const getEffH = useCallback(
    (key: string, autoH: number): number => {
      if (liveOv?.rowId === key && isFinite(liveOv.h) && liveOv.h > 0)
        return Math.max(HOURS_PER_DAY, liveOv.h);
      const pend = pending.get(key);
      if (pend && isFinite(pend.heures) && pend.heures > 0)
        return Math.max(HOURS_PER_DAY, pend.heures);
      const saved = overrides.get(key);
      if (saved && isFinite(saved.heures) && saved.heures > 0)
        return Math.max(HOURS_PER_DAY, saved.heures);
      return isFinite(autoH) && autoH > 0 ? autoH : HOURS_PER_DAY;
    },
    [liveOv, pending, overrides],
  );

  const hasOverride = useCallback(
    (key: string): boolean => overrides.has(key) || pending.has(key),
    [overrides, pending],
  );

  // ─────────────────────────────────────────────────────────
  // CONSTRUCTION DES LIGNES GANTT
  // ─────────────────────────────────────────────────────────
  const rows = useMemo((): GRow[] => {
    const result: GRow[] = [];
    let globalCursor = 0;

    lots.forEach(lot => {
      const phases = [...(lot.phases || [])].sort((a, b) => a.order - b.order);
      const lotStart = globalCursor;
      const childRows: GRow[] = [];
      let phaseCursor = globalCursor;

      phases.forEach(phase => {
        const pKey  = `phase-${phase.id}`;
        const autoH = getAutoH(phase.id);
        const effH  = getEffH(pKey, autoH);
        const isOv  = hasOverride(pKey);

        const phStart = phaseCursor;
        const phEnd   = phStart + effH;

        childRows.push({
          id:           pKey,
          kind:         "phase",
          label:        phase.name,
          phaseId:      phase.id,
          lotId:        lot.id,
          startH:       phStart,
          endH:         phEnd,
          autoStartH:   phStart,
          autoEndH:     phStart + autoH,
          isOverridden: isOv,
          color:        isOv ? COLOR.phaseManual : COLOR.phaseAuto,
          depth:        1,
          totalJH:      getJH(lines.filter(l => l.phaseId === phase.id).map(l => l.id)),
        });

        const delivs = (deliverables.get(phase.id) || [])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        if (delivs.length > 0) {
          const effHEach  = effH  / delivs.length;
          const autoHEach = autoH / delivs.length;
          let dCursor = phStart;

          delivs.forEach(d => {
            const dKey = `deliv-${d.id}`;
            childRows.push({
              id:           dKey,
              kind:         "deliverable",
              label:        d.name,
              delivId:      d.id,
              phaseId:      phase.id,
              lotId:        lot.id,
              startH:       dCursor,
              endH:         dCursor + effHEach,
              autoStartH:   dCursor,
              autoEndH:     dCursor + autoHEach,
              isOverridden: isOv,
              color:        isOv ? COLOR.delivManual : COLOR.delivAuto,
              depth:        2,
              totalJH:      childRows
                .find(r => r.phaseId === phase.id && r.kind === "phase")
                ?.totalJH ?? 0 / delivs.length,
            });
            dCursor += effHEach;
          });
        }

        phaseCursor = phEnd;
      });

      result.push({
        id:           `lot-${lot.id}`,
        kind:         "lot",
        label:        lot.name,
        lotId:        lot.id,
        startH:       lotStart,
        endH:         phaseCursor,
        autoStartH:   lotStart,
        autoEndH:     phaseCursor,
        isOverridden: false,
        color:        COLOR.lotBar,
        depth:        0,
        totalJH:      childRows
          .filter(r => r.kind === "phase")
          .reduce((s, r) => s + r.totalJH, 0),
      });

      if (!collapsed.has(`lot-${lot.id}`)) result.push(...childRows);
      globalCursor = phaseCursor;
    });

    return result;
  }, [lots, lines, getJH, getAutoH, getEffH, hasOverride, deliverables, collapsed]);

  // ── Métriques ─────────────────────────────────────────────
  const totalHours = rows
    .filter(r => r.kind === "lot")
    .reduce((s, r) => s + safeNum(r.endH - r.startH), 0);
  const maxH = Math.max(...rows.map(r => safeNum(r.endH)), 1);

  // ── Dimensions SVG ────────────────────────────────────────
  const colW  = COL_PX[unit];
  const colH  = unitH(unit);
  const mPM   = minorPerMajor(unit);
  const nCols = Math.ceil(safeNum(maxH / colH, 1)) + 2;
  const svgW  = LABEL_W + nCols * colW;
  const svgH  = HDR_H + Math.max(1, rows.length) * ROW_H;

  const getBx = (h: number): number => {
    const v = LABEL_W + safeNum(h / colH, 0) * colW;
    return isFinite(v) ? v : LABEL_W;
  };
  const getBw = (s: number, e: number): number => {
    const v = safeNum((e - s) / colH, 0) * colW;
    return Math.max(MIN_BAR, isFinite(v) ? v : MIN_BAR);
  };

  // ── Drag ──────────────────────────────────────────────────
  const pxToH = useCallback(
    (px: number) => safeNum((px / colW) * colH, 0),
    [colW, colH],
  );

  const startDrag = useCallback((
    e: React.MouseEvent, rowId: string,
    type: "move" | "resizeL" | "resizeR",
    startH: number, endH: number,
  ) => {
    e.preventDefault(); e.stopPropagation();
    setDrag({ rowId, type, startX: e.clientX, origStart: startH, origEnd: endH });
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dH  = pxToH(e.clientX - drag.startX);
      const min = unitH(unit);
      const dur = drag.origEnd - drag.origStart;
      let newH = drag.type === "resizeR"
        ? Math.max(min, safeNum(dur + dH, min))
        : drag.type === "resizeL"
          ? Math.max(min, safeNum(dur - dH, min))
          : safeNum(dur, min);
      const snapped = snap(newH, unit);
      if (isFinite(snapped) && snapped > 0)
        setLiveOv({ rowId: drag.rowId, h: snapped });
    };
    const onUp = () => {
      if (liveOv && isFinite(liveOv.h) && liveOv.h > 0) {
        setPending(prev => { const n = new Map(prev); n.set(liveOv.rowId, { heures: liveOv.h }); return n; });
        setLiveOv(null);
      }
      setDrag(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [drag, liveOv, pxToH, unit]);

  // ── Clavier ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "+", "-"].includes(e.key)) return;
      e.preventDefault();
      const row = rows.find(r => r.id === selectedId);
      if (!row || row.kind === "lot") return;
      const step = unitH(unit);
      const curH = safeNum(row.endH - row.startH, step);
      const newH = (e.key === "ArrowRight" || e.key === "+")
        ? curH + step : Math.max(step, curH - step);
      if (isFinite(newH) && newH > 0)
        setPending(prev => { const n = new Map(prev); n.set(selectedId, { heures: newH }); return n; });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, rows, unit]);

  // ─────────────────────────────────────────────────────────
  // SAUVEGARDE — SNAPSHOT COMPLET
  // ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (pending.size === 0) return;
    setSaving(true);
    setSaveErr(null);
    setSaveOk(false);

    try {
      const allPhases: { phaseId: number; key: string; autoH: number }[] = [];
      lots.forEach(lot => {
        (lot.phases || []).forEach(phase => {
          allPhases.push({
            phaseId: phase.id,
            key:     `phase-${phase.id}`,
            autoH:   getAutoH(phase.id),
          });
        });
      });

      const snapshot = new Map<string, PhaseOverride>();
      const entries: UpsertPlanningRequest[] = [];

      allPhases.forEach(({ phaseId, key, autoH }) => {
        const pend  = pending.get(key);
        const saved = overrides.get(key);
        const heures = pend?.heures ?? saved?.heures ?? autoH;
        const finalH = Math.max(HOURS_PER_DAY, isFinite(heures) ? heures : autoH);

        snapshot.set(key, { heures: finalH });
        entries.push({ phaseId, heures: finalH, startDate: null });
      });

      if (entries.length > 0) await planningService.bulkUpsert(entries);
      console.log("Planning sauvegardé avec succès :", entries);
      setOverrides(snapshot);
      setPending(new Map());
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err: any) {
      setSaveErr(err?.message ?? "Erreur de sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    const m = key.match(/^phase-(\d+)$/);
    if (m) {
      try { await planningService.deleteByPhaseId(Number(m[1])); } catch { /* ignore */ }
    }
    setOverrides(p => { const n = new Map(p); n.delete(key); return n; });
    setPending(p  => { const n = new Map(p); n.delete(key); return n; });
    if (selectedId === key) setSelectedId(null);
  };

  const allModified   = new Set([...overrides.keys(), ...pending.keys()]);
  const modifiedCount = allModified.size;

  // ─────────────────────────────────────────────────────────
  // Rendu conditionnel
  // ─────────────────────────────────────────────────────────
  if (!selectedBacklogId) {
    return (
      <div className="text-center text-muted py-5">
        Veuillez sélectionner un backlog pour voir le planning prévisionnel.
      </div>
    );
  }
  if (loadingOv) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <span className="spinner-border spinner-border-sm me-2" />
        Chargement du planning…
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDU SVG
  // ─────────────────────────────────────────────────────────
  const renderHeader = () => {
    const elems: React.ReactNode[] = [];
    const nGroups = Math.ceil(nCols / mPM);
    for (let g = 0; g < nGroups; g++) {
      const gx = LABEL_W + g * mPM * colW;
      const gw = Math.min(mPM, nCols - g * mPM) * colW;
      if (!isFinite(gx) || gw <= 0) continue;
      elems.push(
        <rect key={`gh-${g}`} x={gx} y={0} width={gw} height={26}
          fill={g % 2 === 0 ? COLOR.headerBg : COLOR.headerSub} />,
        <text key={`gt-${g}`} x={gx + gw / 2} y={17}
          textAnchor="middle" fill={COLOR.headerText}
          fontSize={10} fontWeight={700} fontFamily="inherit">
          {majorLabel(unit, g)}
        </text>,
      );
    }
    for (let i = 0; i < nCols; i++) {
      const cx = LABEL_W + i * colW;
      if (!isFinite(cx)) continue;
      elems.push(
        <rect key={`sh-${i}`} x={cx} y={26} width={colW} height={30}
          fill={i % 2 === 0 ? "#f0f7f0" : "#e4f0e4"}
          stroke={COLOR.grid} strokeWidth={0.5} />,
        <text key={`st-${i}`} x={cx + colW / 2} y={46}
          textAnchor="middle" fill="#3a5c3a" fontSize={9} fontFamily="inherit">
          {minorLabel(unit, i)}
        </text>,
      );
    }
    elems.push(
      <line key="hdr-sep" x1={0} y1={HDR_H} x2={svgW} y2={HDR_H} stroke={COLOR.gridMajor} strokeWidth={1.5} />,
      <rect key="lbl-hdr" x={0} y={0} width={LABEL_W} height={HDR_H} fill={COLOR.headerBg} />,
      <text key="lbl-hdr-t" x={12} y={HDR_H / 2 + 5} fill={COLOR.headerText} fontSize={11} fontWeight={700} fontFamily="inherit">
        Lot / Phase / Livrable
      </text>,
      <line key="lbl-sep" x1={LABEL_W} y1={0} x2={LABEL_W} y2={svgH} stroke={COLOR.gridMajor} strokeWidth={1.5} />,
    );
    return elems;
  };

  const renderGrid = () => {
    const elems: React.ReactNode[] = [];
    for (let i = 0; i <= nCols; i++) {
      const x = LABEL_W + i * colW;
      if (!isFinite(x)) continue;
      const isMajor = i % mPM === 0;
      elems.push(
        <line key={`vg-${i}`} x1={x} y1={HDR_H} x2={x} y2={svgH}
          stroke={isMajor ? COLOR.gridMajor : COLOR.grid}
          strokeWidth={isMajor ? 1 : 0.5} />,
      );
    }
    rows.forEach((_, ri) => {
      const y = HDR_H + ri * ROW_H;
      elems.push(<line key={`hg-${ri}`} x1={0} y1={y} x2={svgW} y2={y} stroke={COLOR.grid} strokeWidth={0.5} />);
    });
    return elems;
  };

  const renderRows = () =>
    rows.map((row, ri) => {
      const y    = HDR_H + ri * ROW_H;
      const cy   = y + ROW_H / 2;
      const bx   = getBx(row.startH);
      const bw   = getBw(row.startH, row.endH);
      const br   = row.kind === "lot" ? 5 : row.kind === "phase" ? 4 : 3;
      const barH = row.kind === "lot" ? 5 : row.kind === "phase" ? ROW_H * 0.65 : ROW_H * 0.5;
      const barY = cy - barH / 2;

      const isSelected = selectedId === row.id;
      const isPending  = pending.has(row.id);
      const isSavedOv  = overrides.has(row.id) && !isPending;
      const isOv       = row.isOverridden;
      const isLive     = liveOv?.rowId === row.id;

      let barColor = row.color;
      if (isLive) barColor = row.kind === "deliverable" ? "#4a9c4a" : "#5a2d8c";

      const rowFill = isSelected ? COLOR.selectedBg
        : row.kind === "lot"  ? COLOR.lotBg
        : isOv                ? "#f8f2ff"
        : COLOR.phaseBg;

      return (
        <g key={row.id} onClick={() => setSelectedId(isSelected ? null : row.id)}>
          <rect x={0} y={y} width={svgW} height={ROW_H} fill={rowFill} style={{ cursor: "pointer" }} />

          <foreignObject x={0} y={y} width={LABEL_W} height={ROW_H}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{
              height: ROW_H, display: "flex", alignItems: "center",
              paddingLeft: 8 + row.depth * 14, paddingRight: 6, gap: 4,
              overflow: "hidden", boxSizing: "border-box",
              cursor: row.kind === "lot" ? "pointer" : "default",
            }} onClick={e => {
              e.stopPropagation();
              if (row.kind === "lot")
                setCollapsed(prev => { const n = new Set(prev); n.has(row.id) ? n.delete(row.id) : n.add(row.id); return n; });
            }}>
              {row.kind === "lot" && (
                <span style={{ fontSize: 9, color: "#666", flexShrink: 0, width: 10 }}>
                  {collapsed.has(row.id) ? "▸" : "▾"}
                </span>
              )}
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: barColor, flexShrink: 0 }} />
              <span style={{
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontSize: row.kind === "lot" ? 11.5 : row.kind === "phase" ? 10.5 : 9.5,
                fontWeight: row.kind === "lot" ? 700 : row.kind === "phase" ? 600 : 400,
                fontStyle: row.kind === "deliverable" ? "italic" : "normal",
                color: row.kind === "lot" ? COLOR.lotBar : isOv ? COLOR.phaseManual : "#2d3748",
              }} title={row.label}>
                {row.label}
              </span>

              {isPending && (
                <span title="Non sauvegardé" style={{ fontSize: 7, color: COLOR.phaseManual, flexShrink: 0 }}>●</span>
              )}
              {isSavedOv && row.kind !== "lot" && (
                <span title="Sauvegardé — cliquer pour réinitialiser"
                  style={{ fontSize: 9, color: "#aaa", cursor: "pointer", flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); handleReset(row.id); }}>
                  ↺
                </span>
              )}
              {row.totalJH > 0 && (
                <span style={{ fontSize: 8.5, color: "#999", flexShrink: 0 }}>
                  {row.totalJH.toFixed(1)}JH
                </span>
              )}
            </div>
          </foreignObject>

          {showGhosts && isOv && row.kind !== "lot" && (() => {
            const gx = getBx(row.autoStartH);
            const gw = getBw(row.autoStartH, row.autoEndH);
            return <rect x={gx} y={cy - (barH * 0.45) / 2} width={gw} height={barH * 0.45}
              rx={br} fill={COLOR.ghost} opacity={0.8} />;
          })()}

          {row.kind === "lot" && (
            <rect x={bx} y={cy - 2.5} width={bw} height={5} rx={2} fill={COLOR.lotBar} opacity={0.7} />
          )}

          {row.kind !== "lot" && (
            <>
              {isSelected && <rect x={bx - 2} y={barY - 2} width={bw + 4} height={barH + 4} rx={br + 1} fill="rgba(123,63,190,0.18)" />}
              <rect x={bx} y={barY} width={bw} height={barH} rx={br} fill={barColor}
                opacity={isLive ? 0.8 : 1} style={{ cursor: drag ? "grabbing" : "grab" }}
                onMouseDown={e => startDrag(e, row.id, "move", row.startH, row.endH)} />
              {isPending && (
                <rect x={bx} y={barY} width={bw} height={barH} rx={br}
                  fill="url(#pendingStripe)" style={{ pointerEvents: "none" }} />
              )}
              {bw > HANDLE_W * 2 + 4 && (
                <>
                  <rect x={bx} y={barY} width={HANDLE_W} height={barH} rx={br}
                    fill="rgba(0,0,0,0.22)" style={{ cursor: "ew-resize" }}
                    onMouseDown={e => startDrag(e, row.id, "resizeL", row.startH, row.endH)} />
                  <rect x={bx + bw - HANDLE_W} y={barY} width={HANDLE_W} height={barH} rx={br}
                    fill="rgba(0,0,0,0.22)" style={{ cursor: "ew-resize" }}
                    onMouseDown={e => startDrag(e, row.id, "resizeR", row.startH, row.endH)} />
                </>
              )}
              {bw > 52 && (
                <text x={bx + bw / 2} y={cy + 3.5} textAnchor="middle" fill="#fff"
                  fontSize={8.5} fontWeight={700} fontFamily="inherit"
                  style={{ pointerEvents: "none", userSelect: "none" }}>
                  {fmtDuration(row.endH - row.startH)}
                </text>
              )}
            </>
          )}

          {isLive && liveOv && (
            <>
              <rect x={bx} y={barY - 22} width={96} height={19} rx={4} fill={COLOR.phaseManual} opacity={0.95} />
              <text x={bx + 48} y={barY - 9} textAnchor="middle" fill="#fff"
                fontSize={9.5} fontWeight={700} fontFamily="inherit">
                {fmtDuration(liveOv.h)} ⟷
              </text>
            </>
          )}
        </g>
      );
    });

  const selectedRow = selectedId ? rows.find(r => r.id === selectedId) : null;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>

      <div className="d-flex align-items-center gap-3 flex-wrap px-3 py-2 mb-3 rounded"
        style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", fontSize: "0.82rem" }}>
        <strong style={{ color: COLOR.lotBar }}>
          {activeProfilCount} profil{activeProfilCount > 1 ? "s" : ""} actif{activeProfilCount > 1 ? "s" : ""}
        </strong>
        <span className="text-muted">|</span>
        <span>Durée totale : <strong>{fmtDuration(totalHours)}</strong></span>
        <span className="text-muted">|</span>
        <span>{(totalHours / HOURS_PER_WEEK).toFixed(1)} sem. · {(totalHours / HOURS_PER_MONTH).toFixed(1)} mois</span>
        {modifiedCount > 0 && (
          <>
            <span className="text-muted">|</span>
            <span style={{ color: COLOR.phaseManual, fontWeight: 700 }}>
              {modifiedCount} phase{modifiedCount > 1 ? "s" : ""} modifiée 
            </span>
          </>
        )}
        <small className="ms-auto text-muted">◁▷ Resize · ←→ ou +/- pour ajuster</small>
      </div>

      {saveOk  && <div className="alert alert-success py-2 mb-2 small">✓ Snapshot complet sauvegardé dans backlog_planning.</div>}
      {saveErr && <div className="alert alert-danger  py-2 mb-2 small">✗ {saveErr}</div>}

      <div className="card shadow-sm mb-3"
        style={{ border: pending.size > 0 ? `2px solid ${COLOR.phaseManual}` : "1px solid #dee2e6" }}>

        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: COLOR.lotBar, padding: "10px 16px" }}>
          <div>
            <h5 className="mb-0" style={{ color: "#fff", fontSize: "1rem" }}>Planning Prévisionnel</h5>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {(["hour", "day", "week", "month"] as TimeUnit[]).map(u => (
                <button key={u} type="button"
                  className={`btn ${unit === u ? "btn-light" : "btn-outline-light"}`}
                  style={{ fontSize: "0.72rem", fontWeight: unit === u ? 700 : 400, padding: "3px 8px" }}
                  onClick={() => setUnit(u)}>
                  {u === "hour" ? "H" : u === "day" ? "Jour" : u === "week" ? "Sem." : "Mois"}
                </button>
              ))}
            </div>
            <button type="button"
              className={`btn btn-sm ${showGhosts ? "btn-light" : "btn-outline-light"}`}
              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
              onClick={() => setShowGhosts(v => !v)}
              title="Afficher/masquer la durée automatique (JH backlog)">
              Orig.
            </button>
            {pending.size > 0 && (
              <>
                <button className="btn btn-sm btn-outline-light"
                  style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                  onClick={() => setPending(new Map())} disabled={saving}>
                  Annuler
                </button>
                <button className="btn btn-sm btn-light"
                  style={{ fontSize: "0.72rem", fontWeight: 700, color: COLOR.phaseManual, padding: "3px 10px" }}
                  onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }} />…</>
                    : `✓ Valider (${pending.size} modif.)`}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="d-flex gap-3 flex-wrap align-items-center px-3 py-2"
          style={{ background: "#f4faf4", borderBottom: "1px solid #dee2e6", fontSize: "0.74rem" }}>
          <LDot color={COLOR.phaseAuto}   label="Planning calculé automatiquement à partir du backlog" />
          <LDot color={COLOR.phaseManual} label="Planning modifié manuellement" />
          <LDot color={COLOR.delivAuto}   label="Livrable par phase" />
          <LDot color={COLOR.ghost}       label="Ancien planning calculé automatiquement à partir du backlog" />
          {pending.size > 0 && (
            <span className="ms-auto" style={{ color: COLOR.phaseManual, fontWeight: 700 }}>
              ⚠ {pending.size} modif. non sauvegardée{pending.size > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="card-body p-0" style={{ overflowX: "auto", overflowY: "auto", maxHeight: 480 }}>
          {rows.length === 0 ? (
            <div className="text-center text-muted py-5">
              Aucune phase. Ajoutez des lots et phases dans l'onglet Backlog.
            </div>
          ) : (
            <svg ref={svgRef} width={svgW} height={svgH}
              style={{ display: "block", userSelect: "none", cursor: drag ? "grabbing" : "default" }}>
              <defs>
                <pattern id="pendingStripe" patternUnits="userSpaceOnUse" width={8} height={8} patternTransform="rotate(45)">
                  <line x1={0} y1={0} x2={0} y2={8} stroke="rgba(255,255,255,0.25)" strokeWidth={4} />
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="#f8fbf8" />
              {renderGrid()}
              {renderHeader()}
              {renderRows()}
            </svg>
          )}
        </div>

        {selectedRow && selectedRow.kind !== "lot" && (
          <div className="d-flex align-items-center gap-4 flex-wrap px-3 py-2"
            style={{ borderTop: `2px solid ${COLOR.phaseManual}`, background: "#f5f0ff", fontSize: "0.8rem" }}>
            <strong style={{ color: COLOR.phaseManual }}>
              {selectedRow.kind === "deliverable" ? "• " : ""}{selectedRow.label}
            </strong>
            <span>Durée : <strong>{fmtDuration(selectedRow.endH - selectedRow.startH)}</strong></span>
            <span className="text-muted">
              Auto (JH) : {fmtDuration(selectedRow.autoEndH - selectedRow.autoStartH)}
            </span>
            <span className="text-muted">JH : {selectedRow.totalJH.toFixed(1)}</span>
            <span className="text-muted" style={{ fontSize: "0.72rem" }}>
              ←→ ou +/- pour ajuster d'une {unit === "hour" ? "heure" : unit === "day" ? "journée" : unit === "week" ? "semaine" : "mois"}
            </span>
            {(selectedRow.isOverridden || pending.has(selectedRow.id)) && (
              <button className="btn btn-sm btn-outline-danger ms-auto"
                style={{ fontSize: "0.72rem" }}
                onClick={() => handleReset(selectedRow.id)}>
                ↺ Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="d-flex align-items-center gap-1">
    <div style={{ width: 10, height: 10, background: color, borderRadius: 2, flexShrink: 0 }} />
    <span className="text-muted">{label}</span>
  </div>
);

export default PlanningTab;