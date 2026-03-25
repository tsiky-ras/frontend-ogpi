import React, { useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { FaChartLine, FaSpinner, FaExclamationTriangle, FaSearch } from "react-icons/fa";
import type { BacklogLot, BacklogPhase } from "../../../../types/lead/Backlog/Backlog.tsx";
import type { BacklogSprint } from "../../../../types/projet/backlog/BacklogProjet.tsx";
import { BurndownPoint, BurndownService } from "../../../../services/projet/backlog/BurndownService.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BurndownTabProps {
  lots: BacklogLot[];
  sprints: Map<number, BacklogSprint[]>;
  service: BurndownService;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
};

// Coupe la série actualValue dès le premier null pour ne pas tracer de segment
const buildChartData = (points: BurndownPoint[]) => {
  let pastNull = false;
  return points.map((p) => {
    if (p.actualValue === null) pastNull = true;
    return {
      date: fmtDate(p.date),
      rawDate: p.date,
      idealValue: p.idealValue,
      actualValue: pastNull ? undefined : p.actualValue,
    };
  });
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: "0.78rem",
      color: "#e2e8f0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#94a3b8" }}>{label}</div>
      {payload.map((entry: any) => (
        entry.value !== undefined && (
          <div key={entry.dataKey} style={{ color: entry.color, fontWeight: 600 }}>
            {entry.name} : {typeof entry.value === "number" ? entry.value.toFixed(2) : "—"} JH
          </div>
        )
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const BurndownTab: React.FC<BurndownTabProps> = ({ lots, sprints, service }) => {
  const [selectedLotId,    setSelectedLotId]    = useState<number | null>(null);
  const [selectedPhaseId,  setSelectedPhaseId]  = useState<number | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);

  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [data,    setData]      = useState<BurndownPoint[] | null>(null);

  // ─── Cascading selectors ──────────────────────────────────────────────────
  const selectedLot    = lots.find(l => l.id === selectedLotId) ?? null;
  const allPhases      = (selectedLot?.phases ?? []) as BacklogPhase[];
  const selectedPhase  = allPhases.find(p => p.id === selectedPhaseId) ?? null;
  const phaseSprints   = selectedPhase ? (sprints.get(selectedPhase.id) ?? []) : [];
  const selectedSprint = phaseSprints.find(s => s.id === selectedSprintId) ?? null;

  const handleLotChange = (lotId: number | null) => {
    setSelectedLotId(lotId);
    setSelectedPhaseId(null);
    setSelectedSprintId(null);
    setData(null);
    setError(null);
  };

  const handlePhaseChange = (phaseId: number | null) => {
    setSelectedPhaseId(phaseId);
    setSelectedSprintId(null);
    setData(null);
    setError(null);
  };

  const handleSprintChange = (sprintId: number | null) => {
    setSelectedSprintId(sprintId);
    setData(null);
    setError(null);
  };

  // ─── Fetch burndown ───────────────────────────────────────────────────────
  const fetchBurndown = useCallback(async () => {
    if (!selectedSprintId) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await service.getBurndownBySprint(selectedSprintId);
      if (!result || result.length === 0) {
        setError("Aucune donnée disponible pour ce sprint.");
      } else {
        setData(result);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data && typeof e.response.data === "string"
          ? e.response.data
          : e?.message ?? "Erreur lors de la récupération du burndown.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId, service]);

  // ─── Chart data ───────────────────────────────────────────────────────────
  const chartData = data ? buildChartData(data) : [];
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  // ─── Sprint metadata ──────────────────────────────────────────────────────
  const sprintStart = data?.[0]?.date;
  const sprintEnd   = data?.[data.length - 1]?.date;
  const totalJH     = data?.[0]?.idealValue ?? 0;
  const lastActual  = data
    ? [...data].reverse().find(p => p.actualValue !== null)?.actualValue ?? null
    : null;

  // ─── Select style helper ──────────────────────────────────────────────────
  const selectStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #dee2e6",
    fontSize: "0.85rem",
    backgroundColor: "#fff",
    color: "#212529",
    cursor: "pointer",
    outline: "none",
    appearance: "auto",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#6c757d",
    marginBottom: 4,
  };

  return (
    <div style={{ padding: "4px 0" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FaChartLine color="#fff" size={16} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>Burndown Chart</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Sélectionnez un sprint pour visualiser son avancement</div>
        </div>
      </div>

      {/* ── Sélecteurs ── */}
      <div style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "16px 20px",
        marginBottom: 20,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>

          {/* Lot */}
          <div>
            <label style={labelStyle}>Lot</label>
            <select
              style={selectStyle}
              value={selectedLotId ?? ""}
              onChange={e => handleLotChange(e.target.value ? +e.target.value : null)}
            >
              <option value="">— Choisir un lot —</option>
              {lots.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Phase */}
          <div>
            <label style={labelStyle}>Phase</label>
            <select
              style={{ ...selectStyle, opacity: !selectedLotId ? 0.5 : 1 }}
              value={selectedPhaseId ?? ""}
              onChange={e => handlePhaseChange(e.target.value ? +e.target.value : null)}
              disabled={!selectedLotId}
            >
              <option value="">— Choisir une phase —</option>
              {allPhases.sort((a, b) => a.order - b.order).map(p => (
                <option key={p.id} value={p.id}>{p.order}. {p.name}</option>
              ))}
            </select>
          </div>

          {/* Sprint */}
          <div>
            <label style={labelStyle}>Sprint</label>
            <select
              style={{ ...selectStyle, opacity: !selectedPhaseId ? 0.5 : 1 }}
              value={selectedSprintId ?? ""}
              onChange={e => handleSprintChange(e.target.value ? +e.target.value : null)}
              disabled={!selectedPhaseId}
            >
              <option value="">— Choisir un sprint —</option>
              {phaseSprints.sort((a, b) => a.order - b.order).map(s => (
                <option key={s.id} value={s.id}>Sprint {s.order} — {s.name}</option>
              ))}
            </select>
          </div>

          {/* Bouton Afficher */}
          <div>
            <button
              onClick={fetchBurndown}
              disabled={!selectedSprintId || loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 20px",
                borderRadius: 6,
                border: "none",
                background: !selectedSprintId
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: !selectedSprintId || loading ? "not-allowed" : "pointer",
                transition: "opacity .15s",
                opacity: loading ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {loading
                ? <><FaSpinner size={12} style={{ animation: "spin 1s linear infinite" }} /> Chargement…</>
                : <><FaSearch size={12} /> Afficher</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          background: "#fff5f5",
          border: "1px solid #fca5a5",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 16,
          color: "#dc2626",
        }}>
          <FaExclamationTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 3 }}>Impossible d'afficher le burndown</div>
            <div style={{ fontSize: "0.78rem", color: "#b91c1c", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{error}</div>
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      {data && !error && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Sprint",    value: selectedSprint?.name ?? "—", color: "#6366f1", bg: "#eef2ff" },
              { label: "Début",     value: sprintStart ? fmtDate(sprintStart) : "—", color: "#0ea5e9", bg: "#f0f9ff" },
              { label: "Fin",       value: sprintEnd   ? fmtDate(sprintEnd)   : "—", color: "#0ea5e9", bg: "#f0f9ff" },
              { label: "Total JH",  value: `${totalJH} JH`,  color: "#8b5cf6", bg: "#f5f3ff" },
              { label: "Restant",   value: lastActual !== null ? `${lastActual} JH` : "—", color: lastActual === 0 ? "#16a34a" : "#f59e0b", bg: lastActual === 0 ? "#f0fdf4" : "#fffbeb" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{
                background: bg,
                border: `1px solid ${color}33`,
                borderRadius: 8,
                padding: "10px 16px",
                minWidth: 110,
              }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* ── Chart ── */}
          <div style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "20px 16px 12px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: 12, paddingLeft: 8 }}>
              Avancement sprint — {selectedSprint?.name}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  unit=" JH"
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "0.78rem", paddingTop: 12 }}
                  formatter={(value) => value === "idealValue" ? "Ligne idéale" : "Réalisation"}
                />

                {/* Ligne aujourd'hui */}
                <ReferenceLine
                  x={today}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: "Aujourd'hui", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                />

                {/* Ligne idéale */}
                <Line
                  type="linear"
                  dataKey="idealValue"
                  name="idealValue"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 4, fill: "#94a3b8" }}
                />

                {/* Réalisation */}
                <Line
                  type="linear"
                  dataKey="actualValue"
                  name="actualValue"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Légende manuelle */}
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 6, fontSize: "0.72rem", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ display: "inline-block", width: 22, height: 2, background: "#94a3b8", borderTop: "2px dashed #94a3b8" }} />
                Ligne idéale
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ display: "inline-block", width: 22, height: 2.5, background: "#6366f1", borderRadius: 2 }} />
                Réalisation réelle
              </span>
            </div>
          </div>

          {/* Spinning keyframe injected */}
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </>
      )}

      {/* ── Empty state ── */}
      {!data && !loading && !error && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          color: "#94a3b8",
          textAlign: "center",
          background: "#fafafa",
          borderRadius: 10,
          border: "1px dashed #e2e8f0",
        }}>
          <FaChartLine size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#64748b" }}>Aucun graphe affiché</div>
          <div style={{ fontSize: "0.78rem" }}>Sélectionnez un lot, une phase et un sprint, puis cliquez sur « Afficher »</div>
        </div>
      )}
    </div>
  );
};

export default BurndownTab;