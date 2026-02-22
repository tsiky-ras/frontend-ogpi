import { AxiosInstance } from "axios";
import {
  BacklogDeliverable,
  CreateBacklogDeliverableRequest,
  UpdateBacklogDeliverableRequest,
  UpdateDeliverableOrderRequest,
} from "../../../types/lead/Backlog/Backlog.tsx";

export class BacklogDeliverableService {
  private api: AxiosInstance;
  private baseUrl = "/backlog-deliverables";

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getByPhaseId(phaseId: number): Promise<BacklogDeliverable[]> {
    const response = await this.api.get<BacklogDeliverable[]>(
      `${this.baseUrl}/phase/${phaseId}`
    );
    return response.data;
  }

  async getById(id: number): Promise<BacklogDeliverable> {
    const response = await this.api.get<BacklogDeliverable>(
      `${this.baseUrl}/${id}`
    );
    return response.data;
  }

  async create(
    data: CreateBacklogDeliverableRequest
  ): Promise<BacklogDeliverable> {
    const response = await this.api.post<BacklogDeliverable>(
      this.baseUrl,
      data
    );
    return response.data;
  }

  async update(
    id: number,
    data: UpdateBacklogDeliverableRequest
  ): Promise<BacklogDeliverable> {
    const response = await this.api.put<BacklogDeliverable>(
      `${this.baseUrl}/${id}`,
      data
    );
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await this.api.delete(`${this.baseUrl}/${id}`);
  }

  async updateOrder(
    orderUpdates: UpdateDeliverableOrderRequest[]
  ): Promise<void> {
    await this.api.put(`${this.baseUrl}/order`, { orderUpdates });
  }
}