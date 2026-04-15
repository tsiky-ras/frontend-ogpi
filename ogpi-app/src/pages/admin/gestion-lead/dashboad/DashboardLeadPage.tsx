// src/pages/lead/leads/dashboard/DashboardLeadPage.tsx
import React, { useEffect, useState } from "react";
import { Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { useAuth } from "../../../../context/AuthContext.tsx";
import {
  LeadDashboardService,
  DashDTO,
  CaPipelineParStatutDTO,
} from "../../../../services/lead/LeadDashboardService.tsx";

ChartJS.register(ArcElement, Tooltip, Legend);

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(n);

const getDefaultDates = () => {
  const now = new Date();
  const debut = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toStr = (d: Date) => d.toISOString().split("T")[0];
  return { dateDebut: toStr(debut), dateFin: toStr(fin) };
};

const COLORS = [
  "#0a1f44", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#6366f1", "#84cc16", "#06b6d4",
];

const chartOptions = {
  plugins: {
    legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } },
  },
  maintainAspectRatio: true,
};

// ── Sub-components ────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  color?: string;
}> = ({ label, value, sub, color = "#0a1f44" }) => (
  <div style={{
    background: "#fff",
    borderRadius: 12,
    padding: "20px 24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    borderTop: `4px solid ${color}`,
    flex: 1,
    minWidth: 180,
  }}>
    <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
    <p style={{ margin: "8px 0 4px", fontSize: 26, fontWeight: 700, color }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h6 style={{
    margin: "32px 0 16px",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: 8,
  }}>{children}</h6>
);

// ── Main Component ────────────────────────────────────────────────────────────

const DashboardLeadPage: React.FC = () => {
  const { api } = useAuth();
  const service = new LeadDashboardService(api);

  const { dateDebut: defaultDebut, dateFin: defaultFin } = getDefaultDates();
  const [dateDebut, setDateDebut] = useState(defaultDebut);
  const [dateFin, setDateFin]     = useState(defaultFin);
  const [data, setData]           = useState<DashDTO | null>(null);
  const [loading, setLoading]     = useState(false);

  const load = async (d1: string, d2: string) => {
    setLoading(true);
    try {
      setData(await service.getDashboard(d1, d2));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(dateDebut, dateFin); }, []);

  // ── Taux de conversion ──────────────────────────────────────────────────────
  const tauxConversion = (() => {
    if (!data) return { taux: 0, total: 0, gagnes: 0 };
    const total  = data.parStatut.reduce((s, x) => s + x.nbOffresPipeline, 0);
    const gagnes = data.parStatut.find(s => s.leadStatusId === 5)?.nbOffresPipeline ?? 0;
    const taux   = total === 0 ? 0 : Math.round((gagnes / total) * 100);
    return { taux, total, gagnes };
  })();

  // ── Pie charts par statut ──────────────────────────────────────────────────
  const statutLabels  = data?.parStatut.map(s => s.leadStatusLabel) ?? [];
  const statutColors  = data?.parStatut.map((_, i) => COLORS[i % COLORS.length]) ?? [];

  const pieNb = {
    labels: statutLabels,
    datasets: [{ data: data?.parStatut.map(s => s.nbOffresPipeline) ?? [], backgroundColor: statutColors, borderWidth: 1 }],
  };
  const pieAvec = {
    labels: statutLabels,
    datasets: [{ data: data?.parStatut.map(s => s.caPipelineAvecCharges) ?? [], backgroundColor: statutColors, borderWidth: 1 }],
  };
  const pieSans = {
    labels: statutLabels,
    datasets: [{ data: data?.parStatut.map(s => s.caPipelineSansCharges) ?? [], backgroundColor: statutColors, borderWidth: 1 }],
  };

  // ── Donut charts par type ──────────────────────────────────────────────────
  const typeLabels = data?.parType.map(t => t.leadTypeLabel) ?? [];
  const typeColors = data?.parType.map((_, i) => COLORS[i % COLORS.length]) ?? [];

  const donutNb = {
    labels: typeLabels,
    datasets: [{ data: data?.parType.map(t => t.nbOffres) ?? [], backgroundColor: typeColors, borderWidth: 1 }],
  };
  const donutAvec = {
    labels: typeLabels,
    datasets: [{ data: data?.parType.map(t => t.caAvecCharges) ?? [], backgroundColor: typeColors, borderWidth: 1 }],
  };
  const donutSans = {
    labels: typeLabels,
    datasets: [{ data: data?.parType.map(t => t.caSansCharges) ?? [], backgroundColor: typeColors, borderWidth: 1 }],
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "8px 0" }}>

      {/* Filtres date */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "#374151" }}>
          Du&nbsp;
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
        </label>
        <label style={{ fontSize: 13, color: "#374151" }}>
          Au&nbsp;
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
        </label>
        <button
          onClick={() => load(dateDebut, dateFin)}
          style={{ padding: "6px 18px", borderRadius: 6, background: "#0a1f44", color: "#fff", border: "none", fontSize: 13, cursor: "pointer" }}
        >
          Actualiser
        </button>
        {loading && <span style={{ fontSize: 13, color: "#6b7280" }}>Chargement...</span>}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KpiCard
          label="Nb offres pipeline"
          value={String(data?.global.nbOffresPipeline ?? 0)}
          color="#0a1f44"
        />
        <KpiCard
          label="CA pipeline (avec charges)"
          value={`${fmt(data?.global.caPipelineAvecCharges ?? 0)} MGA`}
          color="#3b82f6"
        />
        <KpiCard
          label="CA pipeline (sans charges)"
          value={`${fmt(data?.global.caPipelineSansCharges ?? 0)} MGA`}
          color="#10b981"
          sub="Informatif"
        />
        <KpiCard
          label="Taux de conversion"
          value={`${tauxConversion.taux} %`}
          color="#f59e0b"
          sub={`${tauxConversion.gagnes} gagnés / ${tauxConversion.total} total`}
        />
      </div>

      {/* ── Pie charts par statut ── */}
      <SectionTitle>Répartition par statut</SectionTitle>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          { title: "Nombre d'offres",        chart: pieNb   },
          { title: "CA avec charges (MGA)",    chart: pieAvec },
          { title: "CA sans charges (MGA)",    chart: pieSans },
        ].map(({ title, chart }) => (
          <div key={title} style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 12,
            padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>{title}</p>
            <Pie data={chart} options={chartOptions} />
          </div>
        ))}
      </div>

      {/* ── Top 3 offres ── */}
      <SectionTitle>Top 3 offres — potentiel financier</SectionTitle>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {data?.top3Offres.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucune offre dans cette période.</p>
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
                borderRadius: 99, padding: "2px 10px" }}>{o.statusActuel}</span>
            </div>
            <p style={{ fontWeight: 600, color: "#0a1f44", margin: "0 0 2px" }}>{o.leadName}</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>{o.leadRef} · {o.leadPeriode}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>CA avec charges</span>
                <strong style={{ color: "#0a1f44" }}>{fmt(o.caAvecCharges)} MGA</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>CA sans charges</span>
                <span style={{ color: "#6b7280" }}>{fmt(o.caSansCharges)} MGA</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>Volume JH</span>
                <span style={{ color: "#374151" }}>{o.volumeJh} JH</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Donut charts par type ── */}
      <SectionTitle>Répartition par type d'offre</SectionTitle>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          { title: "Nombre d'offres",        chart: donutNb   },
          { title: "CA avec charges (MGA)",    chart: donutAvec },
          { title: "CA sans charges (MGA)",    chart: donutSans },
        ].map(({ title, chart }) => (
          <div key={title} style={{ flex: 1, minWidth: 220, background: "#fff", borderRadius: 12,
            padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>{title}</p>
            <Doughnut data={chart} options={chartOptions} />
          </div>
        ))}
      </div>

    </div>
  );
};

export default DashboardLeadPage;