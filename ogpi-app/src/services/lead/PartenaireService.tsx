import { AxiosInstance } from 'axios';

export class PartenaireService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/partenaires');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des partenaires :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/partenaires/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du partenaire ${id} :`, error);
      throw error;
    }
  }

  async create(data: any) {
    try {
      const response = await this.api.post('/partenaires', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du partenaire :', error);
      throw error;
    }
  }
}
