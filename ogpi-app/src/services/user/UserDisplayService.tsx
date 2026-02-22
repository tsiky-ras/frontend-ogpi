import { AxiosInstance } from "axios";

export class UserDisplayService {
    constructor(private api: AxiosInstance) {}
  
    async getAll() {
      const res = await this.api.get('/display-users/all');
      return res.data;
    }
  }
  