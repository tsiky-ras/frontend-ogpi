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


export interface SprintTimeDTO {
  id: number;
  fromDay: number;
  toDay: number;
  dateDebut?: string | null; // ISO yyyy-MM-dd
  dateFin?: string | null;   // ISO yyyy-MM-dd
}
 
export interface BacklogTimeDTO {
  lots: [];       // vide — calculé dynamiquement côté front
  phases: [];     // vide — calculé dynamiquement côté front
  sprints: SprintTimeDTO[];
}
 
export interface DateDebutPlanningDTO {
  idBacklog: number;
  dateDebut: string | null; // ISO yyyy-MM-dd
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

    
     /**
   * Met à jour les dates (fromDay / toDay) des sprints modifiés.
   * Lots et phases sont commentés côté back — on n'envoie que les sprints.
   *
   * PUT /api/projet/backlog-phases/planning/time
   */
  async updateSprintTimes(sprints: SprintTimeDTO[]): Promise<void> {
    const payload: BacklogTimeDTO = {
      lots: [],
      phases: [],
      sprints,
    };
    await this.api.put("/projet/backlog-phases/planning/time", payload);
  }
 
  /**
   * Met à jour la date de début du planning d'un backlog.
   *
   * PUT /api/backlogs/start-planning/{backlogId}
   */
  async updateStartDate(
    backlogId: number,
    dateDebut: string | null
  ): Promise<void> {
    const payload: DateDebutPlanningDTO = {
      idBacklog: backlogId,
      dateDebut,
    };
    await this.api.put(`/backlogs/start-planning/${backlogId}`, payload);
  }

    
}