import { AxiosInstance } from 'axios';

export class LeadService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * Récupère tous les leads
   */
  async getAll() {
    try {
      const response = await this.api.get('/leads/all');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des leads :', error);
      throw error;
    }
  }

  /**
   * Récupère un lead par ID
   */
  async getById(id: number) {
    try {
      const response = await this.api.get(`/leads/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du lead ${id} :`, error);
      throw error;
    }
  }

  /**
   * Crée un nouveau lead etape qualification
   */
  async createQualif(data: any) {
    try {
      const response = await this.api.post('/leads/qualif', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du lead :', error);
      throw error;
    }
  }

  /**
   * Met à jour un lead existant
   */
  async update(data: any) {
    try {
      const response = await this.api.put(`/leads/${data.id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lead :', error);
      throw error;
    }
  }

  /**
   * Supprime un lead
   */
  async delete(id: number) {
    try {
      const response = await this.api.delete(`/leads/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la suppression du lead ${id} :`, error);
      throw error;
    }
  }
}


