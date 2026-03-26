import React, { useState, useEffect, useCallback } from "react";
import {
  FaPlus, FaEdit, FaTrash, FaMoneyBillWave, FaTimes,
  FaSpinner, FaCheckCircle, FaBan, FaCalendarAlt,
  FaLayerGroup, FaStream, FaBolt, FaGift,
  FaChevronDown, FaChevronRight, FaInfoCircle,
  FaExclamationTriangle, FaShieldAlt,
} from "react-icons/fa";
import { Modal, Form } from "react-bootstrap";
import "./CalendrierPaiementTab.css";

import {
  CalendrierPaiementService,
  CalendrierPaiement,
  CalendrierPaiementCreateDTO,
  TypeReference,
  TypePaiement,
  StatutPaiement,
  TotauxPaiement,
} from "../../../../services/projet/backlog/CalendrierPaiementService.tsx";
import { BacklogLot, BacklogPhase } from "../../../../types/lead/Backlog/Backlog.tsx";
import { BacklogSprint, BacklogDelivrableProjet } from "../../../../types/projet/backlog/BacklogProjet.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, devise = "") =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${devise ? " " + devise : ""}`;

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

// ─── Métadonnées statut ───────────────────────────────────────────────────────

const STATUT_META: Record<StatutPaiement, { label: string; cls: string; icon?: React.ReactNode }> = {
  EN_ATTENTE:         { label: "En attente",        cls: "cp-badge-statut--en-attente", icon: <FaCalendarAlt size={9} /> },
  PAYE:               { label: "Payé",               cls: "cp-badge-statut--paye",       icon: <FaCheckCircle size={9} /> },
  PARTIELLEMENT_PAYE: { label: "Partiellement payé", cls: "cp-badge-statut--partiel" },
  ANNULE:             { label: "Annulé",             cls: "cp-badge-statut--annule",     icon: <FaBan size={9} /> },
};

const StatutBadge: React.FC<{ statut: StatutPaiement }> = ({ statut }) => {
  const m = STATUT_META[statut];
  return (
    <span className={`cp-badge-statut ${m.cls}`}>
      {m.icon} {m.label}
    </span>
  );
};

// ─── Métadonnées type référence ───────────────────────────────────────────────

const TYPE_REF_META: Record<TypeReference, { label: string; icon: React.ReactNode }> = {
  LOT:      { label: "Lot",      icon: <FaLayerGroup size={9} /> },
  PHASE:    { label: "Phase",    icon: <FaStream size={9} /> },
  SPRINT:   { label: "Sprint",   icon: <FaBolt size={9} /> },
  LIVRABLE: { label: "Livrable", icon: <FaGift size={9} /> },
};

const TypeRefBadge: React.FC<{ type: TypeReference; nom?: string | null }> = ({ type, nom }) => (
  <span className={`cp-badge-ref cp-badge-ref--${type}`}>
    {TYPE_REF_META[type].icon} {TYPE_REF_META[type].label}{nom ? ` — ${nom}` : ""}
  </span>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalendrierPaiementTabProps {
  backlogId: number | null;
  lots: BacklogLot[];
  sprints: Map<number, BacklogSprint[]>;
  deliverables: Map<number, BacklogDelivrableProjet[]>;
  deviseAbr: string;
  /** Montant offre technique du lead (priorité sur totaux.montantOffre du backend). */
  montantOffre?: number;
  service: CalendrierPaiementService;
  /**
   * Appelé après chaque paiement validé.
   * Permet à ProjetDetails de rafraîchir le calendrier dans l'onglet Comparaison
   * et à ListeProjet de rafraîchir la barre de progression paiement.
   */
  onPaiementValide?: () => void;
}

const EMPTY_FORM = {
  libelle: "",
  typeReference: "LOT" as TypeReference,
  referenceId: null as number | null,
  referenceNom: "",
  typePaiement: "POURCENTAGE" as TypePaiement,
  pourcentage: null as number | null,
  montantAPayer: 0,
  datePaiement: "",
  commentaire: "",
};

// ─── Composant principal ──────────────────────────────────────────────────────

const CalendrierPaiementTab: React.FC<CalendrierPaiementTabProps> = ({
  backlogId,
  lots,
  sprints,
  deliverables,
  deviseAbr,
  montantOffre: montantOffreProp = 0,
  service,
  onPaiementValide,
}) => {
  const { user } = useAuth();

  const [echeances, setEcheances]   = useState<CalendrierPaiement[]>([]);
  const [totaux, setTotaux]         = useState<TotauxPaiement>({
    totalPlanifie: 0, totalPaye: 0, caProjet: 0, montantOffre: 0, resteAPayer: 0,
  });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const montantOffre = montantOffreProp > 0 ? montantOffreProp : totaux.montantOffre;
  const resteAPayer  = montantOffre > 0
    ? Math.max(0, montantOffre - totaux.totalPaye)
    : totaux.resteAPayer;

  const rg1_depassement = montantOffre > 0 && totaux.totalPlanifie > montantOffre;
  const rg1_excedent    = montantOffre > 0 ? totaux.totalPlanifie - montantOffre : 0;
  const rg2_proche = montantOffre > 0
    && !rg1_depassement
    && totaux.totalPlanifie > montantOffre * 0.9;

  const [showModal, setShowModal]           = useState(false);
  const [editItem, setEditItem]             = useState<CalendrierPaiement | null>(null);
  const [form, setForm]                     = useState({ ...EMPTY_FORM });
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState<string | null>(null);

  const [payingId, setPayingId]             = useState<number | null>(null);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [payTarget, setPayTarget]           = useState<CalendrierPaiement | null>(null);

  const [groupBy, setGroupBy]               = useState<"date" | "reference">("date");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["all"]));

  // ── Chargement ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!backlogId) return;
    setLoading(true);
    try {
      const [data, tots] = await Promise.all([
        service.getByBacklogId(backlogId),
        service.getTotaux(backlogId),
      ]);
      setEcheances(data);
      setTotaux(tots);
      setExpandedGroups(new Set(["all"]));
    } catch { setError("Impossible de charger le calendrier de paiement."); }
    finally { setLoading(false); }
  }, [backlogId, service]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Structure helpers — gardes ?? [] pour éviter .map sur undefined ───────
  const safeLots = lots ?? [];

  const getAllPhases = (): BacklogPhase[] =>
    safeLots.flatMap(l => (l.phases ?? []) as BacklogPhase[]);

  const getAllSprints = (): BacklogSprint[] =>
    Array.from((sprints ?? new Map()).values()).flat();

  const getAllDeliverables = (): BacklogDelivrableProjet[] =>
    Array.from((deliverables ?? new Map()).values()).flat();

  const getReferenceOptions = (type: TypeReference) => {
    switch (type) {
      case "LOT":      return safeLots.map(l => ({ id: l.id, nom: l.name }));
      case "PHASE":    return getAllPhases().map(p => ({ id: p.id, nom: p.name }));
      case "SPRINT":   return getAllSprints().map(s => ({ id: s.id, nom: s.name }));
      case "LIVRABLE": return getAllDeliverables().map(d => ({ id: d.id, nom: d.name }));
      default:         return [];
    }
  };

  const calcMontantPct = (pct: number | null): number => {
    if (pct != null && montantOffre > 0)
      return Math.round(montantOffre * pct / 100 * 100) / 100;
    return 0;
  };

  const calcExcedentSiAjout = (montant: number): number => {
    if (montantOffre <= 0) return 0;
    const base = editItem
      ? totaux.totalPlanifie - (editItem.montantAPayer ?? 0)
      : totaux.totalPlanifie;
    return Math.max(0, base + montant - montantOffre);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (e: CalendrierPaiement) => {
    setEditItem(e);
    setForm({
      libelle:       e.libelle,
      typeReference: e.typeReference,
      referenceId:   e.referenceId,
      referenceNom:  e.referenceNom ?? "",
      typePaiement:  e.typePaiement,
      pourcentage:   e.pourcentage ?? null,
      montantAPayer: e.montantAPayer,
      datePaiement:  e.datePaiement,
      commentaire:   e.commentaire ?? "",
    });
    setFormError(null);
    setShowModal(true);
  };

  const setF = (k: string, v: any) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if ((k === "typePaiement" || k === "pourcentage") && next.typePaiement === "POURCENTAGE")
        next.montantAPayer = calcMontantPct(next.pourcentage);
      if (k === "typeReference")
        next.referenceId = null;
      if (k === "referenceId" && v != null) {
        const found = getReferenceOptions(next.typeReference).find(o => o.id === v);
        next.referenceNom = found?.nom ?? "";
      }
      return next;
    });
  };

  const formMontant  = form.typePaiement === "POURCENTAGE" ? calcMontantPct(form.pourcentage) : form.montantAPayer;
  const formExcedent = calcExcedentSiAjout(formMontant);

  const saveForm = async () => {
    if (!form.libelle.trim()) { setFormError("Le libellé est requis."); return; }
    if (!form.referenceId)    { setFormError("Sélectionnez une référence."); return; }
    if (!form.datePaiement)   { setFormError("La date de paiement est requise."); return; }
    if (form.typePaiement === "POURCENTAGE" && !form.pourcentage)
      { setFormError("Le pourcentage est requis."); return; }
    if (form.typePaiement === "MONTANT_FIXE" && !form.montantAPayer)
      { setFormError("Le montant est requis."); return; }
    if (formExcedent > 0 && montantOffre > 0)
      { setFormError(`Ce montant dépasse le budget offre de ${fmt(formExcedent, deviseAbr)}.`); return; }
    if (!backlogId) return;

    setSaving(true); setFormError(null);
    try {
      const dto: CalendrierPaiementCreateDTO = {
        libelle:       form.libelle,
        typeReference: form.typeReference,
        referenceId:   form.referenceId!,
        referenceNom:  form.referenceNom,
        typePaiement:  form.typePaiement,
        pourcentage:   form.typePaiement === "POURCENTAGE" ? form.pourcentage ?? undefined : undefined,
        montantAPayer: formMontant,
        datePaiement:  form.datePaiement,
        commentaire:   form.commentaire || undefined,
        backlogId,
      };
      if (editItem) {
        const updated = await service.update(editItem.id, dto);
        setEcheances(prev => prev.map(e => e.id === editItem.id ? updated : e));
      } else {
        const created = await service.create(dto);
        setEcheances(prev => [...prev, created]);
      }
      const tots = await service.getTotaux(backlogId);
      setTotaux(tots);
      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? "Erreur lors de la sauvegarde.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette échéance ?")) return;
    try {
      await service.delete(id);
      setEcheances(prev => prev.filter(e => e.id !== id));
      if (backlogId) setTotaux(await service.getTotaux(backlogId));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Impossible de supprimer.");
    }
  };

  const handleAnnuler = async (id: number) => {
    if (!window.confirm("Annuler cette échéance ?")) return;
    try {
      await service.annuler(id);
      setEcheances(prev => prev.map(e => e.id === id ? { ...e, statut: "ANNULE" as StatutPaiement } : e));
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Impossible d'annuler.");
    }
  };

  const openPayConfirm = (e: CalendrierPaiement) => { setPayTarget(e); setShowPayConfirm(true); };

  // ── confirmPayer — appelle onPaiementValide après succès ──────────────────
  const confirmPayer = async () => {
    if (!payTarget || !user?.userId) return;
    setPayingId(payTarget.id);
    try {
      const updated = await service.payer(payTarget.id, user.userId);
      setEcheances(prev => prev.map(e => e.id === payTarget.id ? updated : e));
      if (backlogId) setTotaux(await service.getTotaux(backlogId));
      setShowPayConfirm(false);
      setPayTarget(null);
      // Notifie ProjetDetails → rafraîchit onglet Comparaison + ListeProjet barre
      onPaiementValide?.();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Erreur lors du paiement.");
    } finally { setPayingId(null); }
  };

  const toggleGroup = (key: string) =>
    setExpandedGroups(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });

  const getGroupedEcheances = () => {
    const active = echeances.filter(e => e.statut !== "ANNULE");
    const annule = echeances.filter(e => e.statut === "ANNULE");
    const map = new Map<string, CalendrierPaiement[]>();
    active.forEach(e => {
      const key = groupBy === "date"
        ? (e.datePaiement?.slice(0, 7) ?? "Sans date")
        : `${e.typeReference}:${e.referenceId}:${e.referenceNom ?? ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return { grouped: Array.from(map.entries()), annule };
  };

  const formatGroupKey = (key: string): React.ReactNode => {
    if (groupBy === "date") {
      if (key === "Sans date") return <span className="text-muted">Sans date</span>;
      const [y, m] = key.split("-");
      return new Date(+y, +m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    const [type, , nom] = key.split(":");
    return <TypeRefBadge type={type as TypeReference} nom={nom} />;
  };

  const isOverdue = (e: CalendrierPaiement) =>
    e.statut === "EN_ATTENTE" && !!e.datePaiement && new Date(e.datePaiement) < new Date();

  const progBase    = montantOffre > 0 ? montantOffre : totaux.totalPlanifie;
  const progPct     = progBase > 0 ? Math.min(100, Math.round(totaux.totalPaye     / progBase * 100)) : 0;
  const progPlanPct = progBase > 0 ? Math.min(100, Math.round(totaux.totalPlanifie / progBase * 100)) : 0;

  if (!backlogId) return (
    <div className="cp-empty"><p>Aucun backlog sélectionné.</p></div>
  );

  const { grouped, annule } = getGroupedEcheances();

  return (
    <div className="cp-wrapper">

      {/* ── KPI ── */}
      <div className="cp-kpi-grid">
        {[
          { label: "Budget offre technique", value: fmt(montantOffre, deviseAbr),        cls: "cp-kpi-card--charcoal", icon: <FaShieldAlt /> },
          { label: "Paiement planifié",               value: fmt(totaux.totalPlanifie, deviseAbr), cls: "cp-kpi-card--tuscan",   icon: <FaCalendarAlt /> },
          { label: "Payé par le client",               value: fmt(totaux.totalPaye, deviseAbr),     cls: "cp-kpi-card--success",  icon: <FaCheckCircle /> },
          { label: "Reste à encaisser",          value: fmt(resteAPayer, deviseAbr),          cls: resteAPayer <= 0 && montantOffre > 0 ? "cp-kpi-card--success" : "cp-kpi-card--tomato", icon: <FaMoneyBillWave /> },
          { label: "CA Projet",              value: fmt(totaux.caProjet, deviseAbr),      cls: "cp-kpi-card--blue",     icon: <FaMoneyBillWave /> },
        ].map(k => (
          <div key={k.label} className={`cp-kpi-card ${k.cls}`}>
            <div className="cp-kpi-icon">{k.icon}</div>
            <div>
              <div className="cp-kpi-label">{k.label}</div>
              <div className="cp-kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alertes RG ── */}
      {rg1_depassement && (
        <div className="cp-rg-alert">
          <FaExclamationTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Dépassement du budget offre</strong> — Le total planifié ({fmt(totaux.totalPlanifie, deviseAbr)}) dépasse le budget offre de <strong>{fmt(rg1_excedent, deviseAbr)}</strong>.
          </div>
        </div>
      )}
      {rg2_proche && (
        <div className="cp-rg-alert cp-rg-alert--warn">
          <FaExclamationTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Budget presque atteint</strong> — {Math.round(totaux.totalPlanifie / montantOffre * 100)} % du budget offre est planifié. Reste : <strong>{fmt(resteAPayer, deviseAbr)}</strong>.
          </div>
        </div>
      )}

      {/* ── Barre de progression ── */}
      {(montantOffre > 0 || totaux.totalPlanifie > 0) && (
        <div className="cp-progress-wrap">
          <div className="cp-progress-head">
            <span>Progression encaissement</span>
            <span className={progPct >= 100 ? "cp-done" : ""}>{progPct} %</span>
          </div>
          <div className="cp-progress-track">
            <div className="cp-progress-planifie" style={{ width: `${progPlanPct}%` }} />
            <div className="cp-progress-paye"     style={{ width: `${progPct}%` }} />
          </div>
          <div className="cp-progress-legend">
            <span><span className="cp-legend-dot" style={{ background: "#2d8f47" }} />Payé : {fmt(totaux.totalPaye, deviseAbr)}</span>
            <span><span className="cp-legend-dot" style={{ background: "rgba(234,191,91,.4)" }} />Planifié : {fmt(totaux.totalPlanifie, deviseAbr)}</span>
            {montantOffre > 0 && <span>Base offre : {fmt(montantOffre, deviseAbr)}</span>}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="cp-toolbar">
        <div className="cp-group-btns">
          {(["date", "reference"] as const).map(g => (
            <button key={g}
              className={`cp-group-btn${groupBy === g ? " active" : ""}`}
              onClick={() => setGroupBy(g)}>
              {g === "date" ? "Par date" : "Par référence"}
            </button>
          ))}
        </div>
        <button className="cp-btn-add" onClick={openAdd}>
          <FaPlus size={10} /> Ajouter une échéance
        </button>
      </div>

      {/* ── Contenu ── */}
      {loading && <div className="cp-loading"><FaSpinner className="cp-spin" /> Chargement…</div>}
      {!loading && error && <div className="cp-error">{error}</div>}

      {!loading && !error && echeances.length === 0 && (
        <div className="cp-empty">
          <div className="cp-empty-icon"><FaCalendarAlt size={32} /></div>
          <p>Aucune échéance de paiement planifiée.</p>
          <small>Ajoutez des échéances par lot, phase, sprint ou livrable.</small>
        </div>
      )}

      {!loading && !error && echeances.length > 0 && (
        <div className="cp-groups">
          {grouped.map(([key, items]) => {
            const isOpen      = expandedGroups.has(key) || expandedGroups.has("all");
            const totalGroupe = items.reduce((s, e) => s + e.montantAPayer, 0);
            const totalPaye   = items.filter(e => e.statut === "PAYE").reduce((s, e) => s + e.montantAPayer, 0);
            return (
              <div key={key} className="cp-group">
                <div className="cp-group-header" onClick={() => toggleGroup(key)}>
                  <div className="cp-group-header__left">
                    <span className="cp-group-chevron">
                      {isOpen ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </span>
                    <span className="cp-group-title">{formatGroupKey(key)}</span>
                    <span className="cp-group-count">{items.length} échéance{items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="cp-group-totals">
                    <span className="cp-group-total-plan">{fmt(totalGroupe, deviseAbr)}</span>
                    {totalPaye > 0 && <span className="cp-group-total-paye">✓ {fmt(totalPaye, deviseAbr)}</span>}
                  </div>
                </div>
                {isOpen && (
                  <div className="cp-group-body">
                    {items.map(e => (
                      <EcheanceCard key={e.id} echeance={e} deviseAbr={deviseAbr}
                        isOverdue={isOverdue(e)} payingId={payingId}
                        onEdit={() => openEdit(e)}
                        onDelete={() => handleDelete(e.id)}
                        onAnnuler={() => handleAnnuler(e.id)}
                        onPayer={() => openPayConfirm(e)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {annule.length > 0 && (
            <>
              <div className="cp-annule-header" onClick={() => toggleGroup("__annule__")}>
                <span className="cp-group-chevron">
                  {expandedGroups.has("__annule__") ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                </span>
                <FaBan size={10} style={{ color: "#5F6F6E" }} />
                <span style={{ fontSize: ".8rem", color: "#5F6F6E", fontWeight: 600 }}>
                  Annulées ({annule.length})
                </span>
              </div>
              {expandedGroups.has("__annule__") && (
                <div className="cp-annule-body">
                  {annule.map(e => (
                    <EcheanceCard key={e.id} echeance={e} deviseAbr={deviseAbr}
                      isOverdue={false} payingId={null}
                      onEdit={() => {}} onDelete={() => handleDelete(e.id)}
                      onAnnuler={() => {}} onPayer={() => {}}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ Modal Formulaire ══ */}
      <Modal show={showModal} onHide={() => !saving && setShowModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ background: "#223A46", color: "#fff" }}>
          <Modal.Title style={{ fontSize: "1rem" }}>
            {editItem ? "Modifier l'échéance" : "Nouvelle échéance de paiement"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#fafaf9" }}>
          {formError && <div className="cp-form-error">{formError}</div>}
          {formExcedent > 0 && montantOffre > 0 && !formError && (
            <div className="cp-rg-alert" style={{ marginBottom: 12 }}>
              <FaExclamationTriangle size={12} style={{ flexShrink: 0 }} />
              Ce montant dépasserait le budget offre de <strong>{fmt(formExcedent, deviseAbr)}</strong>.
              Reste disponible : <strong>{fmt(resteAPayer, deviseAbr)}</strong>.
            </div>
          )}
          <div className="cp-form-grid">
            <div className="cp-field cp-form-full">
              <label className="cp-label">Libellé *</label>
              <input className="cp-input" value={form.libelle}
                onChange={e => setF("libelle", e.target.value)}
                placeholder="Ex : Paiement fin lot 1" disabled={saving} />
            </div>
            <div className="cp-field">
              <label className="cp-label">Type *</label>
              <select className="cp-input" value={form.typeReference}
                onChange={e => setF("typeReference", e.target.value)} disabled={saving}>
                {(Object.keys(TYPE_REF_META) as TypeReference[]).map(t => (
                  <option key={t} value={t}>{TYPE_REF_META[t].label}</option>
                ))}
              </select>
            </div>
            <div className="cp-field">
              <label className="cp-label">{TYPE_REF_META[form.typeReference].label} *</label>
              <select className="cp-input"
                value={form.referenceId ?? ""}
                onChange={e => setF("referenceId", e.target.value ? +e.target.value : null)}
                disabled={saving}>
                <option value="">— Sélectionner —</option>
                {getReferenceOptions(form.typeReference).map(o => (
                  <option key={o.id} value={o.id}>{o.nom}</option>
                ))}
              </select>
            </div>
            <div className="cp-field">
              <label className="cp-label">Type de paiement *</label>
              <select className="cp-input" value={form.typePaiement}
                onChange={e => setF("typePaiement", e.target.value)} disabled={saving}>
                <option value="POURCENTAGE">Pourcentage (%)</option>
                <option value="MONTANT_FIXE">Montant fixe</option>
              </select>
            </div>
            {form.typePaiement === "POURCENTAGE" ? (
              <div className="cp-field">
                <label className="cp-label">Pourcentage * (% du budget offre)</label>
                <input className="cp-input" type="number" min="0" max="100" step="0.5"
                  value={form.pourcentage ?? ""}
                  onChange={e => setF("pourcentage", e.target.value ? +e.target.value : null)}
                  onWheel={e => (e.target as HTMLInputElement).blur()}
                  disabled={saving} />
                {form.pourcentage != null && montantOffre > 0 && (
                  <div className="cp-hint cp-hint--calc">
                    ≈ {fmt(montantOffre * form.pourcentage / 100, deviseAbr)}
                    {resteAPayer > 0 && <span style={{ marginLeft: 8, color: "#5F6F6E" }}>· Reste : {fmt(resteAPayer, deviseAbr)}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="cp-field">
                <label className="cp-label">Montant ({deviseAbr}) *</label>
                <input className="cp-input" type="number" min="0" step="0.01"
                  value={form.montantAPayer}
                  onChange={e => setF("montantAPayer", +e.target.value || 0)}
                  onWheel={e => (e.target as HTMLInputElement).blur()}
                  disabled={saving} />
                {resteAPayer > 0 && montantOffre > 0 && (
                  <div className="cp-hint">Reste disponible : {fmt(resteAPayer, deviseAbr)}</div>
                )}
              </div>
            )}
            <div className="cp-field">
              <label className="cp-label">Date de paiement prévue *</label>
              <input className="cp-input" type="date" value={form.datePaiement}
                onChange={e => setF("datePaiement", e.target.value)} disabled={saving} />
            </div>
            <div className="cp-field cp-form-full">
              <label className="cp-label">Commentaire</label>
              <Form.Control as="textarea" rows={2} className="cp-input"
                value={form.commentaire}
                onChange={e => setF("commentaire", e.target.value)}
                placeholder="Note optionnelle…" disabled={saving} style={{ resize: "none" }} />
            </div>
            {form.typePaiement === "POURCENTAGE" && form.pourcentage != null && montantOffre > 0 && (
              <div className={`cp-recap-box${formExcedent > 0 ? " cp-recap-box--warn" : ""} cp-form-full`}>
                <FaInfoCircle size={12} style={{ flexShrink: 0 }} />
                <span>
                  <strong>{form.pourcentage} %</strong> = <strong>{fmt(formMontant, deviseAbr)}</strong>
                  {formExcedent > 0 && <span style={{ marginLeft: 8 }}>— ⚠ dépasse de <strong>{fmt(formExcedent, deviseAbr)}</strong></span>}
                </span>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ background: "#fafaf9" }}>
          <button className="cp-btn cp-btn--ghost" onClick={() => setShowModal(false)} disabled={saving}>Annuler</button>
          <button className="cp-btn cp-btn--primary" onClick={saveForm} disabled={saving || formExcedent > 0}>
            {saving && <FaSpinner size={11} className="cp-spin" />}
            {editItem ? "Enregistrer" : "Créer l'échéance"}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ══ Modal confirmation paiement ══ */}
      <Modal show={showPayConfirm} onHide={() => !payingId && setShowPayConfirm(false)} centered>
        <Modal.Header closeButton style={{ background: "#223A46", color: "#fff" }}>
          <Modal.Title style={{ fontSize: "1rem" }}>
            <FaCheckCircle className="me-2" style={{ color: "#4ade80" }} /> Confirmer le paiement
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "#fafaf9" }}>
          {payTarget && (
            <>
              <p style={{ fontSize: ".9rem", marginBottom: 10 }}>Valider le paiement de :</p>
              <div className="cp-confirm-card">
                <div className="cp-confirm-title">{payTarget.libelle}</div>
                <div className="cp-confirm-meta">
                  <TypeRefBadge type={payTarget.typeReference} nom={payTarget.referenceNom} />
                  <span>Prévu le {fmtDate(payTarget.datePaiement)}</span>
                </div>
              </div>
              <div className="cp-confirm-amount">{fmt(payTarget.montantAPayer, deviseAbr)}</div>
              <div className="cp-confirm-warn">
                <FaExclamationTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Action <strong>irréversible</strong>. Le CA projet sera incrémenté de{" "}
                  <strong>{fmt(payTarget.montantAPayer, deviseAbr)}</strong>.
                </span>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ background: "#fafaf9" }}>
          <button className="cp-btn cp-btn--ghost" onClick={() => setShowPayConfirm(false)} disabled={!!payingId}>Annuler</button>
          <button className="cp-btn cp-btn--confirm" onClick={confirmPayer} disabled={!!payingId}>
            {payingId ? <FaSpinner size={11} className="cp-spin" /> : <FaCheckCircle size={11} />}
            Confirmer le paiement
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

// ─── Carte échéance ───────────────────────────────────────────────────────────

interface EcheanceCardProps {
  echeance: CalendrierPaiement;
  deviseAbr: string;
  isOverdue: boolean;
  payingId: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onAnnuler: () => void;
  onPayer: () => void;
}

const EcheanceCard: React.FC<EcheanceCardProps> = ({
  echeance: e, deviseAbr, isOverdue, payingId, onEdit, onDelete, onAnnuler, onPayer,
}) => {
  const isPaye   = e.statut === "PAYE";
  const isAnnule = e.statut === "ANNULE";
  const isPaying = payingId === e.id;

  const cardCls = [
    "cp-card",
    isPaye   ? "cp-card--paye"   : "",
    isAnnule ? "cp-card--annule" : "",
    isOverdue && !isPaye && !isAnnule ? "cp-card--retard" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={cardCls}>
      <div className="cp-card__icon">
        {isPaye    ? <FaCheckCircle size={15} style={{ color: "#2d8f47" }} />
          : isAnnule ? <FaBan size={15} style={{ color: "#94a3b8" }} />
          : isOverdue ? <FaCalendarAlt size={15} style={{ color: "#C93C29" }} />
          : <FaCalendarAlt size={15} style={{ color: "#5F6F6E" }} />}
      </div>
      <div className="cp-card__body">
        <div className="cp-card__title-row">
          <span className="cp-card__title">{e.libelle}</span>
          <StatutBadge statut={e.statut} />
          {isOverdue && <span className="cp-badge-retard">⚠ En retard</span>}
        </div>
        <div className="cp-card__meta">
          <TypeRefBadge type={e.typeReference} nom={e.referenceNom} />
          <span><FaCalendarAlt size={9} style={{ marginRight: 3 }} />Prévu : {fmtDate(e.datePaiement)}</span>
          {isPaye && e.datePaiementEffectif && (
            <span style={{ color: "#2d8f47", fontWeight: 600 }}>✓ Payé le {fmtDate(e.datePaiementEffectif)}</span>
          )}
          {e.typePaiement === "POURCENTAGE" && e.pourcentage != null && (
            <span style={{ color: "#223A46", fontWeight: 600 }}>{e.pourcentage} %</span>
          )}
          {e.commentaire && <span style={{ color: "#94a3b8", fontStyle: "italic" }}>{e.commentaire}</span>}
        </div>
      </div>
      <div className="cp-card__right">
        <div className="cp-card__amount">
          {e.montantAPayer.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {deviseAbr}
        </div>
        {!isAnnule && (
          <div className="cp-card__actions">
            {!isPaye && (
              <button className="cp-btn cp-btn--pay" onClick={onPayer} disabled={isPaying} title="Valider le paiement">
                {isPaying ? <FaSpinner size={9} className="cp-spin" /> : <FaMoneyBillWave size={9} />} Payer
              </button>
            )}
            {!isPaye && <button className="cp-btn cp-btn--edit"   onClick={onEdit}    title="Modifier"><FaEdit size={9} /></button>}
            {!isPaye && <button className="cp-btn cp-btn--cancel" onClick={onAnnuler} title="Annuler"><FaTimes size={9} /></button>}
            {!isPaye && <button className="cp-btn cp-btn--delete" onClick={onDelete}  title="Supprimer"><FaTrash size={9} /></button>}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendrierPaiementTab;