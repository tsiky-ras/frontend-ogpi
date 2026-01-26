import { AxiosInstance } from 'axios';

export class LeadCategoryService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/lead-categories');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories de lead :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/lead-categories/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la catégorie de lead ${id} :`, error);
      throw error;
    }
  }
}

