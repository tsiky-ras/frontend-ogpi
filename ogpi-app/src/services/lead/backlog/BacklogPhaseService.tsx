import { AxiosInstance } from "axios";
import { BacklogPhase, BacklogPhaseOrderUpdate } from "../../../types/lead/Backlog/Backlog";

export class BacklogPhaseService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async create(phase: Partial<BacklogPhase>): Promise<BacklogPhase> {
    const response = await this.api.post("/backlog-phases", phase);
    return response.data;
  }

  async update(id: number, phase: Partial<BacklogPhase>): Promise<BacklogPhase> {
    const response = await this.api.put(`/backlog-phases/${id}`, phase);
    return response.data;
  }

  async updateOrder(updates: BacklogPhaseOrderUpdate[]): Promise<void> {
    await this.api.put("/backlog-phases/order", updates);
  }

  async delete(id: number): Promise<void> {
    await this.api.delete(`/backlog-phases/${id}`);
  }

  async getById(id: number): Promise<BacklogPhase> {
    const response = await this.api.get(`/backlog-phases/${id}`);
    return response.data;
  }

  async getByLotId(lotId: number): Promise<BacklogPhase[]> {
    const response = await this.api.get(`/backlog-phases/by-lot/${lotId}`);
    return response.data;
  }

  async getAll(): Promise<BacklogPhase[]> {
    const response = await this.api.get("/backlog-phases");
    return response.data;
  }
}