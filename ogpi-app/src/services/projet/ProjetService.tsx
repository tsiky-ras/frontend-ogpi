import { AxiosInstance } from 'axios';
import { Projet } from '../../types/projet/Projet';

export class ProjetService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * Récupère tous les projets
   */
  async getAll(): Promise<Projet[]> {
    try {
      const response = await this.api.get('/projets/all');
      console.log("Projets récupérés:", response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des projets :', error);
      throw error;
    }
  }

  /**
   * Récupère un projet par ID
   */
  async getById(id: number): Promise<Projet> {
    try {
      const response = await this.api.get(`/projets/${id}`);
      console.log(`Projet ${id} récupéré:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du projet ${id} :`, error);
      throw error;
    }
  }

  /**
   * Crée un nouveau projet
   */
  async create(data: Projet): Promise<Projet> {
    try {
      const response = await this.api.post('/projets', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du projet :', error);
      throw error;
    }
  }

  /**
   * Met à jour un projet existant
   */
  async update(id: number, data: Projet): Promise<Projet> {
    try {
      const response = await this.api.put(`/projets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du projet ${id} :`, error);
      throw error;
    }
  }

  /**
   * Supprime un projet
   */
  async delete(id: number): Promise<void> {
    try {
      await this.api.delete(`/projets/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du projet ${id} :`, error);
      throw error;
    }
  }
}