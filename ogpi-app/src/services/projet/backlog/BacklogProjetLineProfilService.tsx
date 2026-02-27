import { BacklogProjetLineProfil } from "../../../types/projet/backlog/BacklogProjet.tsx";

export class BacklogProjetLineProfilService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  // ==========================
  // CREATE
  // ==========================
  async create(data: {
    volume: number;
    lineId: number;
    profilId: number;
  }): Promise<BacklogProjetLineProfil> {
    try {
      const payload = {
        volume: data.volume,
        lineId: data.lineId,
        profil: {
          id: data.profilId,
        },
      };

      const response = await this.api.post(
        "/projet/backlog-line-profils",
        payload
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la création du backlog projet line profil:",
        error
      );
      throw error;
    }
  }

  // ==========================
  // UPDATE
  // ==========================
  async update(
    id: number,
    data: {
      volume: number;
      lineId: number;
      profilId: number;
    }
  ): Promise<BacklogProjetLineProfil> {
    try {
      const payload = {
        volume: data.volume,
        lineId: data.lineId,
        profil: {
          id: data.profilId,
        },
      };

      const response = await this.api.put(
        `/projet/backlog-line-profils/${id}`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du backlog projet line profil:",
        error
      );
      throw error;
    }
  }

  // ==========================
  // DELETE
  // ==========================
  async delete(id: number): Promise<void> {
    try {
      await this.api.delete(`/projet/backlog-line-profils/${id}`);
    } catch (error) {
      console.error(
        "Erreur lors de la suppression du backlog projet line profil:",
        error
      );
      throw error;
    }
  }

  // ==========================
  // GET BY ID
  // ==========================
  async getById(id: number): Promise<BacklogProjetLineProfil> {
    try {
      const response = await this.api.get(
        `/projet/backlog-line-profils/${id}`
      );
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du backlog projet line profil:",
        error
      );
      throw error;
    }
  }

  // ==========================
  // GET BY LINE ID
  // ==========================
  async getAllByLineId(lineId: number): Promise<BacklogProjetLineProfil[]> {
    try {
      const response = await this.api.get(
        `/projet/backlog-line-profils/line/${lineId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des backlog projet line profils par line:",
        error
      );
      throw error;
    }
  }

  // ==========================
  // GET BY BACKLOG ID
  // ==========================
  async getAllByBacklogId(backlogId: number): Promise<
    BacklogProjetLineProfil[]
  > {
    try {
      const response = await this.api.get(
        `/projet/backlog-line-profils/backlog/${backlogId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des backlog projet line profils par backlog:",
        error
      );
      throw error;
    }
  }
}