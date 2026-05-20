import { AxiosInstance } from "axios";

/**
 * Service frontend pour la propagation automatique des dates.
 *
 * Flux :
 *   saveSprint (create/update) → propagateFromSprint(sprintId)
 *   deleteSprint               → propagateFromPhase(phaseId)
 *   deletePhase                → propagateFromLot(lotId)
 */
export class BacklogDateService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /**
   * À appeler après create ou update d'un sprint.
   * Recalcule : phase.dates = MIN/MAX sprints → lot.dates = MIN/MAX phases.
   */
  async propagateFromSprint(sprintId: number): Promise<void> {
    await this.api.post(`/backlog/dates/sprint/${sprintId}/propagate`);
  }

  /**
   * À appeler après delete d'un sprint (le sprint n'est plus en BDD).
   * Recalcule la phase et le lot depuis la phase donnée.
   */
  async propagateFromPhase(phaseId: number): Promise<void> {
    await this.api.post(`/backlog/dates/phase/${phaseId}/propagate`);
  }

  /**
   * À appeler après delete d'une phase.
   * Recalcule le lot depuis ses phases restantes.
   */
  async propagateFromLot(lotId: number): Promise<void> {
    await this.api.post(`/backlog/dates/lot/${lotId}/propagate`);
  }

  /**
   * Recalcul complet depuis les heures de planning.
   */
  async recalculateDatesFromPlanning(
    backlogId: number,
    projectStart: string
  ): Promise<void> {
    await this.api.post(`/backlog/dates/${backlogId}/from-planning`, {
      projectStart,
    });
  }

  /**
   * Met à jour les dates du projet.
   */
  async updateProjectDates(
    projetId: number,
    startDate: string,
    endDate: string
  ): Promise<void> {
    await this.api.put(`/backlog/dates/projet/${projetId}/dates`, {
      startDate,
      endDate,
    });
  }
}