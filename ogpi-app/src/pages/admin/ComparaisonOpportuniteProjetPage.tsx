/**
 * ComparaisonOpportuniteProjetPage.tsx
 *
 * Page d'intégration — montre comment charger les données depuis le backend
 * et les passer au composant ComparaisonOpportuniteProjet.
 *
 * À placer dans : src/pages/admin/gestion-projet/tabs/
 * Ou créer un onglet dédié dans ProjetDetails.tsx
 */

import React, { useEffect, useState, useCallback } from "react";
import ComparaisonOpportuniteProjet, {
  ComparaisonProps,
  LotPlan,
  CalendrierItem,
  ProfilBudget,
} from "./ComparaisonOpportuniteProjet"; // ajuster le chemin

// ─── Types backend simplifiés ─────────────────────────────────────────────────
// (déjà définis dans vos types/…, ici pour clarté)

interface BacklogLot { id: number; name: string; order: number; dateDebut?: string|null; dateFin?: string|null; phases: BacklogPhase[]; }
interface BacklogPhase { id: number; name: string; order: number; dateDebut?: string|null; dateFin?: string|null; heures?: number|null; }
interface BacklogProfil { id: number; name: string; tjm: number; }
interface BacklogLineProfil { profil: { id: number }; volume: number; }
interface BacklogProjetLineProfil { profil: { id: number; tjm: number; name: string }; timeSpent?: number|null; volume: number; }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de normalisation
// ─────────────────────────────────────────────────────────────────────────────

function normalizeLotPlan(lots: BacklogLot[]): LotPlan[] {
  return lots.map(l => ({
    id: l.id,
    name: l.name,
    order: l.order,
    dateDebut: l.dateDebut,
    dateFin: l.dateFin,
    phases: (l.phases ?? []).map(p => ({
      id: p.id,
      name: p.name,
      order: p.order,
      dateDebut: p.dateDebut,
      dateFin: p.dateFin,
      heures: p.heures,
    })),
  }));
}

function buildProfils(
  leadProfils: BacklogProfil[],
  leadLineProfils: BacklogLineProfil[],
  projetLineProfils: BacklogProjetLineProfil[],
): ProfilBudget[] {
  /**
   * Pour chaque profil du lead :
   *  - volumeLead    = Σ volume sur toutes les lignes du lead
   *  - volumeProjet  = Σ time_spent sur les lignes du projet (même profil par nom/TJM)
   */
  return leadProfils.map(p => {
    const volumeLead = leadLineProfils
      .filter(lp => lp.profil?.id === p.id)
      .reduce((s, lp) => s + (lp.volume ?? 0), 0);

    // Matching par nom (les profils projet ont le même nom que les profils lead)
    const volumeProjet = projetLineProfils
      .filter(lp => lp.profil?.name === p.name || lp.profil?.tjm === p.tjm)
      .reduce((s, lp) => s + (lp.timeSpent ?? 0), 0);

    return { id: p.id, name: p.name, tjm: p.tjm, volumeLead, volumeProjet };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant conteneur
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** ID du projet */
  projetId: number;
  /** Axios instance injectée depuis votre contexte */
  api: any;
}

const ComparaisonOpportuniteProjetPage: React.FC<Props> = ({ projetId, api }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<ComparaisonProps | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ── 1. Projet + Lead associé ──────────────────────────────────────────
      const projetRes  = await api.get(`/projets/${projetId}`);
      const projet     = projetRes.data;
      const leadId: number | null = projet.lead?.leadId ?? null;

      // ── 2. Backlog projet (complet avec lots, phases, profils) ────────────
      const backlogProjetRes = await api.get(`/projet/backlogs/projet/${projetId}/full`).catch(() => ({ data: null }));
      const backlogProjet    = backlogProjetRes.data;
      const backlogProjetId: number | null = backlogProjet?.id ?? null;

      // ── 3. Backlog lead (opportunité) ─────────────────────────────────────
      let backlogLead: any = null;
      let leadProfils: BacklogProfil[]     = [];
      let leadLineProfils: BacklogLineProfil[] = [];
      let leadLots: LotPlan[]              = [];
      let montantOffreLead                 = 0;
      let deviseAbr                        = "€";
      let leadDateDebut: string | null     = null;
      let leadDateFin: string | null       = null;

      if (leadId) {
        // Backlog lead
        const blRes = await api.get(`/backlogs/lead/${leadId}`).catch(() => ({ data: [] }));
        const blList = blRes.data;
        backlogLead = Array.isArray(blList) && blList.length > 0 ? blList[0] : null;

        if (backlogLead?.id) {
          // Lots + phases lead
          const lotsRes = await api.get(`/backlog-lots/backlog/${backlogLead.id}/full`).catch(() => ({ data: [] }));
          leadLots = normalizeLotPlan(lotsRes.data ?? []);

          // Profils lead (TJM)
          const profilsRes = await api.get(`/backlog-profils/backlog/${backlogLead.id}`).catch(() => ({ data: [] }));
          leadProfils = profilsRes.data ?? [];

          // LineProfils lead (volumes)
          const lpRes = await api.get(`/backlog-line-profils/backlog/${backlogLead.id}`).catch(() => ({ data: [] }));
          leadLineProfils = lpRes.data ?? [];
        }

        // Offre tech-fin du lead → montantOffre = CA opportunité
        const techFinRes = await api.get(`/lead-tech-fin-details/lead/${leadId}`).catch(() => ({ data: null }));
        if (techFinRes.data) {
          montantOffreLead = techFinRes.data.montantOffre ?? 0;
          deviseAbr        = techFinRes.data.devise?.abreviation ?? "€";
        }

        // Dates lead
        leadDateDebut = projet.dateDebutPrevu ?? null;
        leadDateFin   = projet.lead?.leadRealDeadLine?.split("T")[0] ?? null;
      }

      // ── 4. Planning projet (lots, phases avec dates réelles) ──────────────
      const projetLots: LotPlan[] = normalizeLotPlan(backlogProjet?.lots ?? []);

      // ── 5. Profils projet (time_spent réel) ───────────────────────────────
      let projetLineProfils: BacklogProjetLineProfil[] = [];
      if (backlogProjetId) {
        const lpProjRes = await api.get(`/projet/backlog-line-profils/backlog/${backlogProjetId}`).catch(() => ({ data: [] }));
        projetLineProfils = lpProjRes.data ?? [];
      }

      const profils = buildProfils(leadProfils, leadLineProfils, projetLineProfils);

      // ── 6. Calendrier paiements (admin) ───────────────────────────────────
      let calendrier: CalendrierItem[] = [];
      let caEncaisse = 0;

      if (backlogProjetId) {
        const calRes = await api.get(`/projet/calendrier-paiements/backlog/${backlogProjetId}`).catch(() => ({ data: [] }));
        calendrier = (calRes.data ?? []).map((c: any) => ({
          id: c.id,
          libelle: c.libelle,
          montantAPayer: Number(c.montantAPayer ?? 0),
          statut: c.statut,
          datePaiement: c.datePaiement,
          typeReference: c.typeReference,
        }));

        // CA encaissé — depuis les totaux
        const totauxRes = await api.get(`/projet/calendrier-paiements/backlog/${backlogProjetId}/totaux`).catch(() => ({ data: {} }));
        caEncaisse = Number(totauxRes.data?.caProjet ?? 0);
      }

      // ── 7. Charges annexes ────────────────────────────────────────────────
      let chargesAnnexes = 0;
      if (backlogProjetId) {
        const chRes = await api.get(`/backlog/charges-annexes/backlog/${backlogProjetId}/total`).catch(() => ({ data: 0 }));
        chargesAnnexes = Number(chRes.data ?? 0);
      }

      // ── 8. Dates projet ───────────────────────────────────────────────────
      const projetDateDebut = projet.dateDebutPrevu ?? null;
      const projetDateFin   = projet.dateFinPrevu   ?? null;

      setData({
        leadLots,
        leadDateDebut,
        leadDateFin,
        projetLots,
        projetDateDebut,
        projetDateFin,
        profils,
        chargesAnnexes,
        montantOffreLead,
        deviseAbr,
        calendrier,
        caEncaisse,
      });
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [projetId, api]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12 }}>
        <span className="spinner-border spinner-border-sm" />
        <span style={{ color: "#7a9ab0", fontSize: 13 }}>Chargement de la comparaison…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger py-3 px-4" style={{ fontSize: 13 }}>
        ✗ {error}
        <button className="btn btn-sm btn-outline-danger ms-3" onClick={load}>Réessayer</button>
      </div>
    );
  }

  if (!data) return null;

  return <ComparaisonOpportuniteProjet {...data} />;
};

export default ComparaisonOpportuniteProjetPage;

/*
 * ════════════════════════════════════════════════════════════════════════════
 *  INTÉGRATION dans ProjetDetails.tsx (exemple)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * // Dans le tableau d'onglets :
 * { key: "comparaison", label: "📊 Comparaison", icon: ... }
 *
 * // Dans le rendu :
 * {activeTab === "comparaison" && projet?.idProjet && (
 *   <ComparaisonOpportuniteProjetPage projetId={projet.idProjet} api={api} />
 * )}
 *
 *
 * ════════════════════════════════════════════════════════════════════════════
 *  RÈGLES MÉTIER RAPPEL
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  PLANNING
 *  ─────────
 *  • Planning offre   : heures des BacklogPlanning (phaseId → heure) du backlog lead
 *                       + dateDebutPrevu / leadRealDeadLine du lead
 *  • Planning réel    : dateDebut / dateFin des phases/lots du backlog projet
 *  • Décalage         : (dateFin_projet – dateFin_lead) en jours ouvrés
 *
 *  BUDGET
 *  ──────
 *  • Budget offre     : Σ (volume_backlog_lead × TJM_profil)    → BudgetTab lead
 *  • Budget réel payé : Σ calendrier_paiement.montant_a_payer WHERE statut = 'PAYE'
 *                       → seul vrai coût validé par l'admin
 *  • Budget RH réel   : Σ (time_spent × TJM) des backlog_line_profil projet
 *                       → indicatif (peut différer des paiements)
 *  • Dépassement      : (paiements PAYE + charges_annexes) – budget_offre
 *
 *  CA (CHIFFRE D'AFFAIRES)
 *  ───────────────────────
 *  • CA Opportunité   : lead_tech_fin_details.lead_tech_fin_details_montant
 *                       (champ "montantOffre" = montant de l'offre financière)
 *  • CA Encaissé      : projet.projet_ca_encaisse
 *                       (incrémenté automatiquement à chaque paiement validé)
 *  • CA Planifié      : Σ calendrier_paiement.montant WHERE statut IN ('EN_ATTENTE', 'PARTIELLEMENT_PAYE')
 *  • Marge brute      : CA_encaissé − paiements_PAYE − charges_annexes
 *  • Taux encaissement: CA_encaissé / montantOffre × 100
 */