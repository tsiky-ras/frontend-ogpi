import { AxiosInstance } from 'axios';

export interface LeadTaskValidation {
  id?: number;
  validationTime?: string;
  decision: number; // 1 = GO, 0 = NO GO
  commentaire?: string;
  leadTaskUserId: number;
}

export class LeadTaskValidationService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async create(data: {
    leadTaskUserId: number;
    decision: number;
    commentaire: string;
  }): Promise<LeadTaskValidation> {
    const response = await this.api.post('/lead-task-validations', data);
    return response.data;
  }

  async getByLeadTaskUserId(leadTaskUserId: number): Promise<LeadTaskValidation[]> {
    const response = await this.api.get(`/lead-task-validations/by-task-user/${leadTaskUserId}`);
    return response.data;
  }
}