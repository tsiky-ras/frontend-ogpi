import { BacklogLineProfil } from "../../../types/lead/Backlog/Backlog";

export class BacklogLineProfilService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  async create(data: {
    volume: number;
    lineId: number;
    profilId: number;
  }): Promise<BacklogLineProfil> {
    try {
      // Créer l'objet avec la structure attendue par le backend
      const payload = {
        volume: data.volume,
        lineId: data.lineId,
        profil: {
          id: data.profilId
        }
      };
      
      const response = await this.api.post("/backlog-line-profils", payload);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création du volume:", error);
      throw error;
    }
  }

  async update(
    id: number,
    data: {
      volume: number;
      lineId: number;
      profilId: number;
    }
  ): Promise<BacklogLineProfil> {
    try {
      // Créer l'objet avec la structure attendue par le backend
      const payload = {
        volume: data.volume,
        lineId: data.lineId,
        profil: {
          id: data.profilId
        }
      };
      
      const response = await this.api.put(`/backlog-line-profils/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du volume:", error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.api.delete(`/backlog-line-profils/${id}`);
    } catch (error) {
      console.error("Erreur lors de la suppression du volume:", error);
      throw error;
    }
  }

  async getById(id: number): Promise<BacklogLineProfil> {
    try {
      const response = await this.api.get(`/backlog-line-profils/${id}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération du volume:", error);
      throw error;
    }
  }

  async getAllByLineId(lineId: number): Promise<BacklogLineProfil[]> {
    try {
      const response = await this.api.get(`/backlog-line-profils/line/${lineId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des volumes:", error);
      throw error;
    }
  }

  async getAllByBacklogId(backlogId: number): Promise<BacklogLineProfil[]> {
    try {
      const response = await this.api.get(`/backlog-line-profils/backlog/${backlogId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des volumes:", error);
      throw error;
    }
  }
}