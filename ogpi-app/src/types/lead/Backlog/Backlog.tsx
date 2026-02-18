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
  phaseId: number | null;
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
  profils?: BacklogLineProfil[];
}

export interface BacklogLineProfil {
  id: number;
  volume: number;
  lineId: number;
  profil: BacklogProfil;
}

export interface CreateBacklogLineRequest {
  epic: string;
  userStory: string;
  description: string;
  resultat: string;
  order: number;
  phaseId: number;
}

export interface UpdateBacklogLineRequest {
  epic: string;
  userStory: string;
  description: string;
  resultat: string;
  phaseId: number;
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

// Mise à jour de l'interface Backlog pour inclure les lignes
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

export interface CreateBacklogRequest {
  name: string;
  leadId: number;
  desc?: string; 
}
export interface BacklogDeliverable {
  id: number;
  name: string;
  deliveryDate: string; 
  description: string;
  phaseId: number;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBacklogDeliverableRequest {
  name: string;
  deliveryDate: string;
  description: string;
  phaseId: number;
  order: number;
}

export interface UpdateBacklogDeliverableRequest {
  name?: string;
  deliveryDate?: string;
  description?: string;
  order?: number;
}

export interface UpdateDeliverableOrderRequest {
  id: number;
  order: number;
}