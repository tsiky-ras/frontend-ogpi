// src/services/projet/ProjetStatutService.tsx

export interface ProjetStatut {
  id: number;
  label: string;
  order: number;
}

export interface ProjetStatutHistory {
  id: number;
  dateChangement: string;
  commentaire: string | null;
  projetId: number;
  statut: ProjetStatut;
  changedBy: { id: number; username: string } | null;
}

export class ProjetStatutService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Tous les statuts référentiels (tri par order) */
  async getStatuts(): Promise<ProjetStatut[]> {
    try {
      const r = await this.api.get('/projets/statuts');
      return r.data ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Statut courant de chaque projet.
   * Retourne un Map projetId → ProjetStatut
   */
  async getStatutsCourants(): Promise<Map<number, ProjetStatut>> {
    try {
      const r = await this.api.get('/projets/statuts/courants');
      const map = new Map<number, ProjetStatut>();
      (r.data as Array<{ projetId: number; statut: ProjetStatut }>).forEach(
        item => map.set(item.projetId, item.statut)
      );
      return map;
    } catch {
      return new Map();
    }
  }

  /** Change le statut d'un projet */
  async changerStatut(
    projetId: number,
    statutId: number,
    commentaire?: string
  ): Promise<ProjetStatutHistory> {
    const r = await this.api.post(`/projets/${projetId}/statut`, {
      statutId,
      commentaire: commentaire ?? null,
    });
    return r.data;
  }

  /** Historique complet des statuts d'un projet */
  async getHistorique(projetId: number): Promise<ProjetStatutHistory[]> {
    try {
      const r = await this.api.get(`/projets/${projetId}/statut/historique`);
      return r.data ?? [];
    } catch {
      return [];
    }
  }
}