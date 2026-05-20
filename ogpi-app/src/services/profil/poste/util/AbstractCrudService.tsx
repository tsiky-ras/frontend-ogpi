import { AxiosInstance } from "axios";
import { CrudService } from "./CrudService";

export abstract class AbstractCrudService<T extends { id: number | null }>
  implements CrudService<T> {

  protected api: AxiosInstance;
  protected endpoint: string;

  constructor(api: AxiosInstance, endpoint: string) {
    this.api = api;
    this.endpoint = endpoint;
  }

  getAll(): Promise<T[]> {
    return this.api.get(this.endpoint).then(res => res.data);
  }

  getById(id: number): Promise<T> {
    return this.api.get(`${this.endpoint}/${id}`).then(res => res.data);
  }

  create(data: T): Promise<T> {
    return this.api.post(this.endpoint, data).then(res => res.data);
  }

  update(data: T): Promise<T> {
    return this.api.put(`${this.endpoint}/${data.id}`, data).then(res => res.data);
  }

  delete(id: number): Promise<void> {
    return this.api.delete(`${this.endpoint}/${id}`);
  }
}
