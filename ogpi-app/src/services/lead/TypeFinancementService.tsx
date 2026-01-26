import { AxiosInstance } from 'axios';

export class TypeFinancementService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/type-financements');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des types de financement :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/type-financements/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du type de financement ${id} :`, error);
      throw error;
    }
  }
}


