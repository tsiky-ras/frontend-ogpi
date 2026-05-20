// src/pages/lead/leads/dashboard/DashboardLeadPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pie, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { FaCalendarAlt, FaMoneyBillWave, FaBriefcase, FaChartPie, FaWallet } from "react-icons/fa";
import StatCard from "../../../../components/stat/StatCard.tsx";
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
  navy:    "#08143d",
  blue:    "#3b82f6",
  green:   "#10b981",
  amber:   "#d4a017",
  linen:   "#e2e8f0",
  charcoal:"#08143d",
  tomato:  "#C93C29",
  dim:     "#64748b",
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
  const service       = useMemo(() => new LeadDashboardService(api), [api]);
  const deviseService = useDeviseService();

  const defaults = getDefaultDates();
  const [dateDebut,  setDateDebut]  = useState(defaults.dateDebut);
  const [dateFin,    setDateFin]    = useState(defaults.dateFin);
  const [datePreset, setDatePreset] = useState<Preset>(null);
  const [devises,    setDevises]    = useState<Devise[]>([]);
  const [deviseId,   setDeviseId]   = useState<number | undefined>(undefined);
  const [data,       setData]       = useState<DashDTO | null>(null);
  const [loading,    setLoading]    = useState(false);

  const deviseLabel = devises.find((d: Devise) => (d.idDevise ?? d.id) === deviseId)?.abrDevise ?? "MGA";

  const load = useCallback(async (debut: string, fin: string, dvId?: number) => {
    const safeId = dvId != null && !isNaN(dvId) ? dvId : undefined;
    setLoading(true);
    try {
      setData(await service.getDashboard(debut, fin, safeId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    deviseService.getAll().then(setDevises).catch(console.error);
  }, []);

  useEffect(() => { load(dateDebut, dateFin, deviseId); }, [load]);

  const handlePreset = useCallback((p: Preset) => {
    setDatePreset(p);
    const { dateDebut: d, dateFin: f } = applyPreset(p);
    setDateDebut(d);
    setDateFin(f);
    load(d, f, deviseId);
  }, [load, deviseId]);

  const handleActualiser = useCallback(() => load(dateDebut, dateFin, deviseId), [load, dateDebut, dateFin, deviseId]);

  // ── Taux de conversion ────────────────────────────────────────────────────
  const tauxConversion = useMemo(() => {
    if (!data) return { taux: 0, total: 0, gagnes: 0 };
    const total  = data.parStatut.reduce((s, x) => s + x.nbOffresPipeline, 0);
    const gagnes = data.parStatut.find(s => s.leadStatusId === 5)?.nbOffresPipeline ?? 0;
    const taux   = total === 0 ? 0 : Math.round((gagnes / total) * 100);
    return { taux, total, gagnes };
  }, [data]);

  // ── Pie charts par statut ─────────────────────────────────────────────────
  const { pieNb, pieAvec, pieSans } = useMemo(() => {
    const statutLabels = data?.parStatut.map(s => s.leadStatusLabel) ?? [];
    const statutColors = data?.parStatut.map((_, i) => COLORS[i % COLORS.length]) ?? [];
    return {
      pieNb:   { labels: statutLabels, datasets: [{ data: data?.parStatut.map(s => s.nbOffresPipeline      ?? 0) ?? [], backgroundColor: statutColors, borderWidth: 1 }] },
      pieAvec: { labels: statutLabels, datasets: [{ data: data?.parStatut.map(s => s.caPipelineAvecCharges ?? 0) ?? [], backgroundColor: statutColors, borderWidth: 1 }] },
      pieSans: { labels: statutLabels, datasets: [{ data: data?.parStatut.map(s => s.caPipelineSansCharges ?? 0) ?? [], backgroundColor: statutColors, borderWidth: 1 }] },
    };
  }, [data]);

  // ── Donut charts par type ─────────────────────────────────────────────────
  const { donutNb, donutAvec, donutSans } = useMemo(() => {
    const typeLabels = data?.parType.map(t => t.leadTypeLabel) ?? [];
    const typeColors = data?.parType.map((_, i) => COLORS[i % COLORS.length]) ?? [];
    return {
      donutNb:   { labels: typeLabels, datasets: [{ data: data?.parType.map(t => t.nbOffres      ?? 0) ?? [], backgroundColor: typeColors, borderWidth: 1 }] },
      donutAvec: { labels: typeLabels, datasets: [{ data: data?.parType.map(t => t.caAvecCharges ?? 0) ?? [], backgroundColor: typeColors, borderWidth: 1 }] },
      donutSans: { labels: typeLabels, datasets: [{ data: data?.parType.map(t => t.caSansCharges ?? 0) ?? [], backgroundColor: typeColors, borderWidth: 1 }] },
    };
  }, [data]);


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "8px 0" }}>

      {/* ── Barre PÉRIODE & DEVISE ── */}
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${P.linen}`, padding: '12px 16px', marginBottom: 20, boxShadow: '0 1px 4px rgba(34,58,70,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <FaCalendarAlt size={11} color={P.charcoal} />
          <span style={{ fontSize: 10, fontWeight: 800, color: P.charcoal, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Période & Devise</span>
          {(datePreset !== null || deviseId != null) && (
            <button
              onClick={() => {
                const d = getDefaultDates();
                setDateDebut(d.dateDebut);
                setDateFin(d.dateFin);
                setDatePreset(null);
                setDeviseId(undefined);
                load(d.dateDebut, d.dateFin, undefined);
              }}
              style={{ marginLeft: 'auto', fontSize: 11, border: 'none', background: 'transparent', color: P.tomato, cursor: 'pointer', fontWeight: 600 }}
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>

          {/* Presets */}
          {(["Semaine", "Mois", "Année"] as Preset[]).map(p => (
            <button
              key={p!}
              onClick={() => handlePreset(p)}
              style={{
                fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', transition: 'all 0.15s',
                border: `1px solid ${datePreset === p ? P.charcoal : P.linen}`,
                background: datePreset === p ? P.charcoal : 'transparent',
                color: datePreset === p ? '#fff' : P.charcoal,
              }}
            >
              {p}
            </button>
          ))}

          <span style={{ width: 1, height: 20, background: P.linen, flexShrink: 0 }} />

          {/* Dates */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.dim, fontWeight: 500 }}>
            Du
            <input
              type="date"
              value={dateDebut}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateDebut(e.target.value); setDatePreset(null); }}
              style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${dateDebut ? P.charcoal : P.linen}`, fontSize: 12, color: P.charcoal, background: '#fff' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.dim, fontWeight: 500 }}>
            Au
            <input
              type="date"
              value={dateFin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDateFin(e.target.value); setDatePreset(null); }}
              style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${dateFin ? P.charcoal : P.linen}`, fontSize: 12, color: P.charcoal, background: '#fff' }}
            />
          </label>

          <span style={{ width: 1, height: 20, background: P.linen, flexShrink: 0 }} />

          {/* Devise */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: P.dim, fontWeight: 500 }}>
            <FaMoneyBillWave size={10} />
            Devise
            <select
              value={deviseId ?? ""}
              onChange={e => {
                const parsed = Number(e.target.value);
                const newId = e.target.value && !isNaN(parsed) ? parsed : undefined;
                setDeviseId(newId);
                load(dateDebut, dateFin, newId);
              }}
              style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 12, color: P.charcoal, background: '#fff', cursor: 'pointer',
                border: `1px solid ${deviseId != null ? P.charcoal : P.linen}`,
                fontWeight: deviseId != null ? 700 : 400,
              }}
            >
              <option value="">MGA (défaut)</option>
              {devises.filter((d: Devise) => d.abrDevise !== 'MGA').map((d: Devise) => {
                const did = d.idDevise ?? d.id;
                return <option key={did} value={did}>{d.abrDevise} — {d.nomDevise}</option>;
              })}
            </select>
          </label>

          <button
            onClick={handleActualiser}
            style={{
              fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
              border: `1px solid ${P.charcoal}`, background: P.charcoal, color: '#fff',
            }}
          >
            Actualiser
          </button>

          {loading && <span style={{ fontSize: 11, color: P.dim }}>Chargement…</span>}

          {deviseId != null && (
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#0ea5e9',
              background: '#f0fdfa', borderRadius: 99, padding: '2px 10px', border: '1px solid #a7f3d0',
            }}>
              Affichage en {deviseLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="stats-grid">
        <StatCard
          title="Nb offres pipeline"
          value={data?.global.nbOffresPipeline ?? 0}
          variant={P.navy}
          icon={<FaBriefcase />}
        />
        <StatCard
          title="CA pipeline (avec charges)"
          value={`${fmt(data?.global.caPipelineAvecCharges ?? 0)} ${deviseLabel}`}
          variant={P.blue}
          icon={<FaMoneyBillWave />}
        />
        <StatCard
          title="CA pipeline (sans charges)"
          value={`${fmt(data?.global.caPipelineSansCharges ?? 0)} ${deviseLabel}`}
          subtitle="Informatif"
          variant={P.green}
          icon={<FaWallet />}
        />
        <StatCard
          title="Taux de conversion"
          value={`${tauxConversion.taux} %`}
          subtitle={`${tauxConversion.gagnes} gagnés / ${tauxConversion.total} total`}
          variant={P.amber}
          icon={<FaChartPie />}
        />
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
