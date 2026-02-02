// src/services/backlog/BacklogLotService.ts
import { AxiosInstance } from 'axios';
import { BacklogLot, BacklogLotOrderUpdate } from '../../../types/lead/Backlog/BacklogLot';

export class BacklogLotService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * Récupère tous les lots d'un backlog spécifique
   * @param backlogId - ID du backlog
   */
  async getByBacklogId(backlogId: number): Promise<BacklogLot[]> {
    try {
      const response = await this.api.get(`/backlog-lots/by-backlog/${backlogId}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des lots du backlog ${backlogId} :`, error);
      throw error;
    }
  }

  /**
   * Récupère un lot par son ID
   * @param id - ID du lot
   */
  async getById(id: number): Promise<BacklogLot> {
    try {
      const response = await this.api.get(`/backlog-lots/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du lot ${id} :`, error);
      throw error;
    }
  }

  /**
   * Crée un nouveau lot
   * @param lotData - Données du lot à créer
   */
  async create(lotData: Omit<BacklogLot, 'id'>): Promise<BacklogLot> {
    try {
      const response = await this.api.post('/backlog-lots', lotData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du lot :', error);
      throw error;
    }
  }

  /**
   * Met à jour un lot existant
   * @param id - ID du lot
   * @param lotData - Données à mettre à jour
   */
  async update(id: number, lotData: Partial<BacklogLot>): Promise<BacklogLot> {
    try {
      const response = await this.api.put(`/backlog-lots/${id}`, lotData);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du lot ${id} :`, error);
      throw error;
    }
  }

  /**
   * Supprime un lot
   * @param id - ID du lot à supprimer
   */
  async delete(id: number): Promise<void> {
    try {
      await this.api.delete(`/backlog-lots/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du lot ${id} :`, error);
      throw error;
    }
  }

  /**
   * Met à jour l'ordre des lots (batch update)
   * @param lots - Liste des lots avec leur nouvel ordre
   */
  async updateOrder(orderUpdates: BacklogLotOrderUpdate[]): Promise<void> {
    try {
      // Envoyer seulement id et order
      await this.api.put('/backlog-lots/update-order', orderUpdates);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'ordre des lots :', error);
      throw error;
    }
  }

  /**
   * Récupère tous les lots (optionnel)
   */
  async getAll(): Promise<BacklogLot[]> {
    try {
      const response = await this.api.get('/backlog-lots');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les lots :', error);
      throw error;
    }
  }
}