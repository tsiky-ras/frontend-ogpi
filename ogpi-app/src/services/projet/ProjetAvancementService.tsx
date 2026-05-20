/**
 * ProjetAvancementService.tsx
 * Correspond à ProjetAvancementController.java
 *
 * GET /api/projets/avancements       → tous les avancements (1 requête SQL)
 * GET /api/projets/{id}/avancement   → avancement d'un projet précis
 */
import { AxiosInstance } from 'axios';

export interface ProjetAvancement {
  projetId:            number;
  tachesValidees:      number;
  tachesTotal:         number;
  avancementTaches:    number;  // 0–100 %
  totalPaye:           number;
  montantOffre:        number;
  avancementPaiement:  number;  // 0–100 %
}

export class ProjetAvancementService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  /** Charge tous les avancements en une seule requête SQL côté back. */
  async getAll(): Promise<ProjetAvancement[]> {
    try {
      const r = await this.api.get('/projets/avancements');
      return r.data ?? [];
    } catch {
      return [];
    }
  }

  /** Rafraîchit l'avancement d'un seul projet (après paiement, validation tâche…). */
  async getByProjetId(projetId: number): Promise<ProjetAvancement | null> {
    try {
      const r = await this.api.get(`/projets/${projetId}/avancement`);
      return r.data;
    } catch {
      return null;
    }
  }

  /** Convertit un tableau en Map<projetId, avancement> pour lookup O(1). */
  static toMap(list: ProjetAvancement[]): Map<number, ProjetAvancement> {
    const m = new Map<number, ProjetAvancement>();
    list.forEach(a => m.set(a.projetId, a));
    return m;
  }
}