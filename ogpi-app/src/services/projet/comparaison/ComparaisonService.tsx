import { useAuth } from "../../../../src/context/AuthContext.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Détail JH + montants pour un profil unique.
 *
 * Niveaux JH (ordre décroissant) :
 *  1. jhOffreVenduAttribue  — offre signée proratée sur ce profil (lead_tech_fin_details)
 *  2. jhBacklogLead         — proposition technique (backlog lead)
 *  3. jhBacklogProjet       — planifié en exécution (backlog projet)
 *  4. jhRealise             — time_spent, indicatif
 */
export interface ComparaisonProfilJH {
  projetId: number;
  backlogProfilId: number;
  profilName: string;
  tjm: number;

  // Volumes JH (4 niveaux)
  jhOffreVenduAttribue: number;   // Niveau 1 : offre proratée par profil
  jhBacklogLead: number;          // Niveau 2 : backlog lead — référence contractuelle tech
  jhBacklogProjet: number;        // Niveau 3 : backlog projet — planifié
  jhRealise: number;              // Niveau 4 : time_spent — indicatif

  // Budgets (JH × TJM)
  montantSigneAttribue: number;   // Montant offre proraté sur ce profil
  budgetBacklogLead: number;      // JH lead × TJM — base facturation CA
  budgetBacklogProjet: number;    // JH projet × TJM — coût planifié
  coutRealise: number;            // JH réalisé × TJM — coût réel indicatif

  // Marges calculées
  margeCommercialeJH: number;        // jhOffreVenduAttribue − jhBacklogLead  (+ = bien)
  margeCommercialeMontant: number;   // montantSigneAttribue − budgetBacklogLead
  tauxMargeCommercialePct?: number;  // % marge commerciale sur ce profil
  ecartPlanificationJH: number;      // jhBacklogProjet − jhBacklogLead  (+ = dépassement)
  ecartPlanificationMontant: number; // budgetBacklogProjet − budgetBacklogLead
  ecartRealiseJH: number;            // jhRealise − jhBacklogProjet  (+ = retard)
  ecartRealiseMontant: number;       // coutRealise − budgetBacklogProjet
  tauxAvancementPct?: number;        // jhRealise / jhBacklogProjet × 100

  // Métadonnées
  backlogLeadId?: number;
  backlogProjetId?: number;
  profilNouveauProjet: boolean;      // true = profil absent du backlog lead

  // Alias rétrocompatibilité (ancienne API)
  jhOffreVendu?: number;             // = jhOffreVenduAttribue
  margePlanningJH?: number;         // = −ecartPlanificationJH
  budgetPlanifie?: number;          // = budgetBacklogProjet
}

/** Une phase du planning comparé */
export interface ComparaisonPlanningPhase {
  phaseOrder: number;
  phaseName: string;
  leadPhaseId?: number;
  leadPhaseDateDebut?: string | null;
  leadPhaseDateFin?: string | null;
  projetPhaseId?: number;
  projetPhaseDateDebut?: string | null;
  projetPhaseDateFin?: string | null;
}

/** Un lot du planning comparé (avec ses phases) */
export interface ComparaisonPlanningLot {
  lotOrder: number;
  lotName: string;
  leadLotId?: number;
  leadLotDateDebut?: string | null;
  leadLotDateFin?: string | null;
  projetLotId?: number;
  projetLotDateDebut?: string | null;
  projetLotDateFin?: string | null;
  phases: ComparaisonPlanningPhase[];
}

/**
 * DTO global renvoyé par GET /api/comparaison/projet/{projetId}
 *
 * 4 marges calculées côté backend :
 *  1. margeCommercialeJhTotal / margeCommercialeMontant — offre signée vs backlog lead
 *  2. ecartPlanificationJhTotal / ecartPlanificationMontant — backlog lead vs backlog projet
 *  3. margeBudgetaireNette — offre − backlog projet − charges annexes
 *  4. ecartRealiseJhTotal / ecartRealiseMontantTotal — réalisé vs backlog projet
 */
export interface ComparaisonProjetGlobal {
  projetId: number;
  projetNom: string;
  leadId: number;
  leadName?: string;
  leadRef?: string;
  projetDateDebutPrevu?: string | null;
  projetDateFinPrevu?: string | null;
  deviseAbr?: string;

  // Offre signée
  offreMontantSigne: number;
  offreJhVendu: number;
  offreImpot?: number;
  tauxChange?: number;

  // Backlog lead (proposition technique)
  nbProfilsLead: number;
  jhBacklogLeadTotal: number;
  montantBacklogLead: number;

  // Backlog projet (planification)
  nbProfilsProjet: number;
  jhBacklogProjetTotal: number;
  montantBacklogProjet: number;
  jhRealiseTotal: number;
  coutRealiseTotal: number;

  // Charges & CA
  totalChargesAnnexes: number;
  chargesTransport: number;
  chargesHebergement: number;
  chargesPerDiem: number;
  chargesAutre: number;
  caEncaisse: number;
  caPlanifie: number;
  caPaye: number;
  nbEcheances: number;
  nbEcheancesPayees: number;

  // Marges calculées backend
  margeCommercialeJhTotal: number;      // offre JH − backlog lead JH
  margeCommercialeMontant: number;      // offre montant − montant backlog lead
  tauxMargeCommercialePct?: number;
  ecartPlanificationJhTotal: number;   // backlog projet JH − backlog lead JH (+ = dépassement)
  ecartPlanificationMontant: number;
  margeBudgetaireNette: number;        // offre − backlog projet − charges
  tauxMargeBudgetairePct?: number;
  ecartRealiseJhTotal: number;         // réalisé − planifié (+ = retard)
  ecartRealiseMontantTotal: number;
  tauxAvancementGlobalPct?: number;

  // Détails
  detailProfils: ComparaisonProfilJH[];
  planningLots: ComparaisonPlanningLot[];

  // Alias rétrocompatibilité
  offreJhVenduTotal?: number;          // = offreJhVendu
  offreMontantTotal?: number;          // = offreMontantSigne
  margeBudgetaire?: number;            // = margeBudgetaireNette
  margePlanningJhTotal?: number;       // = −ecartPlanificationJhTotal
}

// ─── Hook service ─────────────────────────────────────────────────────────────

export const useComparaisonService = () => {
  const { api } = useAuth();
  const base = "/comparaison";

  /**
   * Récupère la comparaison complète Opportunité ↔ Projet pour un projet.
   *
   * GET /api/comparaison/projet/{projetId}
   *
   * Contient :
   *  - Synthèse globale — 4 marges, totaux JH et montants sur 3 niveaux
   *  - Détail par profil — marge commerciale + écarts lead ↔ projet ↔ réalisé
   *  - Planning Gantt comparé — lots + phases
   */
  const getByProjetId = async (
    projetId: number
  ): Promise<ComparaisonProjetGlobal> => {
    const res = await api.get(`${base}/projet/${projetId}`);
    const d = res.data as ComparaisonProjetGlobal;

    // Normalisation des alias rétrocompatibilité
    d.offreJhVenduTotal  = d.offreJhVenduTotal  ?? d.offreJhVendu;
    d.offreMontantTotal  = d.offreMontantTotal  ?? d.offreMontantSigne;
    d.margeBudgetaire    = d.margeBudgetaire    ?? d.margeBudgetaireNette;
    d.margePlanningJhTotal = d.margePlanningJhTotal ?? -d.ecartPlanificationJhTotal;

    // Normalisation des profils — alias rétrocompatibilité
    d.detailProfils = (d.detailProfils ?? []).map(p => ({
      ...p,
      jhOffreVendu:    p.jhOffreVendu    ?? p.jhOffreVenduAttribue,
      margePlanningJH: p.margePlanningJH ?? -p.ecartPlanificationJH,
      budgetPlanifie:  p.budgetPlanifie  ?? p.budgetBacklogProjet,
    }));

    return d;
  };

  return { getByProjetId };
};