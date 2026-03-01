import { CreateBacklogForProjetRequest } from "../../../types/projet/backlog/BacklogProjet.tsx";
import { Backlog } from "../../../types/lead/Backlog/Backlog.tsx";

export class BacklogProjetService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Crée un backlog rattaché directement à un projet (sans lead). */
  async createForProjet(payload: CreateBacklogForProjetRequest): Promise<Backlog> {
    const response = await this.api.post("/projet/backlogs/projet", payload);
    return response.data;
  }

  /** En-tête du backlog rattaché à un projet. */
  async getHeaderByProjetId(projetId: number): Promise<Backlog | null> {
    try {
      const response = await this.api.get(`/projet/backlogs/projet/${projetId}`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  /**
   * En-tête du backlog rattaché à un lead.
   * Utilisé pour récupérer le backlog lead avant de l'attacher au projet.
   * GET /api/backlogs/lead/{leadId}  → retourne la liste, on prend le premier
   */
  async getHeaderByLeadId(leadId: number): Promise<Backlog | null> {
    try {
      const response = await this.api.get(`/backlogs/lead/${leadId}`);
      const list: Backlog[] = response.data;
      return list.length > 0 ? list[0] : null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  /** Charge le backlog complet par son ID. */
  async getFullById(backlogId: number): Promise<Backlog> {
    const response = await this.api.get(`/projet/backlogs/${backlogId}/full`);
    return response.data;
  }

  /** Charge le backlog complet d'un projet. */
  async getFullByProjetId(projetId: number): Promise<Backlog | null> {
    try {
      const response = await this.api.get(`/projet/backlogs/projet/${projetId}/full`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  /** Met à jour le backlog (nom, description). */
  async update(backlogId: number, payload: { name: string; desc?: string }): Promise<Backlog> {
    const response = await this.api.put(`/projet/backlogs/${backlogId}`, payload);
    return response.data;
  }

  /**
   * Rattache un backlog existant (issu d'un lead) à un projet.
   * PATCH /api/projet/backlogs/{backlogId}/attach-projet
   */
  async attachToProjet(backlogId: number, projetId: number): Promise<void> {
    await this.api.patch(`/projet/backlogs/${backlogId}/attach-projet`, { projetId });
  }

  /** Supprime un backlog. */
  async delete(backlogId: number): Promise<void> {
    await this.api.delete(`/projet/backlogs/${backlogId}`);
  }
}