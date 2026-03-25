export type BacklogPhase = {
  id: number;
  name: string;
  order: number;
  lotId: number;
  lines?: any[] | null;
  deliverables?: any[] | null;
  sprints?: BacklogSprint[];
  fromDay?: number;
  toDay?: number;
  dateDebut?: string | null;
  dateFin?: string | null;
};

export type BacklogLot = {
  id: number;
  order: number;
  name: string;
  desc: string;
  backlogId: number;
  phases?: BacklogPhase[];
  fromDay?: number;
  toDay?: number;
};

export interface BacklogLotOrderUpdate {
  id: number;
  order: number;
}

export interface BacklogPhaseOrderUpdate {
  id: number;
  order: number;
}

export interface BacklogProfil {
  id: number;
  order: number;
  name: string;
  desc?: string;
  tjm: number;
  backlogId: number;
}

// ─── SPRINT ───────────────────────────────────────────────
export interface BacklogSprint {
  id: number;
  name: string;
  order: number;
  phaseId: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  fromDay?: number;
  toDay?: number;
  deliverables?: BacklogDeliverable[];
  columns?: any[] | null;
}

export interface CreateBacklogSprintRequest {
  name: string;
  order: number;
  phaseId: number;
  dateDebut?: string;
  dateFin?: string;
}

export interface UpdateBacklogSprintRequest {
  name: string;
  order: number;
  dateDebut?: string;
  dateFin?: string;
}

// ─── LIVRABLE ─────────────────────────────────────────────
export interface BacklogDeliverable {
  id: number;
  name: string;
  description: string;
  deliveryDate?: string | null;
  order?: number | null;
  phaseId: number;
  sprintId?: number | null;
  isDelivered?: boolean;
}

export interface CreateBacklogDeliverableRequest {
  name: string;
  description: string;
  phaseId: number;
  sprintId?: number | null;
  order?: number;
}

export interface UpdateBacklogDeliverableRequest {
  name?: string;
  description?: string;
  deliveryDate?: string;
  order?: number;
}

// ─── LINE ─────────────────────────────────────────────────
export interface BacklogLineProfil {
  id: number;
  volume: number;
  lineId: number;
  profil: BacklogProfil;
}

export interface BacklogLine {
  id: number;
  order: number;
  epic?: string;
  userStory?: string;
  description?: string;
  resultat?: string;
  phaseId: number | null;
  sprintId?: number | null;
  profils?: BacklogLineProfil[];
  facturable?: boolean;
  lotId?: number | null;
  lotNom?: string | null;
  phaseNom?: string | null;
  sprintNom?: string | null;
}

export interface CreateBacklogLineRequest {
  epic: string;
  userStory: string;
  description: string;
  resultat: string;
  order: number;
  phaseId: number;
  sprintId?: number | null;
}

export interface UpdateBacklogLineRequest {
  epic: string;
  userStory: string;
  description: string;
  resultat: string;
  phaseId: number;
  sprintId?: number | null;
  order?: number;
}

export interface CreateBacklogLineProfilRequest {
  volume: number;
  lineId: number;
  profilId: number;
}

export interface UpdateBacklogLineProfilRequest {
  volume: number;
  lineId: number;
  profilId: number;
}

// ─── BACKLOG ──────────────────────────────────────────────
export interface Backlog {
  id: number;
  datedeButPlanning?:string|null;
  name: string;
  desc?: string;
  leadId: number;
  projetId?: number | null;
  profils?: BacklogProfil[];
  lots?: BacklogLot[];
  lines?: BacklogLine[];
  phases?: BacklogPhase[];
  sprints?: BacklogSprint[] | null;
  type?: BacklogType;
}

// ─── ORDRE ────────────────────────────────────────────────
export interface OrderUpdate {
  id: number;
  order: number;
}

// ─── PROFIL REQUESTS ──────────────────────────────────────
export interface CreateBacklogProfilRequest {
  name: string;
  desc?: string;
  tjm: number;
  order: number;
  backlogId: number;
}

export interface UpdateBacklogProfilRequest {
  name: string;
  desc?: string;
  tjm: number;
}

// ─── LOT REQUESTS ─────────────────────────────────────────
export interface CreateBacklogLotRequest {
  name: string;
  desc?: string;
  order: number;
  backlogId: number;
}

export interface UpdateBacklogLotRequest {
  name: string;
  desc?: string;
}

// ─── PHASE REQUESTS ───────────────────────────────────────
export interface CreateBacklogPhaseRequest {
  name: string;
  order: number;
  lotId: number;
}

export interface UpdateBacklogPhaseRequest {
  name: string;
}

// ─── BACKLOG TYPE ─────────────────────────────────────────
export type BacklogType = 0 | 1;
// 0 = LEAD
// 1 = PROJET

export interface CreateBacklogRequest {
  name: string;
  leadId?: number | null;
  projetId?: number | null;
  desc?: string;
  type: BacklogType;
}