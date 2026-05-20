// src/services/lead/LeadDashboardService.tsx
import { AxiosInstance } from 'axios';

export interface CaPipelineGlobalDTO {
  nbOffresPipeline: number;
  caPipelineAvecCharges: number;
  caPipelineSansCharges: number;
}

export interface CaPipelineParStatutDTO {
  leadStatusId: number;
  leadStatusLabel: string;
  nbOffresPipeline: number;
  caPipelineAvecCharges: number;
  caPipelineSansCharges: number;
}

export interface TopOffreDTO {
  leadName: string;
  leadRef: string;
  leadPeriode: string;
  statusActuel: string;
  caAvecCharges: number;
  caSansCharges: number;
  volumeJh: number;
}

export interface CaPipelineParTypeDTO {
  leadTypeId: number;
  leadTypeLabel: string;
  nbOffres: number;
  caAvecCharges: number;
  caSansCharges: number;
}

export interface DashDTO {
  global: CaPipelineGlobalDTO;
  parStatut: CaPipelineParStatutDTO[];
  top3Offres: TopOffreDTO[];
  parType: CaPipelineParTypeDTO[];
}

export class LeadDashboardService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getDashboard(dateDebut: string, dateFin: string, deviseId?: number): Promise<DashDTO> {
    try {
      const response = await this.api.get('/leads/dashboard', {
        params: { dateDebut, dateFin, ...(deviseId != null ? { deviseId } : {}) },
      });
      return response.data;
    } catch (error) {
      console.error('Erreur dashboard leads :', error);
      throw error;
    }
  }
}