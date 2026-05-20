/**
 * CalendrierPaiementService.tsx
 * Correspond à CalendrierPaiementController.java
 * Base URL : /api/projet/calendrier-paiements
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TypeReference = "LOT" | "PHASE" | "SPRINT" | "LIVRABLE";
export type TypePaiement  = "POURCENTAGE" | "MONTANT_FIXE";
export type StatutPaiement = "EN_ATTENTE" | "PAYE" | "PARTIELLEMENT_PAYE" | "ANNULE";

export interface CalendrierPaiement {
  id:                    number;
  libelle:               string;
  typeReference:         TypeReference;
  referenceId:           number;
  referenceNom?:         string | null;
  typePaiement:          TypePaiement;
  pourcentage?:          number | null;
  /** Total encaissé = montant de base + chargeAnnexe */
  montantAPayer:         number;
  /** Frais annexes inclus dans montantAPayer (transport, hébergement, per diem…) */
  chargeAnnexe:          number;
  datePaiement:          string;           // ISO date YYYY-MM-DD
  statut:                StatutPaiement;
  datePaiementEffectif?: string | null;    // ISO datetime
  commentaire?:          string | null;
  createdAt?:            string | null;
  updatedAt?:            string | null;
  backlogId:             number;
  paidByUserId?:         number | null;
}

export interface CalendrierPaiementCreateDTO {
  libelle:       string;
  typeReference: TypeReference;
  referenceId:   number;
  referenceNom?: string;
  typePaiement:  TypePaiement;
  pourcentage?:  number;
  /** Total = montant de base + chargeAnnexe */
  montantAPayer: number;
  /** Frais annexes à tracer séparément (0 par défaut) */
  chargeAnnexe:  number;
  datePaiement:  string;
  commentaire?:  string;
  backlogId:     number;
}

export interface TotauxPaiement {
  totalPlanifie: number;
  totalPaye:     number;
  caProjet:      number;
  montantOffre:  number;
  resteAPayer:   number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CalendrierPaiementService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Toutes les échéances d'un backlog. */
  async getByBacklogId(backlogId: number): Promise<CalendrierPaiement[]> {
    try {
      const r = await this.api.get(`/projet/calendrier-paiements/backlog/${backlogId}`);
      return (r.data ?? []).map(normalizeEcheance);
    } catch { return []; }
  }

  /** Totaux : totalPlanifie, totalPaye, caProjet, montantOffre, resteAPayer */
  async getTotaux(backlogId: number): Promise<TotauxPaiement> {
    try {
      const r = await this.api.get(`/projet/calendrier-paiements/backlog/${backlogId}/totaux`);
      return r.data ?? {};
    } catch {
      return { totalPlanifie: 0, totalPaye: 0, caProjet: 0, montantOffre: 0, resteAPayer: 0 };
    }
  }

  /** Crée une échéance. */
  async create(dto: CalendrierPaiementCreateDTO): Promise<CalendrierPaiement> {
    const r = await this.api.post(`/projet/calendrier-paiements`, dto);
    return normalizeEcheance(r.data);
  }

  /** Met à jour une échéance EN_ATTENTE. */
  async update(id: number, dto: CalendrierPaiementCreateDTO): Promise<CalendrierPaiement> {
    const r = await this.api.put(`/projet/calendrier-paiements/${id}`, dto);
    return normalizeEcheance(r.data);
  }

  /** Valide le paiement → statut PAYE, projet_ca_encaisse += montantAPayer */
  async payer(id: number, userId: number): Promise<CalendrierPaiement> {
    const r = await this.api.post(`/projet/calendrier-paiements/${id}/payer`, { userId });
    return normalizeEcheance(r.data);
  }

  /** Annule une échéance. */
  async annuler(id: number): Promise<void> {
    await this.api.post(`/projet/calendrier-paiements/${id}/annuler`);
  }

  /** Supprime une échéance EN_ATTENTE. */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/projet/calendrier-paiements/${id}`);
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Garantit que chargeAnnexe est toujours un number (jamais null/undefined).
 * Protège contre les anciennes lignes en base qui n'ont pas encore la colonne.
 */
function normalizeEcheance(raw: any): CalendrierPaiement {
  return {
    ...raw,
    chargeAnnexe: raw.chargeAnnexe ?? raw.charge_annexe ?? 0,
  };
}