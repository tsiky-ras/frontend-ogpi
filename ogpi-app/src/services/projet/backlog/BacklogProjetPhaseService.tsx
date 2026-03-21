import { BacklogPhase } from "../../../types/lead/Backlog/Backlog.tsx";
import {
  BacklogSprint,
  BacklogDelivrableProjet,
  CreateBacklogSprintRequest,
  UpdateBacklogSprintRequest,
  CreateBacklogDelivrableRequest,
  UpdateBacklogDelivrableRequest,
} from "../../../types/projet/backlog/BacklogProjet.tsx";

/**
 * BacklogProjetPhaseService
 * Correspond à BacklogProjetPhaseController.java
 * Endpoints base : /projet/backlog-phases
 */
export class BacklogProjetPhaseService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  // ─────────────────────────────────────────────
  // PHASES
  // ─────────────────────────────────────────────

  /** POST /projet/backlog-phases */
  async create(payload: {
    name: string;
    order: number;
    lotId: number;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<BacklogPhase> {
    const response = await this.api.post("/projet/backlog-phases", payload);
    return response.data;
  }

  /** PUT /projet/backlog-phases/{id} */
  async update(
    id: number,
    payload: { name: string; order: number, dateDebut?: string; dateFin?: string }
  ): Promise<BacklogPhase> {
    const response = await this.api.put(`/projet/backlog-phases/${id}`, payload);
    return response.data;
  }

  /** DELETE /projet/backlog-phases/{id} */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-phases/${id}`);
  }

  /** GET /projet/backlog-phases/{id} */
  async getById(id: number): Promise<BacklogPhase> {
    const response = await this.api.get(`/projet/backlog-phases/${id}`);
    return response.data;
  }

  /** GET /projet/backlog-phases/{id}/full */
  async getFullById(id: number): Promise<BacklogPhase> {
    const response = await this.api.get(`/projet/backlog-phases/${id}/full`);
    return response.data;
  }

  /** PATCH /projet/backlog-phases/{id}/order */
  async updatePhaseOrder(id: number, order: number): Promise<void> {
    await this.api.patch(`/projet/backlog-phases/${id}/order`, { order });
  }

  // ─────────────────────────────────────────────
  // SPRINTS
  // ─────────────────────────────────────────────

  /** POST /projet/backlog-phases/{phaseId}/sprints */
  async createSprint(payload: {
    name: string;
    order: number;
    phaseId: number;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<BacklogSprint> {
    const response = await this.api.post(
      `/projet/backlog-phases/${payload.phaseId}/sprints`,
      payload
    );
    return response.data;
  }

  /** PUT /projet/backlog-sprints/{id} */
  async updateSprint(id: number, payload: { name: string; order: number, startDate?: string; endDate?: string }): Promise<BacklogSprint> {
    const response = await this.api.put(
      `/projet/backlog-sprints/${id}`,
      {
        name: payload.name,
        order: payload.order,
        dateDebut: payload.startDate,
        dateFin: payload.endDate,
      }
    );
    return response.data;
  }

  /** DELETE /projet/backlog-phases/sprints/{id} */
  async deleteSprint(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-phases/sprints/${id}`);
  }

  /** PATCH /projet/backlog-phases/sprints/{id}/order */
  async updateSprintOrder(id: number, order: number): Promise<void> {
    await this.api.patch(`/projet/backlog-phases/sprints/${id}/order`, { order });
  }

  // ─────────────────────────────────────────────
  // LIVRABLES
  // ─────────────────────────────────────────────

  /** GET /projet/backlog-livrables/phase/{phaseId} */
  async getDeliverablesByPhaseId(phaseId: number): Promise<BacklogDelivrableProjet[]> {
    const response = await this.api.get(`/projet/backlog-livrables/phase/${phaseId}`);
    return response.data;
  }

  /** GET /projet/backlog-livrables/sprint/{sprintId} */
  async getDeliverablesBySprintId(sprintId: number): Promise<BacklogDelivrableProjet[]> {
    const response = await this.api.get(`/projet/backlog-livrables/sprint/${sprintId}`);
    return response.data;
  }

  /** POST /projet/backlog-phases/{phaseId}/livrables */
  async createDeliverable(payload: CreateBacklogDelivrableRequest): Promise<BacklogDelivrableProjet> {
    const response = await this.api.post(
      `/projet/backlog-phases/${payload.phaseId}/livrables`,
      payload
    );
    return response.data;
  }

  /** PUT /projet/backlog-phases/livrables/{id} */
  async updateDeliverable(
    id: number,
    payload: UpdateBacklogDelivrableRequest
  ): Promise<BacklogDelivrableProjet> {
    const response = await this.api.put(`/projet/backlog-phases/livrables/${id}`, payload);
    return response.data;
  }

  /** DELETE /projet/backlog-phases/livrables/{id} */
  async deleteDeliverable(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-phases/livrables/${id}`);
  }

  /**
   * PATCH /projet/backlog-livrables/{id}/deliver
   * Marque le livrable comme livré (is_delivered = true) — action irréversible.
   * Correspond à BacklogProjetDeliverableController.deliver()
   */
  async deliverDeliverable(id: number): Promise<void> {
    await this.api.patch(`/projet/backlog-livrables/${id}/deliver`);
  }
}