import { CreateBacklogForProjetRequest } from "../../../types/projet/backlog/BacklogProjet.tsx";
import { Backlog } from "../../../types/lead/Backlog/Backlog.tsx";

/**
 * BacklogProjetService
 * Correspond à BacklogProjetController.java
 * Endpoints base : /api/projet/backlogs   ← (avec un "s" !)
 */
export class BacklogProjetService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /**
   * Crée un backlog rattaché directement à un projet (sans lead).
   * POST /api/projet/backlogs/projet
   */
  async createForProjet(payload: CreateBacklogForProjetRequest): Promise<Backlog> {
    const response = await this.api.post("/projet/backlogs/projet", payload);
    return response.data;
  }

  /**
   * Récupère l'en-tête du backlog d'un projet (sans hiérarchie complète).
   * GET /api/projet/backlogs/projet/{projetId}
   */
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
   * Charge le backlog complet d'un projet.
   * GET /api/projet/backlogs/projet/{projetId}/full
   */
  async getFullByProjetId(projetId: number): Promise<Backlog | null> {
    try {
      const response = await this.api.get(`/projet/backlogs/projet/${projetId}/full`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  /**
   * Charge le backlog complet par son ID.
   * GET /api/projet/backlogs/{id}/full
   */
  async getFullById(backlogId: number): Promise<Backlog> {
    const response = await this.api.get(`/projet/backlogs/${backlogId}/full`);
    return response.data;
  }

  /**
   * Met à jour le backlog (nom, description).
   * PUT /api/projet/backlogs/{id}
   */
  async update(
    backlogId: number,
    payload: { name: string; desc?: string }
  ): Promise<Backlog> {
    const response = await this.api.put(`/projet/backlogs/${backlogId}`, payload);
    return response.data;
  }

  /**
   * Rattache un backlog existant (créé depuis un lead) à un projet.
   * PATCH /api/projet/backlogs/{backlogId}/attach-projet
   */
  async attachToProjet(backlogId: number, projetId: number): Promise<void> {
    await this.api.patch(`/projet/backlogs/${backlogId}/attach-projet`, { projetId });
  }

  /**
   * Supprime un backlog.
   * DELETE /api/projet/backlogs/{id}
   */
  async delete(backlogId: number): Promise<void> {
    await this.api.delete(`/projet/backlogs/${backlogId}`);
  }
}