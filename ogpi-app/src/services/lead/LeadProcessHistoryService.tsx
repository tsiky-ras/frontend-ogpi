import { AxiosInstance } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadStep {
  id: number;
  order: number;
  label: string;
}

export interface StepHistoryEntry {
  id: number;
  dateChangement: string;
  leadId: number;
  leadStep: LeadStep;
}

export interface LeadTaskStatus {
  leadTaskStatusId: number;
  leadTaskStatusLabel: string;
}

export interface LeadTaskUserStatus {
  leadTaskUserStatusId: number;
  leadTaskUserStatusDate: string;
  leadTaskUserStatusCommentaire: string;
  leadTaskStatus: LeadTaskStatus;
  leadTaskUserId: number;
}

export interface TaskValidationUser {
  id: number;
  username: string;
  email: string;
}

export interface TaskValidationRole {
  roleId: number;
  roleLabel: string;
}

export interface TaskValidation {
  id: number;
  validationTime: string;
  /** 1 = OK, 0 = KO */
  decision: 0 | 1;
  user: TaskValidationUser;
  role: TaskValidationRole;
  leadTaskUserId: number;
  comment: string | null;
}

export interface LeadTask {
  leadTaskId: number;
  leadTaskName: string;
  leadTaskDesc: string;
  leadStepId: number;
  parentLeadTaskId: number | null;
}

export interface TaskUser {
  id: number;
  username: string;
  email: string;
}

export interface ProcessTask {
  leadTaskUserId: number;
  dateAffectation: string;
  leadTaskUserDeadline: string | null;
  leadTask: LeadTask;
  user: TaskUser;
  leadId: number;
  leadTaskUserStatus: LeadTaskUserStatus;
  leadTaskUserStatusList: LeadTaskUserStatus[];
  leadTaskValidations: TaskValidation[];
  leadTaskFiles: any[];
}

export interface ProcessHistoryData {
  fixedSteps: LeadStep[];
  stepHistory: StepHistoryEntry[];
  tasks: ProcessTask[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class LeadProcessHistoryService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getProcessHistory(leadId: number): Promise<ProcessHistoryData> {
    try {
      const response = await this.api.get(`/leads/Process-history/${leadId}`);
      return response.data as ProcessHistoryData;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'historique de traitement du lead ${leadId} :`, error);
      throw error;
    }
  }
}