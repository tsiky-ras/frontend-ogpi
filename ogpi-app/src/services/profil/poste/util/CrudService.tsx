export interface CrudService<T> {
  getAll(): Promise<T[]>;
  getById(id: number): Promise<T>;
  create(data: T): Promise<T>;
  update(data: T): Promise<T>;
  delete(id: number): Promise<void>;
}
