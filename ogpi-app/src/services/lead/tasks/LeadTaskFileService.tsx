import { AxiosInstance } from 'axios';

export interface DriveFile {
  id?: number;
  name: string;
  link: string;
  description: string;
  driveFolderId?: number;
}

export interface LeadTaskFile {
  id?: number;
  commentaire: string;
  driveFile: DriveFile;
  leadTaskUserId: number;
}

export class LeadTaskFileService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async create(data: LeadTaskFile): Promise<LeadTaskFile> {
    const response = await this.api.post('/lead-task-files', data);
    return response.data;
  }

  async update(id: number, data: LeadTaskFile): Promise<LeadTaskFile> {
    const response = await this.api.put(`/lead-task-files/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await this.api.delete(`/lead-task-files/${id}`);
  }

  async getById(id: number): Promise<LeadTaskFile> {
    const response = await this.api.get(`/lead-task-files/${id}`);
    return response.data;
  }

  async getByLeadTaskUserId(leadTaskUserId: number): Promise<LeadTaskFile[]> {
    const response = await this.api.get(`/lead-task-files/by-task-user/${leadTaskUserId}`);
    return response.data;
  }
}