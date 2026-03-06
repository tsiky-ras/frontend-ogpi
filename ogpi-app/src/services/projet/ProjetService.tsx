import { AxiosInstance } from 'axios';
import { Projet } from '../../types/projet/Projet';

export class ProjetService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll(): Promise<Projet[]> {
    try {
      const response = await this.api.get('/projets/all');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des projets :', error);
      throw error;
    }
  }

  async getById(id: number): Promise<Projet> {
    try {
      const response = await this.api.get(`/projets/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du projet ${id} :`, error);
      throw error;
    }
  }

  async create(data: Projet): Promise<Projet> {
    try {
      const response = await this.api.post('/projets', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du projet :', error);
      throw error;
    }
  }

  async update(id: number, data: Projet): Promise<Projet> {
    try {
      const response = await this.api.put(`/projets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du projet ${id} :`, error);
      throw error;
    }
  }

  async updateDates(id: number, dateDebutPrevu: string, dateFinPrevu: string): Promise<Projet> {
    try {
      const response = await this.api.patch(`/projets/${id}/dates`, {
        dateDebutPrevu,
        dateFinPrevu,
      });
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour des dates du projet ${id} :`, error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.api.delete(`/projets/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du projet ${id} :`, error);
      throw error;
    }
  }
}