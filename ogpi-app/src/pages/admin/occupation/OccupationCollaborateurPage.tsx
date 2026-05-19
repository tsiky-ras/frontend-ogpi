import React, { useCallback, useEffect, useState } from "react";
import Header  from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title   from "../../../components/title/Title.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./OccupationCollaborateur.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DetailDTO {
  type: "PROJET" | "LEAD" | "LEAD_TACHE";
  nom:  string;
  id:   number;
  jh:   number;
}

interface OccupationDTO {
  profilId:       number;
  nom:            string;
  prenom:         string;
  appelation:     string;
  totalJh:        number;
  jhRealise:      number;
  capaciteJh:     number;
  tauxOccupation: number;
  statut:         "DISPONIBLE" | "OPTIMAL" | "SURCHARGE";
  details:        DetailDTO[];
}

// ── Période ───────────────────────────────────────────────────────────────────

type PeriodePreset = "SEMAINE" | "MOIS" | "TRIMESTRE" | "ANNEE" | "CUSTOM";

function getPresetDates(preset: PeriodePreset): { start: string; end: string } {
  const today = new Date();
  const fmt   = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "SEMAINE") {
    const day = today.getDay() || 7;
    const mon = new Date(today); mon.setDate(today.getDate() - day + 1);
    const sun = new Date(mon);   sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun) };
  }
  if (preset === "MOIS") {
    return {
      start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
      end:   fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }
  if (preset === "TRIMESTRE") {
    const q = Math.floor(today.getMonth() / 3);
    return {
      start: fmt(new Date(today.getFullYear(), q * 3, 1)),
      end:   fmt(new Date(today.getFullYear(), q * 3 + 3, 0)),
    };
  }
  if (preset === "ANNEE") {
    return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` };
  }
  return { start: fmt(today), end: fmt(today) };
}

// ── Statut meta ───────────────────────────────────────────────────────────────

const statutMeta = {
  DISPONIBLE: { color: "#2563eb", bg: "#eff6ff", label: "Disponible" },
  OPTIMAL:    { color: "#16a34a", bg: "#f0fdf4", label: "Optimal"    },
  SURCHARGE:  { color: "#dc2626", bg: "#fef2f2", label: "Surchargé"  },
};

// ── Carte collaborateur ───────────────────────────────────────────────────────

const OccupationCard: React.FC<{ dto: OccupationDTO }> = ({ dto }) => {
  const [open, setOpen] = useState(false);
  const meta = statutMeta[dto.statut] ?? statutMeta.DISPONIBLE;
  const pct  = Math.min(dto.tauxOccupation, 100);

  return (
    <div className="occ-card" style={{ borderLeft: `4px solid ${meta.color}` }}>
      {/* En-tête cliquable */}
      <div className="occ-card-header" onClick={() => setOpen(o => !o)}>
        <div className="occ-card-identity">
          <div className="occ-avatar" style={{ background: meta.bg, color: meta.color }}>
            {(dto.prenom?.[0] ?? "?").toUpperCase()}{(dto.nom?.[0] ?? "").toUpperCase()}
          </div>
          <div>
            <div className="occ-name">{dto.prenom} {dto.nom}</div>
            {dto.appelation && <div className="occ-appelation">{dto.appelation}</div>}
          </div>
        </div>

        <div className="occ-card-right">
          <span className="occ-badge" style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
          <span className="occ-taux">{dto.tauxOccupation.toFixed(1)} %</span>
          <span className={`occ-chevron ${open ? "open" : ""}`}>▾</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="occ-progress-wrap">
        <div className="occ-progress-bar"
             style={{ width: `${pct}%`, background: meta.color }} />
      </div>

      {/* Stats JH */}
      <div className="occ-card-stats">
        <span><strong>{dto.totalJh.toFixed(1)}</strong> JH planifiés</span>
        <span><strong>{dto.jhRealise.toFixed(1)}</strong> JH réalisés</span>
        <span>Capacité : <strong>{dto.capaciteJh.toFixed(0)}</strong> JH</span>
      </div>

      {/* Détails (expand) */}
      {open && dto.details.length > 0 && (
        <ul className="occ-details">
          {dto.details.map((d, i) => (
            <li key={i} className={`occ-detail-item occ-detail-${d.type.toLowerCase().replace('_', '-')}`}>
              <span className="occ-detail-badge">
                {d.type === "PROJET"     ? "PROJET"
                : d.type === "LEAD"      ? "BACKLOG"
                : "TÂCHES"}
              </span>
              <span className="occ-detail-nom">{d.nom}</span>
              <span className="occ-detail-jh">{d.jh.toFixed(1)} JH
                {d.type === "LEAD_TACHE" && <span className="occ-detail-est"> est.</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const OccupationCollaborateurPage: React.FC = () => {
  const { api, user, hasPerm } = useAuth();
  const isCollaborateur = user?.role?.roleLabel === "COLLABORATEUR";
  const canViewAll = hasPerm('OCC_VIEW_ALL');
  const canViewOwn = hasPerm('OCC_VIEW_OWN');

  // Période
  const [preset,    setPreset]    = useState<PeriodePreset>("MOIS");
  const [startDate, setStartDate] = useState(() => getPresetDates("MOIS").start);
  const [endDate,   setEndDate]   = useState(() => getPresetDates("MOIS").end);

  // Filtres
  const [type,   setType]   = useState<"TOUS" | "PROJET" | "LEAD">("TOUS");
  const [search, setSearch] = useState("");

  // Données
  const [data,    setData]    = useState<OccupationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const applyPreset = (p: PeriodePreset) => {
    setPreset(p);
    if (p !== "CUSTOM") {
      const { start, end } = getPresetDates(p);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { type };
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;
      const res = await api.get<OccupationDTO[]>(
        `/occupation/collaborateurs?${new URLSearchParams(params)}`
      );
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [api, startDate, endDate, type]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? data.filter(d =>
        `${d.prenom} ${d.nom} ${d.appelation ?? ""}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const counts = {
    DISPONIBLE: filtered.filter(d => d.statut === "DISPONIBLE").length,
    OPTIMAL:    filtered.filter(d => d.statut === "OPTIMAL").length,
    SURCHARGE:  filtered.filter(d => d.statut === "SURCHARGE").length,
  };

  return (
    <div className="occ-layout">
      <Header />

      <div className="occ-wrapper">
        <aside className="occ-sidebar">
          <Sidebar />
        </aside>

        <main className="occ-main">
          <div className="container-fluid">

            {!canViewOwn && !canViewAll && (
              <div className="alert alert-warning mt-3">
                Vous n'avez pas l'autorisation de consulter les données d'occupation.
              </div>
            )}

            {/* Titre */}
            <div className="row mb-3">
              <div className="col">
                <Title
                  title="Charge & Équipe"
                  subtitle="Taux d'occupation des collaborateurs par période"
                />
              </div>
              <div className="col-auto d-flex align-items-end pb-1">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={load}
                  disabled={loading}
                >
                  {loading ? "…" : "↻ Actualiser"}
                </button>
              </div>
            </div>

            {/* Filtres */}
            <div className="occ-toolbar">
              {/* Période */}
              <div className="occ-filter-group">
                <span className="occ-filter-label">Période</span>
                <div className="btn-group btn-group-sm flex-wrap">
                  {(["SEMAINE", "MOIS", "TRIMESTRE", "ANNEE", "CUSTOM"] as PeriodePreset[]).map(p => (
                    <button
                      key={p}
                      className={`btn ${preset === p ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => applyPreset(p)}
                    >
                      {p === "SEMAINE" ? "Semaine"
                        : p === "MOIS" ? "Mois"
                        : p === "TRIMESTRE" ? "Trimestre"
                        : p === "ANNEE" ? "Année"
                        : "Perso"}
                    </button>
                  ))}
                </div>
                <div className="occ-date-range">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setPreset("CUSTOM"); }}
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setPreset("CUSTOM"); }}
                  />
                </div>
              </div>

              {/* Source + Recherche — masqués pour COLLABORATEUR */}
              {!isCollaborateur && (
                <>
                  <div className="occ-filter-group">
                    <span className="occ-filter-label">Source</span>
                    <div className="btn-group btn-group-sm">
                      {(["TOUS", "PROJET", "LEAD"] as const).map(t => (
                        <button
                          key={t}
                          className={`btn ${type === t ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setType(t)}
                        >
                          {t === "TOUS" ? "Tous" : t === "PROJET" ? "Projets" : "Opportunités"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="occ-filter-group ms-auto">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Rechercher un collaborateur…"
                      style={{ minWidth: 220 }}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* KPIs */}
            {!loading && !error && filtered.length > 0 && (
              <div className="row g-3 mb-4">
                <div className="col-6 col-sm-3">
                  <div className="occ-kpi occ-kpi-disponible">
                    <span className="occ-kpi-count">{counts.DISPONIBLE}</span>
                    <span className="occ-kpi-label">Disponible</span>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="occ-kpi occ-kpi-optimal">
                    <span className="occ-kpi-count">{counts.OPTIMAL}</span>
                    <span className="occ-kpi-label">Optimal</span>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="occ-kpi occ-kpi-surcharge">
                    <span className="occ-kpi-count">{counts.SURCHARGE}</span>
                    <span className="occ-kpi-label">Surchargé</span>
                  </div>
                </div>
                <div className="col-6 col-sm-3">
                  <div className="occ-kpi occ-kpi-total">
                    <span className="occ-kpi-count">{filtered.length}</span>
                    <span className="occ-kpi-label">Total</span>
                  </div>
                </div>
              </div>
            )}

            {/* États */}
            {loading && (
              <div className="occ-state">
                <div className="spinner-border text-primary" role="status" />
                <span>Chargement…</span>
              </div>
            )}

            {!loading && error && (
              <div className="alert alert-danger">{error}</div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="occ-state text-muted">
                Aucune donnée d'occupation sur cette période.
              </div>
            )}

            {/* Grille de cartes */}
            {!loading && !error && filtered.length > 0 && (
              <div className="row g-3">
                {filtered.map(dto => (
                  <div key={dto.profilId} className="col-12 col-md-6 col-xl-4">
                    <OccupationCard dto={dto} />
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default OccupationCollaborateurPage;
