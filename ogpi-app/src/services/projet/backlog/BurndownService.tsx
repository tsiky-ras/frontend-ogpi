import { AxiosInstance } from "axios";

export interface BurndownPoint {
  date: string;
  idealValue: number;
  actualValue: number | null;
}

export class BurndownService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getBurndownBySprint(sprintId: number): Promise<BurndownPoint[]> {
    const r = await this.api.get<BurndownPoint[]>(`/burndown/${sprintId}`);
    return r.data;
  }
}