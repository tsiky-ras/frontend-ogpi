import { AxiosInstance } from 'axios';

export type ChargeType = "TRANSPORT" | "HEBERGEMENT" | "PER_DIEM" | "AUTRE";

export interface ChargeAnnexe {
  id: number;
  libelle: string;
  type: ChargeType;
  montant: number;
  quantite: number;
  description?: string;
  backlogId: number;
}

export interface ChargeAnnexeCreateDTO {
  libelle: string;
  type: ChargeType;
  montant: number;
  quantite: number;
  description?: string;
  backlogId: number;
}

export class ChargesAnnexesService {
  private api: AxiosInstance;
  private BASE = "/backlog/charges-annexes";

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getByBacklogId(backlogId: number): Promise<ChargeAnnexe[]> {
    try {
      const r = await this.api.get(`${this.BASE}/backlog/${backlogId}`);
      return r.data ?? [];
    } catch { return []; }
  }

  async create(dto: ChargeAnnexeCreateDTO): Promise<ChargeAnnexe> {
    const r = await this.api.post(this.BASE, dto);
    return r.data;
  }

  async update(id: number, dto: Partial<ChargeAnnexeCreateDTO>): Promise<ChargeAnnexe> {
    const r = await this.api.put(`${this.BASE}/${id}`, dto);
    return r.data;
  }

  async delete(id: number): Promise<void> {
    await this.api.delete(`${this.BASE}/${id}`);
  }

  async getTotalByBacklogId(backlogId: number): Promise<number> {
    try {
      const r = await this.api.get(`${this.BASE}/backlog/${backlogId}/total`);
      return r.data ?? 0;
    } catch { return 0; }
  }
}
