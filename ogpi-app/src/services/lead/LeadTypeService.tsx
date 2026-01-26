import { AxiosInstance } from 'axios';

export class LeadTypeService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/lead-types');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des types de lead :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/lead-types/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du type de lead ${id} :`, error);
      throw error;
    }
  }
}

