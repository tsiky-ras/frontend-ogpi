// src/pages/lead/leads/dashboard/DashboardLeadPage.tsx
import React, { useEffect, useState } from "react";
import { Pie, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useAuth } from "../../../../context/AuthContext.tsx";
import {
  LeadDashboardService,
  DashDTO,
} from "../../../../services/lead/LeadDashboardService.tsx";
import { useDeviseService } from "../../../../services/lead/tech-fin/DeviseService.tsx";
import { Devise } from "../../../../types/lead/tech-fin/LeadTechFin.tsx";

ChartJS.register(ArcElement, Tooltip, Legend);

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  navy:  "#0a1f44",
  blue:  "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  linen: "#e5e7eb",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(n);

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const getDefaultDates = () => {
  const now = new Date();
  const debut = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { dateDebut: toISO(debut), dateFin: toISO(fin) };
};

type Preset = "Semaine" | "Mois" | "Année" | null;

const applyPreset = (preset: Preset): { dateDebut: string; dateFin: string } => {
  const now = new Date();
  if (preset === "Semaine") {
    const day  = now.getDay() || 7;
    const mon  = new Date(now); mon.setDate(now.getDate() - day + 1);
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { dateDebut: toISO(mon), dateFin: toISO(sun) };
  }
  if (preset === "Mois") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { dateDebut: toISO(first), dateFin: toISO(last) };
  }
  if (preset === "Année") {
    const first = new Date(now.getFullYear(), 0, 1);
    const last  = new Date(now.getFullYear(), 11, 31);
    return { dateDebut: toISO(first), dateFin: toISO(last) };
  }
  return getDefaultDates();
};

const COLORS = [
  "#0a1f44","#3b82f6","#10b981","#f59e0b",
  "#ef4444","#8b5cf6","#ec4899","#14b8a6",
  "#f97316","#6366f1","#84cc16","#06b6d4",
];

const chartOptions = {
  plugins: {
    legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } },
  },
  maintainAspectRatio: true,
};

// ── Sub-components ────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string; value: string; sub?: string; color?: string;
}> = ({ label, value, sub, color = P.navy }) => (
  <div style={{
    background: "#fff", borderRadius: 12, padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderTop: `4px solid ${color}`,
    flex: 1, minWidth: 180,
  }}>
    <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
    <p style={{ margin: "8px 0 4px", fontSize: 26, fontWeight: 700, color }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h6 style={{
    margin: "32px 0 16px", fontSize: 13, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1.5, color: "#374151",
    borderBottom: `2px solid ${P.linen}`, paddingBottom: 8,
  }}>{children}</h6>
);

// ── Main Component ────────────────────────────────────────────────────────────

const DashboardLeadPage: React.FC = () => {
  const { api } = useAuth();
  const service      = new LeadDashboardService(api);
  const deviseService = useDeviseService();

  const defaults = getDefaultDates();
  const [dateDebut,  setDateDebut]  = useState(defaults.dateDebut);
  const [dateFin,    setDateFin]    = useState(defaults.dateFin);
  const [datePreset, setDatePreset] = useState<Preset>(null);
  const [devises,    setDevises]    = useState<Devise[]>([]);
  const [deviseId,   setDeviseId]   = useState<number | undefined>(undefined);
  const [data,       setData]       = useState<DashDTO | null>(null);
  const [loading,    setLoading]    = useState(false);

  const deviseLabel = devises.find((d: Devise) => d.id === deviseId)?.abrDevise ?? "MGA";

  useEffect(() => {
    deviseService.getAll().then(setDevises).catch(console.error);
  }, []);

  const load = async (debut: string, fin: string, dvId?: number) => {
    setLoading(true);
    try {
      setData(await service.getDashboard(debut, fin, dvId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(dateDebut, dateFin, deviseId); }, []);

  const handlePreset = (p: Preset) => {
    setDatePreset(p);
    const { dateDebut: d, dateFin: f } = applyPreset(p);
    setDateDebut(d);
    setDateFin(f);
    load(d, f, deviseId);
  };

  const handleActualiser = () => load(dateDebut, dateFin, deviseId);

  // ── Taux de conversion ────────────────────────────────────────────────────
  const tauxConversion = (() => {
    if (!data) return { taux: 0, total: 0, gagnes: 0 };
    const total  = data.parStatut.reduce((s, x) => s + x.nbOffresPipeline, 0);
    const gagnes = data.parStatut.find(s => s.leadStatusId === 5)?.nbOffresPipeline ?? 0;
    const taux   = total === 0 ? 0 : Math.round((gagnes / total) * 100);
    return { taux, total, gagnes };
  })();

  // ── Pie charts par statut ─────────────────────────────────────────────────
  const statutLabels = data?.parStatut.map(s => s.leadStatusLabel) ?? [];
  const statutColors = data?.parStatut.map((_, i) => COLORS[i % COLORS.length]) ?? [];

  const pieNb   = { labels: statutLabels, datasets: [{ data: data?.parStatut.map(s => s.nbOffresPipeline      ?? 0) ?? [], backgroundColor: statutColors, borderWidth: 1 }] };
  const pieAvec = { labels: statutLabels, datasets: [{ data: data?.parStatut.map(s => s.caPipelineAvecCharges ?? 0) ?? [], backgroundColor: statutColors, borderWidth: 1 }] };
  const pieSans = { labels: statutLabels, datasets: [{ data: data?.parStatut.map(s => s.caPipelineSansCharges ?? 0) ?? [], backgroundColor: statutColors, borderWidth: 1 }] };

  // ── Donut charts par type ─────────────────────────────────────────────────
  const typeLabels = data?.parType.map(t => t.leadTypeLabel) ?? [];
  const typeColors = data?.parType.map((_, i) => COLORS[i % COLORS.length]) ?? [];

  const donutNb   = { labels: typeLabels, datasets: [{ data: data?.parType.map(t => t.nbOffres      ?? 0) ?? [], backgroundColor: typeColors, borderWidth: 1 }] };
  const donutAvec = { labels: typeLabels, datasets: [{ data: data?.parType.map(t => t.caAvecCharges ?? 0) ?? [], backgroundColor: typeColors, borderWidth: 1 }] };
  const donutSans = { labels: typeLabels, datasets: [{ data: data?.parType.map(t => t.caSansCharges ?? 0) ?? [], backgroundColor: typeColors, borderWidth: 1 }] };

  const btnBase: React.CSSProperties = {
    padding: "4px 12px", borderRadius: 6, fontSize: 12,
    fontWeight: 600, cursor: "pointer", border: "1px solid #d1d5db",
    background: "#f9fafb", color: "#374151",
  };
  const btnActive: React.CSSProperties = {
    ...btnBase, background: P.navy, color: "#fff", border: `1px solid ${P.navy}`,
  };
  const inputStyle: React.CSSProperties = {
    padding: "4px 8px", borderRadius: 6,
    border: "1px solid #d1d5db", fontSize: 13,
    color: "#374151", background: "#fff",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "8px 0" }}>

      {/* ── Barre PÉRIODE & DEVISE ── */}
      <div style={{
        background: "#fff", borderRadius: 10, border: `1px solid ${P.linen}`,
        padding: "12px 16px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>

          {/* Presets */}
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Période</span>
          {(["Semaine", "Mois", "Année"] as Preset[]).map(p => (
            <button key={p!} style={datePreset === p ? btnActive : btnBase} onClick={() => handlePreset(p)}>{p}</button>
          ))}

          <span style={{ color: P.linen, margin: "0 4px" }}>|</span>

          {/* Dates */}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
            Du
            <input
              type="date"
              value={dateDebut}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateDebut(e.target.value); setDatePreset(null); }}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151" }}>
            Au
            <input
              type="date"
              value={dateFin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateFin(e.target.value); setDatePreset(null); }}
              style={inputStyle}
            />
          </label>

          <span style={{ color: P.linen, margin: "0 4px" }}>|</span>

          {/* Devise */}
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Devise</span>
          <select
            value={deviseId ?? ""}
            onChange={e => setDeviseId(e.target.value ? Number(e.target.value) : undefined)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">MGA (défaut)</option>
            {devises.map((d: Devise) => (
              <option key={d.id} value={d.id}>{d.abrDevise} - {d.nomDevise}</option>
            ))}
          </select>

          <button
            onClick={handleActualiser}
            style={{
              padding: "6px 18px", borderRadius: 6,
              background: P.navy, color: "#fff",
              border: "none", fontSize: 13, cursor: "pointer", fontWeight: 600,
            }}
          >
            Actualiser
          </button>

          {loading && <span style={{ fontSize: 13, color: "#6b7280" }}>Chargement…</span>}
        </div>

        {/* Indicateur filtre actif */}
        {deviseId != null && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Affichage en <strong>{deviseLabel}</strong> —{" "}
            <span
              style={{ color: P.blue, cursor: "pointer", textDecoration: "underline" }}
              onClick={() => { setDeviseId(undefined); load(dateDebut, dateFin, undefined); }}
            >
              Revenir en MGA
            </span>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KpiCard label="Nb offres pipeline"         value={String(data?.global.nbOffresPipeline ?? 0)}                          color={P.navy}  />
        <KpiCard label="CA pipeline (avec charges)" value={`${fmt(data?.global.caPipelineAvecCharges ?? 0)} ${deviseLabel}`}    color={P.blue}  />
        <KpiCard label="CA pipeline (sans charges)" value={`${fmt(data?.global.caPipelineSansCharges ?? 0)} ${deviseLabel}`}    color={P.green} sub="Informatif" />
        <KpiCard label="Taux de conversion"         value={`${tauxConversion.taux} %`}                                          color={P.amber}
          sub={`${tauxConversion.gagnes} gagnés / ${tauxConversion.total} total`} />
      </div>

      {/* ── Pie charts par statut ── */}
      <SectionTitle>Répartition par statut</SectionTitle>
      {data !== null && data.parStatut.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun statut trouvé pour cette période.</p>
      ) : (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { title: "Nombre d'offres",                    chart: pieNb   },
            { title: `CA avec charges (${deviseLabel})`,   chart: pieAvec },
            { title: `CA sans charges (${deviseLabel})`,   chart: pieSans },
          ].map(({ title, chart }) => (
            <div key={title} style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 12,
              padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>{title}</p>
              <Pie data={chart} options={chartOptions} />
            </div>
          ))}
        </div>
      )}

      {/* ── Top 3 offres ── */}
      <SectionTitle>Top 3 offres — potentiel financier</SectionTitle>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {data !== null && data.top3Offres.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucune offre trouvée pour cette période.</p>
        )}
        {data?.top3Offres.map((o, i) => (
          <div key={o.leadRef} style={{
            flex: 1, minWidth: 220, background: "#fff", borderRadius: 12,
            padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
            borderLeft: `4px solid ${COLORS[i]}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS[i] }}>#{i + 1}</span>
              <span style={{ fontSize: 11, background: "#eff6ff", color: "#1d4ed8",
                borderRadius: 99, padding: "2px 10px" }}>{o.statusActuel ?? "—"}</span>
            </div>
            <p style={{ fontWeight: 600, color: P.navy, margin: "0 0 2px" }}>{o.leadName ?? "—"}</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>{o.leadRef ?? "—"} · {o.leadPeriode ?? "—"}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>CA avec charges</span>
                <strong style={{ color: P.navy }}>{fmt(o.caAvecCharges ?? 0)} {deviseLabel}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>CA sans charges</span>
                <span style={{ color: "#6b7280" }}>{fmt(o.caSansCharges ?? 0)} {deviseLabel}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Volume JH</span>
                <span style={{ color: "#374151" }}>{o.volumeJh ?? 0} JH</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Donut charts par type ── */}
      <SectionTitle>Répartition par type d'offre</SectionTitle>
      {data !== null && data.parType.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun type d'offre trouvé pour cette période.</p>
      ) : (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { title: "Nombre d'offres",                    chart: donutNb   },
            { title: `CA avec charges (${deviseLabel})`,   chart: donutAvec },
            { title: `CA sans charges (${deviseLabel})`,   chart: donutSans },
          ].map(({ title, chart }) => (
            <div key={title} style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 12,
              padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>{title}</p>
              <Doughnut data={chart} options={chartOptions} />
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default DashboardLeadPage;
