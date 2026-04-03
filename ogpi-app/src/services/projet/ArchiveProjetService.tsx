import { AxiosInstance } from 'axios';
import { Projet } from '../../types/projet/Projet';

export class ArchiveProjetService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getArchives(): Promise<Projet[]> {
    try {
      const response = await this.api.get('/projets/archives');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des projets archivés :', error);
      throw error;
    }
  }

  async archiver(id: number): Promise<void> {
    try {
      await this.api.patch(`/projets/${id}/archiver`);
    } catch (error) {
      console.error(`Erreur lors de l'archivage du projet ${id} :`, error);
      throw error;
    }
  }

  async desarchiver(id: number): Promise<void> {
    try {
      await this.api.patch(`/projets/${id}/desarchiver`);
    } catch (error) {
      console.error(`Erreur lors du désarchivage du projet ${id} :`, error);
      throw error;
    }
  }
}
