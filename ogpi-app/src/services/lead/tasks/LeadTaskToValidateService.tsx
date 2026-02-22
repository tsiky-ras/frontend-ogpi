import { AxiosInstance } from 'axios';

/**
 * Service dédié à la liste des tâches à valider.
 * Implémente la même interface que LeadTaskUserService
 * (getAll + getById) pour être compatible avec TachesAValider.
 *
 * getAll()  → GET /lead-task-user/to-validate
 * getById() → GET /lead-task-user/:id  (même endpoint de détail)
 */
export class LeadTaskToValidateService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/lead-task-user/to-validate');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des tâches à valider :', error);
      throw error;
    }
  }

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