import { AxiosInstance } from "axios";
import {
  BacklogProfil,
  CreateBacklogProfilRequest,
  UpdateBacklogProfilRequest,
  OrderUpdate,
  Backlog,
} from "../../../types/lead/Backlog/Backlog";

export class BacklogService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * Récupérer un profil par son ID
   */
  async getCompleteById(id: number): Promise<Backlog> {
    console.log("IDSAD"+id)

    const response = await this.api.get(`/backlogs/${id}/complete`);
    return response.data;
  }

  /**
   * Récupérer tous les profils d'un backlog
   */
  async getByBacklogId(backlogId: number): Promise<BacklogProfil[]> {
    const response = await this.api.get(
      `/backlog-profils/backlog/${backlogId}`
    );
    return response.data;
  }

  /**
   * Créer un nouveau profil
   */
  async create(profil: CreateBacklogProfilRequest): Promise<BacklogProfil> {
    const response = await this.api.post("/backlog-profils", profil);
    return response.data;
  }

  /**
   * Mettre à jour un profil
   */
  async update(
    id: number,
    profil: UpdateBacklogProfilRequest
  ): Promise<BacklogProfil> {
    const response = await this.api.put(`/backlog-profils/${id}`, profil);
    return response.data;
  }

  /**
   * Supprimer un profil
   */
  async delete(id: number): Promise<void> {
    await this.api.delete(`/backlog-profils/${id}`);
  }

  /**
   * Mettre à jour l'ordre de plusieurs profils
   */
  async updateOrder(orderUpdates: OrderUpdate[]): Promise<void> {
    await this.api.put("/backlog-profils/update-order", orderUpdates);
  }
}