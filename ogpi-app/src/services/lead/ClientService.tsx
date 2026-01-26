import { AxiosInstance } from 'axios';

export class ClientService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/clients');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des clients :', error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du client ${id} :`, error);
      throw error;
    }
  }

  async create(data: any) {
    try {
      const response = await this.api.post('/clients', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du client :', error);
      throw error;
    }
  }
}

