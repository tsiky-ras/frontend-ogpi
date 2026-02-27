import { BacklogLot } from "../../../types/lead/Backlog/Backlog.tsx";
import { OrderUpdateItem } from "../../../types/projet/backlog/BacklogProjet.tsx";

/**
 * BacklogProjetLotService
 * Correspond à BacklogProjetLotController.java
 * Endpoints base : /projet/backlog-lots
 */
export class BacklogProjetLotService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** POST /projet/backlog-lots */
  async create(payload: {
    name: string;
    desc?: string;
    order: number;
    backlogId: number;
  }): Promise<BacklogLot> {
    const response = await this.api.post("/projet/backlog-lots", payload);
    return response.data;
  }

  /** PUT /projet/backlog-lots/{id} */
  async update(id: number, payload: { name: string; desc?: string }): Promise<BacklogLot> {
    const response = await this.api.put(`/projet/backlog-lots/${id}`, payload);
    return response.data;
  }

  /** DELETE /projet/backlog-lots/{id} */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/projet/backlog-lots/${id}`);
  }

  /** GET /projet/backlog-lots/{id} */
  async getById(id: number): Promise<BacklogLot> {
    const response = await this.api.get(`/projet/backlog-lots/${id}`);
    return response.data;
  }

  /** GET /projet/backlog-lots/backlog/{backlogId} */
  async getByBacklogId(backlogId: number): Promise<BacklogLot[]> {
    const response = await this.api.get(`/projet/backlog-lots/backlog/${backlogId}`);
    return response.data;
  }

  /**
   * PATCH /projet/backlog-lots/reorder — met à jour les ordres en batch
   * Body attendu par le backend : [{id, order}, ...]
   */
  async updateOrder(items: OrderUpdateItem[]): Promise<void> {
    await this.api.patch("/projet/backlog-lots/reorder", items);
  }
}