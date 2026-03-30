import { AxiosInstance } from 'axios';

export class LeadService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAll() {
    try {
      const response = await this.api.get('/leads/all');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des leads :', error);
      throw error;
    }
  }

  async getToValidate() {
    try {
      const response = await this.api.get('/leads/tovalidate');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des leads :', error);
      throw error;
    }
  }

  async getEvaluating() {
    try {
      const response = await this.api.get('/leads/evaluating');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des leads en évaluation :', error);
      throw error;
    }
  }

  async winLead(id: number) {
    try {
      const response = await this.api.post(`/leads/win/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du passage en gagné du lead ${id} :`, error);
      throw error;
    }
  }

  async loseLead(id: number) {
    try {
      const response = await this.api.post(`/leads/lose/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors du passage en perdu du lead ${id} :`, error);
      throw error;
    }
  }

  async getAllByStatut(id: number) {
    try {
      const response = await this.api.get(`/leads/status/${id}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des leads par statut :", error);
      throw error;
    }
  }

  async getById(id: number) {
    try {
      const response = await this.api.get(`/leads/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du lead ${id} :`, error);
      throw error;
    }
  }

  async getValidationById(id: number) {
    try {
      const response = await this.api.get(`/leads/validation/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du lead ${id} :`, error);
      throw error;
    }
  }

  async createQualif(data: any) {
    try {
      const response = await this.api.post('/leads/qualif', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du lead :', error);
      throw error;
    }
  }

  async updateQualif(id: number, data: any) {
    try {
      const response = await this.api.put(`/leads/${id}/qualif`, data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du lead :', error);
      throw error;
    }
  }

  async delete(id: number) {
    try {
      const response = await this.api.delete(`/leads/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la suppression du lead ${id} :`, error);
      throw error;
    }
  }

  async getJira(id: number) {
    const res = await this.api.get(`/leads/JIRA/${id}`);
    return res.data;
  }

  async updateJira(id: number, data: any) {
    const res = await this.api.put(`/leads/${id}/JIRA`, data);
    return res.data;
  }
}