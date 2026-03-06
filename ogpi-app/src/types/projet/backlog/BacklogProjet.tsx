import { BacklogType } from "../../lead/Backlog/Backlog.tsx";
import { Profil } from "../../profil/Profil.tsx";

// ─────────────────────────────────────────────────────────────
// BacklogProjetProfil
// ─────────────────────────────────────────────────────────────
export interface BacklogProjetProfil {
  id: number;
  order: number;
  name: string;
  desc?: string;
  tjm: number;
  backlogId: number;
  collaborateurs?: Profil[];
}

// ─────────────────────────────────────────────────────────────
// BacklogProjetLineProfil
// ─────────────────────────────────────────────────────────────
export interface BacklogProjetLineProfil {
  id: number;
  volume: number;
  lineId: number;
  profil: BacklogProjetProfil;
}

// ─────────────────────────────────────────────────────────────
// BacklogSprint
// ─────────────────────────────────────────────────────────────
export interface BacklogSprint {
  id: number;
  name: string;
  order: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  phaseId: number;
  columns?: BacklogColumn[];
  deliverables?: BacklogDelivrableProjet[];
}

export interface CreateBacklogSprintRequest {
  name: string;
  order: number;
  startDate?: string;
  endDate?: string;
  phaseId: number;
}

export interface UpdateBacklogSprintRequest {
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface OrderUpdateItem {
  id: number;
  order: number;
}

// ─────────────────────────────────────────────────────────────
// BacklogColumn
// ─────────────────────────────────────────────────────────────
export type BacklogColumnType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "COLLABORATEUR"
  | "SPRINT";

export interface BacklogColumn {
  id: number;
  name: string;
  order: number;
  type: BacklogColumnType;
  sprintId: number;
}

export interface CreateBacklogColumnRequest {
  name: string;
  order: number;
  type: BacklogColumnType;
  sprintId: number;
}

export interface UpdateBacklogColumnRequest {
  name: string;
  order: number;
  type: BacklogColumnType;
}

// ─────────────────────────────────────────────────────────────
// BacklogLineColumnValue
// ─────────────────────────────────────────────────────────────
export interface BacklogLineColumnValue {
  id: number;
  value: string;
  lineId: number;
  column: BacklogColumn;
}

export interface UpsertBacklogLineColumnValueRequest {
  value: string;
  lineId: number;
  columnId: number;
}

// ─────────────────────────────────────────────────────────────
// BacklogDelivrableProjet (VERSION SIMPLIFIÉE)
// Table backlog_livrable
// ─────────────────────────────────────────────────────────────
export interface BacklogDelivrableProjet {
  id: number;
  name: string;
  description?: string;
  deliveryDate?: string | null;
  phaseId?: number | null;
  sprintId?: number | null;
  isDelivered: boolean;
  order?: number;
}

export interface CreateBacklogDelivrableRequest {
  name: string;
  description?: string;
  deliveryDate?: string;
  phaseId: number;
  sprintId?: number | null;
  isDelivered?: boolean; // optionnel → défaut false côté backend
  order?: number;
}

export interface UpdateBacklogDelivrableRequest {
  name: string;
  description?: string;
  deliveryDate?: string;
  phaseId: number;
  sprintId?: number | null;
  isDelivered?: boolean;
}

// ─────────────────────────────────────────────────────────────
// CreateBacklogForProjetRequest
// ─────────────────────────────────────────────────────────────
export interface CreateBacklogForProjetRequest {
  name: string;
  desc?: string;
  projetId: number;
  leadId?: number | null;
  type: BacklogType;
}