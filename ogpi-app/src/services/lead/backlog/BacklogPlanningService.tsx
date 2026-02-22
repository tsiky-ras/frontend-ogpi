export interface BacklogPlanningEntry {
  id: number;              
  phaseId: number;        
  heures: number;         
  startDate: string | null;
}

export interface UpsertPlanningRequest {
  phaseId: number;
  heures: number;           
  startDate: string | null; 
}

export class BacklogPlanningService {
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Récupère tous les overrides d'un backlog (jointure via les phases du backlog) */
  async getByBacklogId(backlogId: number): Promise<BacklogPlanningEntry[]> {
    const response = await this.api.get(`/backlog-plannings/backlog/${backlogId}`);
    return response.data;
  }

  /** Récupère l'override d'une phase spécifique */
  async getByPhaseId(phaseId: number): Promise<BacklogPlanningEntry | null> {
    try {
      const response = await this.api.get(`/backlog-plannings/phase/${phaseId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Upsert en masse : crée ou met à jour les overrides pour plusieurs phases.
   * Endpoint attendu : PUT /backlog-plannings/bulk-upsert
   */
    async bulkUpsert(entries: UpsertPlanningRequest[]): Promise<void> {
    await this.api.put("/backlog-plannings/batch", { entries });
    }
    
    async deleteByPhaseId(phaseId: number): Promise<void> {
        await this.api.delete(`/backlog-plannings/phase/${phaseId}`);
    }

    async hasPlanning(backlogId: number): Promise<boolean> {
    try {
        const response = await this.api.get(`/backlog-plannings/backlog/${backlogId}/exists`);
        return response.data?.hasPlanning ?? false;
    } catch {
        return false;
    }
    }
}