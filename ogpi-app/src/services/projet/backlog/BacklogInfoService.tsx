import { AxiosInstance } from "axios";
import { Backlog } from "../../../types/lead/Backlog/Backlog";
// ── Types retournés par l'API ─────────────────────────────────────────────

export interface BacklogInfoCollaborateur {
  id: number;
  nom: string;
  prenom: string;
  appellation?: string;
  matricule?: string;
  emailPro?: string;
  telephone?: string;
}

export interface BacklogInfoProfil {
  id: number;
  order: number;
  name: string;
  desc?: string;
  tjm: number;
  backlogId: number;
  collaborateurs?: BacklogInfoCollaborateur[];
}

export interface BacklogInfoSprint {
  id: number;
  name: string;
  order: number;
  dateDebut?: string;
  dateFin?: string;
  phaseId: number;
}

export interface BacklogInfoPhase {
  id: number;
  name: string;
  order: number;
  lotId: number;
  dateDebut?: string;
  dateFin?: string;
  sprints?: BacklogInfoSprint[];
}

export interface BacklogInfoLot {
  id: number;
  order: number;
  name: string;
  desc?: string;
  backlogId: number;
  phases?: BacklogInfoPhase[];
}

export interface BacklogInfo {
  id: number;
  name: string;
  desc?: string;
  leadId?: number | null;
  projetId?: number | null;
  profils?: BacklogInfoProfil[];         // profils simples
  profilsProjet?: BacklogInfoProfil[];   // profils avec collaborateurs
  lots?: BacklogInfoLot[];
  lines?: any[];
}

// ── Stats calculées côté front ─────────────────────────────────────────────

export interface BacklogStats {
  totalLots: number;
  totalPhases: number;
  totalSprints: number;
  totalProfils: number;
  totalCollaborateurs: number;
  totalLines: number;
}

export function computeBacklogStats(info: BacklogInfo): BacklogStats {
  const lots      = info.lots ?? [];
  const phases    = lots.flatMap(l => l.phases ?? []);
  const sprints   = phases.flatMap(p => p.sprints ?? []);
  const profils   = info.profilsProjet ?? info.profils ?? [];
  const collabs   = profils.flatMap(p => p.collaborateurs ?? []);
  // dédoublonnage par id
  const uniqueCollabs = [...new Map(collabs.map(c => [c.id, c])).values()];

  return {
    totalLots:           lots.length,
    totalPhases:         phases.length,
    totalSprints:        sprints.length,
    totalProfils:        profils.length,
    totalCollaborateurs: uniqueCollabs.length,
    totalLines:          (info.lines ?? []).length,
  };
}

// ── Service ───────────────────────────────────────────────────────────────

export class BacklogInfoService {
  private readonly BASE = "/api/projet/backlogs";

  constructor(private readonly api: AxiosInstance) {}

  /** En-tête du backlog d'un projet (léger) */
  async getHeaderByProjetId(projetId: number): Promise<BacklogInfo | null> {
    try {
      const res = await this.api.get<BacklogInfo>(`${this.BASE}/projet/${projetId}`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  /** Backlog complet avec toute la hiérarchie */
  async getFullByProjetId(projetId: number): Promise<BacklogInfo | null> {
    try {
      const res = await this.api.get<BacklogInfo>(`${this.BASE}/projet/${1}/full`);
      return res.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  /** Backlog complet par id */
  async getFullById(backlogId: number): Promise<BacklogInfo> {
    const res = await this.api.get<BacklogInfo>(`${this.BASE}/${backlogId}/full`);
    return res.data;
  }

  /** Mise à jour nom/desc du backlog */
  async update(backlogId: number, data: { name: string; desc?: string }): Promise<BacklogInfo> {
    const res = await this.api.put<BacklogInfo>(`${this.BASE}/${backlogId}`, data);
    return res.data;
  }
}