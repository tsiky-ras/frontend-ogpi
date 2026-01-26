import { AxiosInstance } from 'axios';

export class LeadStatusService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/lead-statuses');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statuts :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/lead-statuses/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du statut ${id} :`, error);
      throw error;
    }
  }
}
