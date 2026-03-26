import React, { useState, useMemo } from 'react';
import Header from '../../../../components/header/Header.tsx';
import Button from '../../../../components/button/Button.tsx';
import { FaPlus } from 'react-icons/fa';
import FilterBar from '../../../../components/filters/FilterBar.tsx';
import Table from '../../../../components/table/Table.tsx';
import MenuListeProjet from '../menu/MenuListeProjet.tsx';
import FormProjet from '../form/FormProjet.tsx';
import ProjetDetails from '../form/details/ProjetDetails.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ListeProjet.css';
import { Projet } from '../../../../types/projet/Projet.tsx';
import BacklogProjetModal from '../backlog/BacklogProjetModal.tsx';
import { ProjetAvancement } from '../../../../services/projet/ProjetAvancementService.tsx';

// ─── Statuts ──────────────────────────────────────────────────────────────────

interface StatutMeta { label: string; color: string; bg: string; }

const STATUT_META: Record<number, StatutMeta> = {
  1: { label: 'À faire',      color: '#6366f1', bg: '#eef2ff' },
  2: { label: 'Réouvert',     color: '#e84c3d', bg: '#fde8e8' },
  3: { label: 'En cours',     color: '#3b82f6', bg: '#eff6ff' },
  4: { label: 'Résolu',       color: '#f59e0b', bg: '#fffbeb' },
  5: { label: 'Livré Dev',    color: '#8b5cf6', bg: '#f5f3ff' },
  6: { label: 'Vérifié Dev',  color: '#0ea5e9', bg: '#f0f9ff' },
  7: { label: 'Livré Qualif', color: '#f97316', bg: '#fff7ed' },
  8: { label: 'Validé',       color: '#10b981', bg: '#ecfdf5' },
  9: { label: 'Terminé',      color: '#14b8a6', bg: '#f0fdfa' },
};

// ─── Composants utilitaires ───────────────────────────────────────────────────

const StatutBadge: React.FC<{ statutId: number | null; loading: boolean }> = ({ statutId, loading }) => {
  if (loading) return <div className="avancement-skeleton" style={{ width: 90 }} />;
  if (statutId === null) return <span className="projet-statut-badge projet-statut-badge--none">Ouvert</span>;
  const meta = STATUT_META[statutId];
  if (!meta) return null;
  return (
    <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}>
      <span className="projet-statut-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
};

const MiniBar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div style={{ height: 5, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 999, transition: 'width .4s' }} />
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  projets: Projet[]; statutMap: Map<number, number>;
  avancements: Map<number, ProjetAvancement>; loading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ projets, statutMap, avancements, loading }) => {
  const stats = useMemo(() => {
    const now = new Date();

    const parStatut = new Map<number, number>();
    statutMap.forEach(sid => parStatut.set(sid, (parStatut.get(sid) ?? 0) + 1));

    let totalPaye = 0, totalOffre = 0;
    avancements.forEach(a => { totalPaye += a.totalPaye; totalOffre += a.montantOffre; });
    const pctPaiement = totalOffre > 0 ? Math.round((totalPaye / totalOffre) * 100) : null;

    const enRetard = projets.filter(p => {
      if (!p.dateFinPrevu) return false;
      return new Date(p.dateFinPrevu) < now && statutMap.get(p.idProjet ?? 0) !== 9;
    }).length;

    const sansCP = projets.filter(p => !p.userCp).length;

    const cpCount = new Map<string, number>();
    projets.forEach(p => { const k = p.userCp?.username ?? '__sans__'; cpCount.set(k, (cpCount.get(k) ?? 0) + 1); });
    const topCP  = [...cpCount.entries()].filter(([k]) => k !== '__sans__').sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCP  = topCP[0]?.[1] ?? 1;

    const topPay = [...avancements.entries()]
      .filter(([, a]) => a.montantOffre > 0)
      .map(([id, a]) => ({
        id,
        nom: projets.find(p => (p.idProjet ?? 0) === id)?.nomProjet ?? `Projet #${id}`,
        pct: Math.round(a.avancementPaiement),
        paye: a.totalPaye,
        offre: a.montantOffre,
      }))
      .sort((a, b) => b.offre - a.offre)
      .slice(0, 5);

    const statutsSorted = [...parStatut.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxStatut     = statutsSorted[0]?.[1] ?? 1;

    const soon = projets.filter(p => {
      if (!p.dateFinPrevu) return false;
      const diff = (new Date(p.dateFinPrevu).getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 30 && statutMap.get(p.idProjet ?? 0) !== 9;
    }).length;

    return { parStatut, pctPaiement, totalPaye, totalOffre, enRetard, sansCP, topCP, maxCP, topPay, statutsSorted, maxStatut, soon, total: projets.length };
  }, [projets, statutMap, avancements]);

  const skl = (w = 80) => <div style={{ height: 14, width: w, background: '#e5e7eb', borderRadius: 4, display: 'inline-block' }} />;

  const card: React.CSSProperties   = { background: 'white', border: '1px solid #f1f0ea', borderRadius: 12, padding: '16px 18px' };
  const metric: React.CSSProperties = { background: '#f9f8f5', borderRadius: 10, padding: '12px 14px' };

  return (
    <div style={{ marginBottom: 28 }}>

      {/* ── 4 métriques ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: 12 }}>

        <div style={metric}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Projets actifs</div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#111827', lineHeight: 1 }}>{loading ? skl(40) : stats.total}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{loading ? skl(60) : `${stats.total - (stats.parStatut.get(9) ?? 0)} en cours`}</div>
        </div>

        <div style={metric}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Encaissement global</div>
          <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: stats.pctPaiement != null && stats.pctPaiement >= 75 ? '#059669' : '#111827' }}>
            {loading ? skl(50) : stats.pctPaiement != null ? `${stats.pctPaiement} %` : '—'}
          </div>
          {!loading && stats.totalOffre > 0 && (
            <>
              <MiniBar pct={stats.pctPaiement ?? 0} color={stats.pctPaiement! >= 75 ? '#059669' : stats.pctPaiement! >= 40 ? '#3b82f6' : '#f59e0b'} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {stats.totalPaye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} / {stats.totalOffre.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </div>
            </>
          )}
        </div>

        <div style={{ ...metric, borderLeft: stats.enRetard > 0 ? '3px solid #ef4444' : '3px solid #10b981' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>En retard</div>
          <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: stats.enRetard > 0 ? '#dc2626' : '#059669' }}>{loading ? skl(30) : stats.enRetard}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{loading ? skl(70) : stats.enRetard > 0 ? 'Date de fin dépassée' : 'Tous dans les délais'}</div>
        </div>

        <div style={{ ...metric, borderLeft: '3px solid #6366f1' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>CA projet</div>
          <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, color: '#111827' }}>
            {loading ? skl(50) : stats.totalOffre > 0
              ? stats.totalOffre.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
              : '—'}
          </div>
          {!loading && stats.totalOffre > 0 && (
            <>
              <MiniBar pct={stats.pctPaiement ?? 0} color="#6366f1" />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {stats.totalPaye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} encaissé · {stats.pctPaiement ?? 0} %
              </div>
            </>
          )}
          {!loading && stats.totalOffre === 0 && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Aucune offre renseignée</div>
          )}
        </div>      
      </div>

      {/* ── 3 panels ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) minmax(0,0.9fr)', gap: 12 }}>

        {/* Statuts */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 12 }}>Répartition des statuts</div>
          {loading
            ? [1,2,3,4].map(i => <div key={i} style={{ height: 20, background: '#f3f4f6', borderRadius: 4, marginBottom: 8 }} />)
            : stats.statutsSorted.length === 0
              ? <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Aucun statut enregistré</div>
              : stats.statutsSorted.map(([sid, count]) => {
                  const meta = STATUT_META[sid]; if (!meta) return null;
                  return (
                    <div key={sid} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</span>
                      <div style={{ flex: 2, height: 5, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((count / stats.maxStatut) * 100)}%`, background: meta.color, borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  );
                })
          }
          {!loading && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, background: '#ecfdf5', color: '#059669', borderRadius: 20, padding: '2px 8px', fontWeight: 500 }}>{stats.parStatut.get(9) ?? 0} terminés</span>
              {stats.enRetard > 0 && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', borderRadius: 20, padding: '2px 8px', fontWeight: 500 }}>{stats.enRetard} en retard</span>}
              {stats.soon > 0 && <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', borderRadius: 20, padding: '2px 8px', fontWeight: 500 }}>{stats.soon} échéances &lt; 30j</span>}
            </div>
          )}
        </div>

        {/* Paiements */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 12 }}>Avancement paiements</div>
          {loading
            ? [1,2,3,4,5].map(i => <div key={i} style={{ height: 32, background: '#f3f4f6', borderRadius: 4, marginBottom: 8 }} />)
            : stats.topPay.length === 0
              ? <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Aucune offre renseignée</div>
              : stats.topPay.map(({ id, nom, pct, paye, offre }) => {
                  const color = pct >= 100 ? '#059669' : pct >= 50 ? '#3b82f6' : '#f59e0b';
                  return (
                    <div key={id} style={{ marginBottom: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: '#374151', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{nom}</span>
                        <span style={{ fontWeight: 500, color, flexShrink: 0 }}>{pct} %</span>
                      </div>
                      <div style={{ height: 5, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 999 }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {paye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} / {offre.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Charge CP */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 12 }}>Charge par chef de projet</div>
          {loading
            ? [1,2,3,4].map(i => <div key={i} style={{ height: 28, background: '#f3f4f6', borderRadius: 4, marginBottom: 8 }} />)
            : stats.topCP.length === 0
              ? <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>Aucun CP assigné</div>
              : stats.topCP.map(([nom, count], idx) => {
                  const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#8b5cf6'];
                  const color  = colors[idx % colors.length];
                  const initials = nom.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={nom} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: color + '22', color, fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', flexShrink: 0, marginLeft: 4 }}>{count}</span>
                        </div>
                        <div style={{ height: 4, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round((count / stats.maxCP) * 100)}%`, background: color, borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>
                  );
                })
          }
          {!loading && stats.sansCP > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#dc2626' }}>Sans CP</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#dc2626' }}>{stats.sansCP}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ListeProjetProps {
  projets:       Projet[];
  statutMap:     Map<number, number>;
  avancements:   Map<number, ProjetAvancement>;
  loading:       boolean;
  onProjetSaved: () => Promise<void>;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const ListeProjet: React.FC<ListeProjetProps> = ({
  projets, statutMap, avancements, loading, onProjetSaved,
}) => {
  const [search,                   setSearch]                   = useState('');
  const [showFormProjet,           setShowFormProjet]           = useState(false);
  const [selectedProjet,           setSelectedProjet]           = useState<Projet | null>(null);
  const [showProjetDetails,        setShowProjetDetails]        = useState(false);
  const [expandedRowId,            setExpandedRowId]            = useState<number | null>(null);
  const [showBacklogModal,         setShowBacklogModal]         = useState(false);
  const [selectedProjetForBacklog, setSelectedProjetForBacklog] = useState<Projet | null>(null);

  /**
   * formDirty : passe à true dès que FormProjet appelle onSubmit avec succès.
   * handleCloseFormProjet déclenche onProjetSaved si formDirty=true à la fermeture.
   * Cela couvre le cas où l'utilisateur ferme via la croix après une création réussie
   * (FormProjet ferme le modal avec setTimeout interne après onSubmit).
   */
  const [formDirty, setFormDirty] = useState(false);

  // ── Données filtrées ──────────────────────────────────────────────────────
  const filteredProjets = useMemo(() => {
    if (!search.trim()) return projets;
    const q = search.toLowerCase();
    return projets.filter(p =>
      p.nomProjet?.toLowerCase().includes(q) ||
      (p.refBC ?? '').toLowerCase().includes(q) ||
      (p.userCp?.username ?? '').toLowerCase().includes(q) ||
      (p.lead?.leadName ?? '').toLowerCase().includes(q)
    );
  }, [projets, search]);

  // ── Handlers Backlog ──────────────────────────────────────────────────────
  const handleOpenBacklog  = (p: Projet) => { setSelectedProjetForBacklog(p); setShowBacklogModal(true); };
  const handleCloseBacklog = ()          => { setShowBacklogModal(false); setSelectedProjetForBacklog(null); };

  // ── Fermeture FormProjet ─────────────────────────────────────────────────
  const handleCloseFormProjet = async () => {
    setShowFormProjet(false);
    setSelectedProjet(null);
    if (formDirty) {
      setFormDirty(false);
      await onProjetSaved();
    }
  };

  // ── Colonnes ──────────────────────────────────────────────────────────────
  const columns = [
    { key: 'nomProjet', label: 'Nom du projet' },
    {
      key: 'lead', label: 'Opportunité associée',
      render: (row: Projet) => row.lead ? `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}` : '-',
    },
    { key: 'refBC',     label: 'Réf BC' },
    { key: 'refCompte', label: 'Réf Compte' },
    {
      key: 'dateAttribution', label: "Date d'attribution",
      render: (row: Projet) => row.dateAttribution ? new Date(row.dateAttribution).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateDebutPrevu', label: 'Date de début prévu',
      render: (row: Projet) => row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-',
    },
    {
      key: 'dateFinPrevu', label: 'Date de fin prévu',
      render: (row: Projet) => {
        if (!row.dateFinPrevu) return '-';
        const fin    = new Date(row.dateFinPrevu);
        const retard = fin < new Date() && statutMap.get(row.idProjet ?? 0) !== 9;
        return (
          <span style={{ color: retard ? '#dc2626' : 'inherit', fontWeight: retard ? 500 : 'normal' }}>
            {fin.toLocaleDateString('fr-FR')}
            {retard && <span style={{ marginLeft: 4, fontSize: 10, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '1px 5px' }}>Retard</span>}
          </span>
        );
      },
    },
    {
      key: 'userCp', label: 'Chef de projet',
      render: (row: Projet) => row.userCp?.username || <span style={{ color: '#f59e0b', fontSize: 12 }}>Non assigné</span>,
    },
    {
      key: 'userSuppleante', label: 'Suppléante',
      render: (row: Projet) => row.userSuppleante?.username || '-',
    },
    {
      key: 'statut', label: 'Statut',
      render: (row: Projet) => <StatutBadge statutId={statutMap.get(row.idProjet ?? 0) ?? null} loading={loading} />,
    },
    {
      key: 'avancement', label: 'Avancement paiement',
      render: (row: Projet) => {
        const a = avancements.get(row.idProjet ?? 0);
        if (loading) return <div className="avancement-skeleton" />;
        if (!a || a.montantOffre === 0)
          return (
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {a && a.totalPaye > 0 ? `${a.totalPaye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} encaissé` : "Pas d'offre"}
            </span>
          );
        const pct   = a.avancementPaiement;
        const color = pct >= 100 ? '#059669' : pct >= 50 ? '#3b82f6' : '#f59e0b';
        return (
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 3 }}>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>
                {a.totalPaye.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                <span style={{ color: '#9ca3af' }}> / {a.montantOffre.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</span>
              </span>
              <span style={{ fontWeight: 700, color }}>{pct.toFixed(0)} %</span>
            </div>
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 999, transition: 'width .4s' }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions', label: 'Actions',
      render: (row: Projet) => (
        <MenuListeProjet
          onDetails={()     => { setSelectedProjet(row); setShowProjetDetails(true); }}
          onEdit={()        => { setSelectedProjet(row); setFormDirty(false); setShowFormProjet(true); }}
          onViewBacklog={() => handleOpenBacklog(row)}
        />
      ),
    },
  ];

  // ── Expanded row ──────────────────────────────────────────────────────────
  const renderExpandedRow = (row: Projet) => {
    const sid  = statutMap.get(row.idProjet ?? 0) ?? null;
    const meta = sid !== null ? STATUT_META[sid] : null;
    return (
      <div className="expanded-row-content p-4 bg-light">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="expanded-label">Lead</label>
            <p className="expanded-text">{row.lead ? `${row.lead.leadRef || '-'} – ${row.lead.leadName || '-'}` : '-'}</p>
          </div>
          <div className="col-md-4">
            <label className="expanded-label">Référence BC</label>
            <p className="expanded-text">{row.refBC || '-'}</p>
          </div>
          <div className="col-md-4">
            <label className="expanded-label">Référence Compte</label>
            <p className="expanded-text">{row.refCompte || '-'}</p>
          </div>
          <div className="col-md-4">
            <label className="expanded-label">Chef de projet</label>
            <p className="expanded-text">{row.userCp?.username || '-'}</p>
          </div>
        </div>
        <div className="row g-3 mt-3">
          <div className="col-md-6">
            <label className="expanded-label">Date de début prévu</label>
            <p className="expanded-text">{row.dateDebutPrevu ? new Date(row.dateDebutPrevu).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
          <div className="col-md-6">
            <label className="expanded-label">Date de fin prévu</label>
            <p className="expanded-text">{row.dateFinPrevu ? new Date(row.dateFinPrevu).toLocaleDateString('fr-FR') : '-'}</p>
          </div>
        </div>
        <div className="row g-3 mt-3">
          <div className="col-md-4">
            <label className="expanded-label">Statut</label>
            <p className="expanded-text" style={{ marginTop: 4 }}>
              {meta
                ? <span className="projet-statut-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '44' }}><span className="projet-statut-dot" style={{ background: meta.color }} />{meta.label}</span>
                : <span className="projet-statut-badge projet-statut-badge--none">Non défini</span>}
            </p>
          </div>
          <div className="col-md-8">
            <label className="expanded-label">Description</label>
            <p className="expanded-text">{row.description || '-'}</p>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="liste-projet-layout">
      <Header />
      <div className="liste-projet-wrapper">
        <main className="liste-projet-main">
          <div className="container-fluid">

            {/* Filtres + créer */}
            <div className="row align-items-center mb-4">
              <div className="col-lg-8 col-md-12 mb-2 mb-lg-0">
                <FilterBar filters={[{ type: 'text', placeholder: 'Rechercher...', onChange: setSearch }]} />
              </div>
              <div className="col-lg-4 col-md-12 text-lg-end">
                <Button
                  label="Créer un projet"
                  icon={<FaPlus />}
                  onClick={() => { setSelectedProjet(null); setFormDirty(false); setShowFormProjet(true); }}
                />
              </div>
            </div>

            {/* Dashboard */}
            <Dashboard projets={projets} statutMap={statutMap} avancements={avancements} loading={loading} />

            {/* Table */}
            <div className="table-responsive mt-3">
              <Table
                columns={columns}
                data={filteredProjets}
                expandedRowId={expandedRowId}
                expandedRow={renderExpandedRow}
              />
            </div>
          </div>
        </main>
      </div>

      {/*
        FormProjet
        - onSubmit : marque formDirty=true (sauvegarde réussie côté API)
        - onClose  : via handleCloseFormProjet → rafraîchit la liste si formDirty
        FormProjet appelle lui-même onClose après un setTimeout(1500ms) interne ;
        handleCloseFormProjet sera appelé à ce moment-là et déclenchera onProjetSaved.
      */}
      <FormProjet
        show={showFormProjet}
        onClose={handleCloseFormProjet}
        projet={selectedProjet}
        onSubmit={async (_saved) => {
          setFormDirty(true);
        }}
      />

      {/* Détails Projet */}
      <ProjetDetails
        show={showProjetDetails}
        onClose={() => { setShowProjetDetails(false); setSelectedProjet(null); }}
        projet={selectedProjet}
      />

      {/* Backlog */}
      <BacklogProjetModal
        show={showBacklogModal}
        onClose={handleCloseBacklog}
        projetId={selectedProjetForBacklog?.idProjet ?? 0}
        projetNom={selectedProjetForBacklog?.nomProjet}
        leadId={selectedProjetForBacklog?.lead?.leadId ?? null}
        projectStartDate={selectedProjetForBacklog?.dateDebutPrevu ?? null}
        projectEndDate={selectedProjetForBacklog?.dateFinPrevu ?? null}
      />
    </div>
  );
};

export default ListeProjet;