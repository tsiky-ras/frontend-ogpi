/**
 * CalendrierPaiementService.tsx
 * Correspond à CalendrierPaiementController.java
 * Base URL : /api/projet/calendrier-paiements
 */
export class CalendrierPaiementService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Toutes les échéances d'un backlog. */
  async getByBacklogId(backlogId: number): Promise<any[]> {
    try {
      const r = await this.api.get(`/projet/calendrier-paiements/backlog/${backlogId}`);
      return r.data ?? [];
    } catch { return []; }
  }

  /** Totaux : totalPlanifie, totalPaye, caProjet, montantOffre, resteAPayer */
  async getTotaux(backlogId: number): Promise<Record<string, number>> {
    try {
      const r = await this.api.get(`/projet/calendrier-paiements/backlog/${backlogId}/totaux`);
      return r.data ?? {};
    } catch { return {}; }
  }

  /** Crée une échéance. */
  async create(dto: any): Promise<any> {
    const r = await this.api.post(`/projet/calendrier-paiements`, dto);
    return r.data;
  }

  /** Met à jour une échéance EN_ATTENTE. */
  async update(id: number, dto: any): Promise<any> {
    const r = await this.api.put(`/projet/calendrier-paiements/${id}`, dto);
    return r.data;
  }

  /** Valide le paiement (admin). → statut PAYE, projet_ca_encaisse += montant */
  async payer(id: number, userId: number): Promise<any> {
    const r = await this.api.post(`/projet/calendrier-paiements/${id}/payer`, { userId });
    return r.data;
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