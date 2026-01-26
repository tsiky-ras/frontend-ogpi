import { AxiosInstance } from 'axios';

export class TypeFacturationService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/type-facturations');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des types de facturation :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/type-facturations/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du type de facturation ${id} :`, error);
      throw error;
    }
  }
}

