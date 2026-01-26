import { AxiosInstance } from 'axios';

export class LeadSecteurService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/lead-secteurs');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des secteurs :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/lead-secteurs/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du secteur ${id} :`, error);
      throw error;
    }
  }
}

