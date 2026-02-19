import { AxiosInstance } from 'axios';

export interface LeadTaskUserStatus {
  leadTaskUserStatusId?: number;
  leadTaskUserStatusDate?: string;
  leadTaskUserStatusCommentaire: string;
  leadTaskStatus: {
    leadTaskStatusId: number;
    leadTaskStatusLabel?: string;
  };
  leadTaskUserId: number;
}

export class LeadTaskUserStatusService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async create(data: LeadTaskUserStatus): Promise<LeadTaskUserStatus> {
    const response = await this.api.post('/lead-task-user-status', data);
    return response.data;
  }

  async getByLeadTaskUserId(leadTaskUserId: number): Promise<LeadTaskUserStatus[]> {
    const response = await this.api.get(`/lead-task-user-status/by-task-user/${leadTaskUserId}`);
    return response.data;
  }

  async getLatestStatus(leadTaskUserId: number): Promise<LeadTaskUserStatus> {
    const response = await this.api.get(`/lead-task-user-status/latest/by-task-user/${leadTaskUserId}`);
    return response.data;
  }
}