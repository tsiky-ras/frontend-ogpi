import { BacklogProjetProfil, OrderUpdateItem } from "../../../types/projet/backlog/BacklogProjet.tsx";
import { Profil } from "../../../types/profil/Profil.tsx";

/**
 * BacklogProjetProfilService
 * Correspond à BacklogProjetProfilController.java
 * Endpoints base : /projet/backlog-profils
 */
export class BacklogProjetProfilService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  // ─────────────────────────────────────────────
  // PROFILS
  // ─────────────────────────────────────────────

  /** POST /projet/backlog-profils */
  async create(payload: {
    name: string;
    desc?: string;
    tjm: number;
    order: number;
    backlogId: number;
  }): Promise<BacklogProjetProfil> {
    const response = await this.api.post("/projet/backlog-profils", payload);
    return response.data;
  }

  /** PUT /projet/backlog-profils/{id} */
  async update(
    id: number,
    payload: { name: string; desc?: string; tjm: number }
  ): Promise<BacklogProjetProfil> {
    const response = await this.api.put(`/projet/backlog-profils/${id}`, payload);
    return response.data;
  }

  /** DELETE /projet/backlog-profils/{id} */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-profils/${id}`);
  }

  /** GET /projet/backlog-profils/{id} */
  async getById(id: number): Promise<BacklogProjetProfil> {
    const response = await this.api.get(`/projet/backlog-profils/${id}`);
    return response.data;
  }

  /**
   * GET /projet/backlog-profils/{id}/collaborateurs
   * Retourne le profil avec ses collaborateurs résolus.
   */
  async getByIdWithCollaborateurs(id: number): Promise<BacklogProjetProfil> {
    const response = await this.api.get(`/projet/backlog-profils/${id}/collaborateurs`);
    return response.data;
  }

  /** GET /projet/backlog-profils/backlog/{backlogId} */
  async getByBacklogId(backlogId: number): Promise<BacklogProjetProfil[]> {
    const response = await this.api.get(`/projet/backlog-profils/backlog/${backlogId}`);
    return response.data;
  }

  /**
   * GET /projet/backlog-profils/backlog/{backlogId}/with-collaborateurs
   * Retourne tous les profils d'un backlog avec leurs collaborateurs.
   */
  async getByBacklogIdWithCollaborateurs(backlogId: number): Promise<BacklogProjetProfil[]> {
    const response = await this.api.get(
      `/projet/backlog-profils/backlog/${backlogId}/with-collaborateurs`
    );
    return response.data;
  }

  // ─────────────────────────────────────────────
  // COLLABORATEURS
  // ─────────────────────────────────────────────

  /** GET /projet/backlog-profils/{profilId}/collaborateurs/list */
  async getCollaborateurs(profilId: number): Promise<Profil[]> {
    const response = await this.api.get(
      `/projet/backlog-profils/${profilId}/collaborateurs/list`
    );
    return response.data;
  }

  /**
   * PUT /projet/backlog-profils/{profilId}/collaborateurs
   * Remplace la liste complète des collaborateurs d'un profil.
   * Body : [1, 2, 3]
   */
  async replaceCollaborateurs(profilId: number, collaborateurIds: number[]): Promise<void> {
    await this.api.put(
      `/projet/backlog-profils/${profilId}/collaborateurs`,
      collaborateurIds
    );
  }

  /**
   * POST /projet/backlog-profils/{profilId}/collaborateurs
   * Ajoute un collaborateur au profil.
   * Body : { profilId: collaborateurId }
   */
  async addCollaborateur(profilId: number, collaborateurId: number): Promise<void> {
    await this.api.post(
      `/projet/backlog-profils/${profilId}/collaborateurs`,
      { profilId: collaborateurId }
    );
  }

  /**
   * DELETE /projet/backlog-profils/{profilId}/collaborateurs/{collaborateurId}
   * Retire un collaborateur d'un profil.
   */
  async removeCollaborateur(profilId: number, collaborateurId: number): Promise<void> {
    await this.api.delete(
      `/projet/backlog-profils/${profilId}/collaborateurs/${collaborateurId}`
    );
  }

  /** updateOrder — utilise PATCH /reorder sur le lot (pas d'endpoint dédié pour les profils) */
  async updateOrder(items: OrderUpdateItem[]): Promise<void> {
    // Le backend n'a pas d'endpoint batch order pour les profils — on fait des PUT unitaires
    await Promise.all(
      items.map(item =>
        this.api.put(`/projet/backlog-profils/${item.id}`, { order: item.order })
      )
    );
  }
}