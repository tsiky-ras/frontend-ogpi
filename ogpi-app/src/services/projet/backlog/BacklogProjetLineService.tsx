import { BacklogLine } from "../../../types/lead/Backlog/Backlog.tsx";
import { BacklogProjetLineProfil, OrderUpdateItem } from "../../../types/projet/backlog/BacklogProjet.tsx";

/**
 * BacklogProjetLineService
 * Correspond à BacklogProjetLineController.java
 * Endpoints base : /projet/backlog-lines
 */
export class BacklogProjetLineService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** POST /projet/backlog-lines */
  async create(payload: {
    epic?: string;
    userStory?: string;
    description?: string;
    resultat?: string;
    order: number;
    phaseId: number;
  }): Promise<BacklogLine> {
    const response = await this.api.post("/projet/backlog-lines", payload);
    return response.data;
  }

  /** PUT /projet/backlog-lines/{id} */
  async update(
    id: number,
    payload: {
      epic?: string;
      userStory?: string;
      description?: string;
      resultat?: string;
      phaseId: number;
      order: number;
    }
  ): Promise<BacklogLine> {
    const response = await this.api.put(`/projet/backlog-lines/${id}`, payload);
    return response.data;
  }

  /** DELETE /projet/backlog-lines/{id} */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-lines/${id}`);
  }

  /** GET /projet/backlog-lines/{id} */
  async getById(id: number): Promise<BacklogLine> {
    const response = await this.api.get(`/projet/backlog-lines/${id}`);
    return response.data;
  }

  /**
   * Mise à jour d'ordre — le backend expose PATCH /{id}/order (unitaire).
   * On envoie les appels en parallèle.
   */
  async updateOrder(items: OrderUpdateItem[]): Promise<void> {
    await Promise.all(
      items.map(item =>
        this.api.patch(`/projet/backlog-lines/${item.id}/order`, { order: item.order })
      )
    );
  }
}

/**
 * BacklogProjetLineProfilService
 * Correspond à BacklogProjetLineProfilController.java
 * Endpoints base : /projet/backlog-line-profils
 */
export class BacklogProjetLineProfilService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** POST /projet/backlog-line-profils */
  async create(payload: {
    volume: number;
    lineId: number;
    profilId: number;
  }): Promise<BacklogProjetLineProfil> {
    const response = await this.api.post("/projet/backlog-line-profils", payload);
    return response.data;
  }

  /** PUT /projet/backlog-line-profils/{id} */
  async update(
    id: number,
    payload: { volume: number; lineId: number; profilId: number }
  ): Promise<BacklogProjetLineProfil> {
    const response = await this.api.put(`/projet/backlog-line-profils/${id}`, payload);
    return response.data;
  }

  /** DELETE /projet/backlog-line-profils/{id} */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-line-profils/${id}`);
  }

  /** GET /projet/backlog-line-profils/{id} */
  async getById(id: number): Promise<BacklogProjetLineProfil> {
    const response = await this.api.get(`/projet/backlog-line-profils/${id}`);
    return response.data;
  }

  /** GET /projet/backlog-line-profils/line/{lineId} */
  async getAllByLineId(lineId: number): Promise<BacklogProjetLineProfil[]> {
    const response = await this.api.get(`/projet/backlog-line-profils/line/${lineId}`);
    return response.data;
  }

  /** GET /projet/backlog-line-profils/backlog/{backlogId} */
  async getAllByBacklogId(backlogId: number): Promise<BacklogProjetLineProfil[]> {
    const response = await this.api.get(
      `/projet/backlog-line-profils/backlog/${backlogId}`
    );
    return response.data;
  }
}