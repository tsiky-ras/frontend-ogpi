import { BacklogLine } from "../../../types/lead/Backlog/Backlog";

export class BacklogLineService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  async create(data: {
    epic: string;
    userStory: string;
    description: string;
    resultat: string;
    order: number;
    phaseId: number;
  }): Promise<BacklogLine> {
    try {
      const response = await this.api.post("/backlog-lines", data);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de la ligne:", error);
      throw error;
    }
  }

  async update(
    id: number,
    data: {
      epic: string;
      userStory: string;
      description: string;
      resultat: string;
      phaseId: number;
      order:number;
    }
  ): Promise<BacklogLine> {
    try {
      const response = await this.api.put(`/backlog-lines/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la ligne:", error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.api.delete(`/backlog-lines/${id}`);
    } catch (error) {
      console.error("Erreur lors de la suppression de la ligne:", error);
      throw error;
    }
  }

  async getById(id: number): Promise<BacklogLine> {
    try {
      const response = await this.api.get(`/backlog-lines/${id}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération de la ligne:", error);
      throw error;
    }
  }

  async getAllByBacklogId(backlogId: number): Promise<BacklogLine[]> {
    try {
      const response = await this.api.get(`/backlog-lines/backlog/${backlogId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des lignes:", error);
      throw error;
    }
  }

  async updateOrder(
    orderUpdates: Array<{ id: number; order: number }>
  ): Promise<void> {
    try {
      await this.api.put("/backlog-lines/update-order", orderUpdates);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ordre:", error);
      throw error;
    }
  }
}