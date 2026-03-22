// ─── Types ────────────────────────────────────────────────────────────────────

export type TypeReference  = "LOT" | "PHASE" | "SPRINT" | "LIVRABLE";
export type TypePaiement   = "POURCENTAGE" | "MONTANT_FIXE";
export type StatutPaiement = "EN_ATTENTE" | "PAYE" | "PARTIELLEMENT_PAYE" | "ANNULE";

export interface CalendrierPaiement {
  id: number;
  libelle: string;
  typeReference: TypeReference;
  referenceId: number;
  referenceNom?: string | null;
  typePaiement: TypePaiement;
  pourcentage?: number | null;
  montantAPayer: number;
  datePaiement: string;             // ISO yyyy-MM-dd
  statut: StatutPaiement;
  datePaiementEffectif?: string | null;
  commentaire?: string | null;
  backlogId: number;
  paidByUserId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CalendrierPaiementCreateDTO {
  libelle: string;
  typeReference: TypeReference;
  referenceId: number;
  referenceNom?: string;
  typePaiement: TypePaiement;
  pourcentage?: number | null;
  montantAPayer: number;
  datePaiement: string;
  commentaire?: string;
  backlogId: number;
}

/**
 * Totaux retournés par GET /backlog/{backlogId}/totaux
 *
 *  - totalPlanifie : somme des montants non annulés
 *  - totalPaye     : somme des montants payés
 *  - caProjet      : CA encaissé au niveau du projet (projet_ca_encaisse)
 *  - montantOffre  : budget de l'offre technique du lead
 *                    = lead_tech_fin_details_montant ("Budget nécessaire")
 *                    Vaut 0 si le projet n'est pas issu d'un lead.
 *  - resteAPayer   : max(0, montantOffre − totalPaye)
 */
export interface TotauxPaiement {
  totalPlanifie: number;
  totalPaye: number;
  caProjet: number;
  montantOffre: number;
  resteAPayer: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CalendrierPaiementService {
  private readonly api: any;
  private readonly BASE = "/projet/calendrier-paiements";

  constructor(api: any) {
    this.api = api;
  }

  /** Toutes les échéances d'un backlog. */
  async getByBacklogId(backlogId: number): Promise<CalendrierPaiement[]> {
    try {
      const r = await this.api.get(`${this.BASE}/backlog/${backlogId}`);
      return r.data ?? [];
    } catch { return []; }
  }

  /** Crée une échéance. */
  async create(dto: CalendrierPaiementCreateDTO): Promise<CalendrierPaiement> {
    const r = await this.api.post(this.BASE, dto);
    return r.data;
  }

  /** Met à jour une échéance (EN_ATTENTE seulement). */
  async update(
    id: number,
    dto: Partial<CalendrierPaiementCreateDTO>
  ): Promise<CalendrierPaiement> {
    const r = await this.api.put(`${this.BASE}/${id}`, dto);
    return r.data;
  }

  /**
   * Valide le paiement d'une échéance.
   * → statut = PAYE, projet.projet_ca_encaisse += montantAPayer
   *
   * @param userId  user.userId de l'utilisateur connecté (AuthContext)
   */
  async payer(id: number, userId: number): Promise<CalendrierPaiement> {
    const r = await this.api.post(`${this.BASE}/${id}/payer`, { userId });
    return r.data;
  }

  /** Annule une échéance (statut → ANNULE). */
  async annuler(id: number): Promise<void> {
    await this.api.post(`${this.BASE}/${id}/annuler`);
  }

  /** Supprime une échéance EN_ATTENTE. */
  async delete(id: number): Promise<void> {
    await this.api.delete(`${this.BASE}/${id}`);
  }

  /**
   * Totaux consolidés :
   * totalPlanifie, totalPaye, caProjet, montantOffre, resteAPayer
   */
  async getTotaux(backlogId: number): Promise<TotauxPaiement> {
    try {
      const r = await this.api.get(`${this.BASE}/backlog/${backlogId}/totaux`);
      return {
        totalPlanifie: r.data.totalPlanifie ?? 0,
        totalPaye:     r.data.totalPaye     ?? 0,
        caProjet:      r.data.caProjet      ?? 0,
        montantOffre:  r.data.montantOffre  ?? 0,
        resteAPayer:   r.data.resteAPayer   ?? 0,
      };
    } catch {
      return { totalPlanifie: 0, totalPaye: 0, caProjet: 0, montantOffre: 0, resteAPayer: 0 };
    }
  }
}