import { CreateValidationRequest, Validation } from '../../types/lead/Validation.tsx';

export class ValidationService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  /**
   * Créer une validation pour un lead
   */
  async create(request: CreateValidationRequest): Promise<Validation> {
    try {
      const response = await this.api.post('/lead-validations/validate', request);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la validation:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les validations d'un lead
   */
  async getByLeadId(leadId: number): Promise<Validation[]> {
    try {
      const response = await this.api.get(`/lead-validations/lead/${leadId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des validations:', error);
      throw error;
    }
  }
}

export const useValidationService = () => {
  // Ce hook peut être utilisé si vous avez un contexte d'API
  // Pour l'instant, retournons juste les méthodes
  return {
    ValidationService,
  };
};