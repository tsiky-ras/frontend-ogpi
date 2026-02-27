import {
  BacklogColumn,
  BacklogLineColumnValue,
  CreateBacklogColumnRequest,
  UpdateBacklogColumnRequest,
  UpsertBacklogLineColumnValueRequest,
} from "../../../types/projet/backlog/BacklogProjet.tsx";

/**
 * BacklogProjetColumnService
 * Correspond à BacklogColumnController.java
 * Endpoints base : /projet/backlog-columns
 */
export class BacklogProjetColumnService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  // ─────────────────────────────────────────────
  // COLONNES
  // ─────────────────────────────────────────────

  /** POST /projet/backlog-columns */
  async createColumn(payload: CreateBacklogColumnRequest): Promise<BacklogColumn> {
    const response = await this.api.post("/projet/backlog-columns", payload);
    return response.data;
  }

  /** PUT /projet/backlog-columns/{id} */
  async updateColumn(id: number, payload: UpdateBacklogColumnRequest): Promise<BacklogColumn> {
    const response = await this.api.put(`/projet/backlog-columns/${id}`, payload);
    return response.data;
  }

  /**
   * DELETE /projet/backlog-columns/{id}
   * Supprime la colonne et toutes ses valeurs (CASCADE en BDD).
   */
  async deleteColumn(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-columns/${id}`);
  }

  /** GET /projet/backlog-columns/{id} */
  async getColumnById(id: number): Promise<BacklogColumn> {
    const response = await this.api.get(`/projet/backlog-columns/${id}`);
    return response.data;
  }

  /** GET /projet/backlog-columns/sprint/{sprintId} */
  async getColumnsBySprintId(sprintId: number): Promise<BacklogColumn[]> {
    const response = await this.api.get(`/projet/backlog-columns/sprint/${sprintId}`);
    return response.data;
  }

  // ─────────────────────────────────────────────
  // VALEURS
  // ─────────────────────────────────────────────

  /**
   * PUT /projet/backlog-columns/values
   * Crée ou met à jour la valeur d'une colonne pour une ligne donnée (upsert côté serveur).
   */
  async upsertValue(payload: UpsertBacklogLineColumnValueRequest): Promise<BacklogLineColumnValue> {
    const response = await this.api.put("/projet/backlog-columns/values", payload);
    return response.data;
  }

  /**
   * DELETE /projet/backlog-columns/values/{id}
   * Supprime une valeur par son ID.
   */
  async deleteValue(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-columns/values/${id}`);
  }

  /**
   * GET /projet/backlog-columns/values/line/{lineId}
   * Retourne toutes les valeurs d'une ligne, avec la définition de colonne résolue.
   */
  async getValuesByLineId(lineId: number): Promise<BacklogLineColumnValue[]> {
    const response = await this.api.get(
      `/projet/backlog-columns/values/line/${lineId}`
    );
    return response.data;
  }
}