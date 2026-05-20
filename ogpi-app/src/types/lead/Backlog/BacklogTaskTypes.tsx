// ─── Constantes statut ───────────────────────────────────────────────────────
export const PROJECT_TASK_STATUS = {
  AFFECTE: 1,
  REATTRIBUE: 2,
  A_MODIFIER: 3,
  EN_COURS: 4,
  EN_ATTENTE_VALIDATION: 5,
  VALIDE: 6,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BacklogTaskStatus {
  id: number;
  label: string;
}

export interface BacklogTaskStatusHistory {
  id: number;
  dateChangement: string;
  commentaire: string;
  modifiedBy: { id: number; username: string; email: string } | null;
  status: BacklogTaskStatus;
  backlogLineProfilId: number;
}

export interface BacklogProfilTask {
  id: number;
  order: number;
  name: string;
  desc: string;
  tjm: number;
  backlogId: number;
  collaborateurs: null;
}

export interface BacklogCollaborateur {
  id: number;
  matricule: string | null;
  nom: string | null;
  prenom: string | null;
  appellation: string | null;
  emailPro: string | null;
  emailPerso: string | null;
  telephone: string | null;
  type: string | null;
  contrat: string | null;
  sexe: string | null;
}

export interface BacklogLineTask {
  id: number;
  order: number;
  epic: string;
  userStory: string;
  description: string | null;
  resultat: string;
  phaseId: number;
  sprintId: number | null;
  profils: Array<{ id: number; volume: number; lineId: number; profil: BacklogProfilTask }>;
  columnValues: null;
}

export interface BacklogLineProfilAsTask {
  id: number;
  volume: number;
  lineId: number;
  profil: BacklogProfilTask;
  collaborateur: BacklogCollaborateur | null;
  deadLine: string | null;
  timeSpent: number | null;
  line: BacklogLineTask;
  historyStatus: BacklogTaskStatusHistory[];
  currentStatus: BacklogTaskStatusHistory | null;
  deviseAbr?:     string | null;
  projetNom?:     string | null;
  leadNom?:       string | null;
  projetId?:      number | null;
}

export interface ChangingStatusDTO {
  idStatus: number;
  comment: string;
  backlogLineProfilId: number;
}