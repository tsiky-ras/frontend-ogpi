import { AxiosInstance } from 'axios';
import { BacklogLineProfilAsTask, ChangingStatusDTO, BacklogTaskStatusHistory } from '../../../types/lead/Backlog/BacklogTaskTypes.tsx';

export class BacklogTaskService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getTasks(): Promise<BacklogLineProfilAsTask[]> {
    const response = await this.api.get('/projet/backlog-line-profils/tasks');
    return response.data;
  }

  async getTasksToValidate(): Promise<BacklogLineProfilAsTask[]> {
    const response = await this.api.get('/projet/backlog-line-profils/tasks-to-validate');
    return response.data;
  }

  async changeStatus(dto: ChangingStatusDTO): Promise<BacklogTaskStatusHistory> {
    const response = await this.api.post('/projet/backlog-line-profils/changeStatus', dto);
    return response.data;
  }

  async updateTimeSpent(taskId: number, timeSpent: number | null): Promise<void> {
    console.log(`Updating time spent for task ${taskId} to ${timeSpent}`);
    await this.api.patch(
      `/projet/backlog-line-profils/${taskId}/time-spent`,
      { timeSpent }
    );
  }
}