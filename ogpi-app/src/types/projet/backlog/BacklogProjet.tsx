// ============================================================
// Types Backlog Projet
// Correspond aux modèles Java : mg.BUC.OGPI.model.projet.backlog.*
// ============================================================

import { BacklogType } from "../../lead/Backlog/Backlog.tsx";
import { Profil } from "../../profil/Profil.tsx";

// ─────────────────────────────────────────────────────────────
// BacklogProjetProfil
// Profil défini dans le backlog (table backlog_profil)
// avec ses collaborateurs réels rattachés (table backlog_profil_collaborateur)
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
// BacklogLineProfil (version projet)
// Table backlog_line_profil — volume d'un profil sur une ligne
// ─────────────────────────────────────────────────────────────
export interface BacklogProjetLineProfil {
  id: number;
  volume: number;
  lineId: number;
  profil: BacklogProjetProfil;
}

// ─────────────────────────────────────────────────────────────
// BacklogSprint
// Table backlog_sprint — sprint rattaché à une phase
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
// Table backlog_column_ — colonnes dynamiques d'un sprint
// ─────────────────────────────────────────────────────────────
export type BacklogColumnType = "TEXT" | "NUMBER" | "DATE" | "SELECT" | "COLLABORATEUR" | "SPRINT";

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
// Table backlog_line_column_value — valeur d'une colonne pour une ligne
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
// BacklogLivrableStatut
// Table backlog_livrable_statut — statut d'un livrable
// ─────────────────────────────────────────────────────────────
export interface BacklogLivrableStatut {
  id: number;
  label: string;
  order: number;
}

// ─────────────────────────────────────────────────────────────
// BacklogDelivrableProjet
// Table backlog_livrable — livrable enrichi avec statut
// ─────────────────────────────────────────────────────────────
export interface BacklogDelivrableProjet {
  id: number;
  name: string;
  description?: string;
  deliveryDate?: string | null;
  phaseId?: number | null;
  sprintId?: number | null;
  statutHistoryId?: number | null;
  statut?: BacklogLivrableStatut | null;
  order?: number;
}

export interface CreateBacklogDelivrableRequest {
  name: string;
  description?: string;
  deliveryDate?: string;
  phaseId: number;
  sprintId?: number | null;
  order?: number;
}

export interface UpdateBacklogDelivrableRequest {
  name: string;
  description?: string;
  deliveryDate?: string;
  phaseId: number;
  sprintId?: number | null;
}

// ─────────────────────────────────────────────────────────────
// CreateBacklogForProjetRequest
// Payload pour créer un backlog directement rattaché à un projet
// ─────────────────────────────────────────────────────────────
export interface CreateBacklogForProjetRequest {
  name: string;
  desc?: string;
  projetId: number;
  leadId?: number | null; 
  type: BacklogType;
}