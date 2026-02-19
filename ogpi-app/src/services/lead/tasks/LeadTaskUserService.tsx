import { AxiosInstance } from 'axios';

export class LeadTaskUserService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * Récupère toutes les tâches utilisateur
   */
  async getAll() {
    try {
      const response = await this.api.get('/lead-task-user/all');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches :', error);
      throw error;
    }
  }

  /**
   * Récupère une tâche utilisateur par ID (avec tous les détails)
   */
  async getById(id: number) {
    try {
      const response = await this.api.get(`/lead-task-user/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la tâche ${id} :`, error);
      throw error;
    }
  }
}