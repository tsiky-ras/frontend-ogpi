import React, { useEffect, useState, useCallback } from "react";
import ComparaisonOpportuniteProjet, {
  ComparaisonProps,
  LotPlan,
  CalendrierItem,
  ProfilBudget,
} from "./ComparaisonOpportuniteProjet";
import {
  useComparaisonService,
  ComparaisonProjetGlobal,
  ComparaisonPlanningLot as ApiLot,
} from "../../services/projet/comparaison/ComparaisonService";

// ─── Helpers de conversion ────────────────────────────────────────────────────

/**
 * Convertit les lots du backend (planning comparé) en LotPlan du composant.
 * On choisit d'utiliser les dates du backlog lead ou projet selon la source.
 */
function apiLotsToLotPlan(lots: ApiLot[], source: "lead" | "projet"): LotPlan[] {
  return lots.map((lot) => ({
    id: source === "lead" ? (lot.leadLotId ?? 0) : (lot.projetLotId ?? 0),
    name: lot.lotName,
    order: lot.lotOrder,
    dateDebut: source === "lead" ? lot.leadLotDateDebut : lot.projetLotDateDebut,
    dateFin:   source === "lead" ? lot.leadLotDateFin   : lot.projetLotDateFin,
    phases: (lot.phases ?? []).map((ph) => ({
      id:       source === "lead" ? (ph.leadPhaseId ?? 0) : (ph.projetPhaseId ?? 0),
      name:     ph.phaseName,
      order:    ph.phaseOrder,
      dateDebut: source === "lead" ? ph.leadPhaseDateDebut : ph.projetPhaseDateDebut,
      dateFin:   source === "lead" ? ph.leadPhaseDateFin   : ph.projetPhaseDateFin,
    })),
  }));
}

/**
 * Convertit les detailProfils du backend en ProfilBudget du composant.
 *
 * Mapping des 4 niveaux JH :
 *  volumeOffreCommerciale ← jhOffreVenduAttribue   (offre proratée)
 *  volumeLead             ← jhBacklogLead           (backlog lead)
 *  volumeBacklogProjet    ← jhBacklogProjet         (backlog projet)
 *  volumeProjet           ← jhRealise               (time_spent)
 */
function apiProfilsToProfilBudget(
  data: ComparaisonProjetGlobal
): ProfilBudget[] {
  return (data.detailProfils ?? []).map((p) => ({
    id:                   p.backlogProfilId,
    name:                 p.profilName,
    tjm:                  p.tjm,
    tjmProjet:            p.tjm,            // même TJM (backlog profil est partagé)
    volumeOffreCommerciale: p.jhOffreVenduAttribue,
    volumeLead:           p.jhBacklogLead,
    volumeBacklogProjet:  p.jhBacklogProjet,
    volumeProjet:         p.jhRealise,
    budgetBacklogLead:    p.budgetBacklogLead,
  }));
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  projetId: number;
}

const ComparaisonOpportuniteProjetPage: React.FC<Props> = ({ projetId }) => {
  const { getByProjetId } = useComparaisonService();
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<ComparaisonProps | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Un seul appel API — le backend consolide tout
      const global: ComparaisonProjetGlobal = await getByProjetId(projetId);

      // Lots depuis le planning comparé
      const leadLots:   LotPlan[] = apiLotsToLotPlan(global.planningLots ?? [], "lead");
      const projetLots: LotPlan[] = apiLotsToLotPlan(global.planningLots ?? [], "projet");

      // Profils convertis
      const profils: ProfilBudget[] = apiProfilsToProfilBudget(global);

      // Calendrier paiements — non fourni par l'endpoint global (données agrégées)
      // Le composant affiche ca_planifie et ca_encaisse depuis les totaux
      const calendrier: CalendrierItem[] = [];

      setData({
        // Planning
        leadLots,
        projetLots,
        leadDateDebut:   global.projetDateDebutPrevu ?? null,
        leadDateFin:     global.projetDateFinPrevu   ?? null,
        projetDateDebut: global.projetDateDebutPrevu ?? null,
        projetDateFin:   global.projetDateFinPrevu   ?? null,

        // Profils JH
        profils,

        // Offre commerciale
        jhOffreCommerciale:   global.offreJhVendu,
        montantOffreLead:     global.offreMontantSigne,
        budgetOffreCommerciale: global.offreMontantSigne,
        deviseAbr:            global.deviseAbr ?? "€",

        // Charges & CA
        chargesAnnexes: global.totalChargesAnnexes,
        caEncaisse:     global.caEncaisse,
        calendrier,

        // Données enrichies depuis le nouveau backend (pour OngletMargeCommerciale)
        detailProfils: (global.detailProfils ?? []).map((p) => ({
          backlogProfilId:      p.backlogProfilId,
          profilName:           p.profilName,
          tjm:                  p.tjm,
          jhOffreVendu:         p.jhOffreVenduAttribue,
          jhBacklogLead:        p.jhBacklogLead,
          jhBacklogProjet:      p.jhBacklogProjet,
          jhRealise:            p.jhRealise,
          margeCommercialeJH:   p.margeCommercialeJH,
          margePlanningJH:      -p.ecartPlanificationJH,   // convention : + = bien pour le lead
          ecartRealiseJH:       p.ecartRealiseJH,
          budgetBacklogLead:    p.budgetBacklogLead,
          budgetPlanifie:       p.budgetBacklogProjet,
          // Champs enrichis (nouveaux)
          margeCommercialeMontant:    p.margeCommercialeMontant,
          tauxMargeCommercialePct:    p.tauxMargeCommercialePct,
          ecartPlanificationMontant:  p.ecartPlanificationMontant,
          ecartRealiseMontant:        p.ecartRealiseMontant,
          tauxAvancementPct:          p.tauxAvancementPct,
          profilNouveauProjet:        p.profilNouveauProjet,
        })),

        // Totaux montants pour OngletBudget
        montantBacklogLead:       global.montantBacklogLead,
        montantBacklogProjet:     global.montantBacklogProjet,
        margeCommercialeMontant:  global.margeCommercialeMontant,
      });
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors du chargement de la comparaison.");
    } finally {
      setLoading(false);
    }
  }, [projetId, getByProjetId]);

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
 *  INTÉGRATION dans ProjetDetails.tsx
 * ════════════════════════════════════════════════════════════════════════════
 *
 * // 1. Import
 * import ComparaisonOpportuniteProjetPage from "./ComparaisonOpportuniteProjetPage";
 *
 * // 2. Onglet dans le tableau d'onglets
 * { key: "comparaison", label: "📊 Comparaison", icon: ... }
 *
 * // 3. Rendu conditionnel
 * {activeTab === "comparaison" && projet?.idProjet && (
 *   <ComparaisonOpportuniteProjetPage projetId={projet.idProjet} />
 * )}
 *
 * ════════════════════════════════════════════════════════════════════════════
 *  DIFFÉRENCES vs ancienne version (ComparaisonOpportuniteProjetPage)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  AVANT  → 8 appels API séparés (projet, backlog, lots, profils, lineProfils, techFin, calendrier, charges)
 *  APRÈS  → 1 seul appel GET /api/comparaison/projet/{projetId}
 *
 *  AVANT  → buildProfils() calculait la répartition en JS (approximatif)
 *  APRÈS  → répartition calculée en SQL (exact, via prorata jh_lead_profil / jh_lead_total)
 *
 *  AVANT  → marge commerciale manquante par profil en montant
 *  APRÈS  → margeCommercialeMontant + tauxMargeCommercialePct par profil
 *
 *  AVANT  → profils ajoutés en cours de projet (non prévus dans l'offre) ignorés
 *  APRÈS  → profilNouveauProjet = true, écarts affichés comme dépassement total
 *
 *  AVANT  → cout réalisé absent (seulement JH réalisés)
 *  APRÈS  → ecartRealiseMontant = coutRealise − budgetBacklogProjet
 *
 * ════════════════════════════════════════════════════════════════════════════
 *  RÈGLES MÉTIER (rappel)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  MARGE COMMERCIALE   = offre signée (ltf) − backlog LEAD
 *    JH attribué par profil = jh_vendu × (jh_lead_profil / jh_lead_total)
 *
 *  COMPARAISON LEAD ↔ PROJET
 *    Écart JH = jh_backlog_projet − jh_backlog_lead  (+ = dépassement planifié)
 *
 *  RÉALISÉ
 *    Écart JH = jh_realise − jh_backlog_projet       (+ = retard)
 *
 *  BASE FACTURATION CA = budget backlog lead (JH lead × TJM)
 *  MARGE BRUTE         = CA encaissé − budget lead − charges annexes
 */