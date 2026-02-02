export type BacklogPhase = {
  id: number;
  name: string;
  order: number;
  lotId: number;
  lines?: any[] | null;
};

export type BacklogLot = {
  id: number;
  order: number;
  name: string;
  desc: string;
  backlogId: number;
  phases?: BacklogPhase[];
};

export interface BacklogLotOrderUpdate {
  id: number;
  order: number;
}

export interface BacklogPhaseOrderUpdate {
  id: number;
  order: number;
}


// Types pour les entités Backlog

export interface BacklogProfil {
  id: number;
  order: number;
  name: string;
  desc?: string;
  tjm: number;
  backlogId: number;
}


export interface BacklogLine {
  id: number;
  order: number;
  name: string;
  desc?: string;
  charge: number;
  phaseId?: number | null;
  lotId?: number | null;
  backlogId?: number | null;
  profilId?: number | null;
}

export interface Backlog {
  id: number;
  name: string;
  desc?: string;
  leadId: number;
  profils?: BacklogProfil[];
  lots?: BacklogLot[];
  lines?: BacklogLine[];
  phases?: BacklogPhase[];
}

// Types pour les requêtes de mise à jour d'ordre
export interface OrderUpdate {
  id: number;
  order: number;
}

// Types pour les requêtes de création/mise à jour
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

export interface CreateBacklogPhaseRequest {
  name: string;
  order: number;
  lotId: number;
}

export interface UpdateBacklogPhaseRequest {
  name: string;
}