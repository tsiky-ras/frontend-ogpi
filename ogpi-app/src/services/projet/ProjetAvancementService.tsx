/**
 * Service frontend pour les avancements projet.
 * GET /api/projets/avancements  → tableau de ProjetAvancement
 * GET /api/projets/{id}/avancement → un seul ProjetAvancement
 */

export interface ProjetAvancement {
  projetId: number;
  tachesValidees: number;
  tachesTotal: number;
  /** % tâches VALIDE / total (0–100) */
  avancementTaches: number;
  totalPaye: number;
  montantOffre: number;
  /** % payé / montant offre (0–100) */
  avancementPaiement: number;
}

export class ProjetAvancementService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Récupère les avancements de tous les projets en une seule requête. */
  async getAll(): Promise<ProjetAvancement[]> {
    try {
      const r = await this.api.get("/projets/avancements");
      return r.data ?? [];
    } catch {
      return [];
    }
  }

  /** Avancement d'un projet précis. */
  async getByProjetId(id: number): Promise<ProjetAvancement | null> {
    try {
      const r = await this.api.get(`/projets/${id}/avancement`);
      return r.data ?? null;
    } catch {
      return null;
    }
  }

  /** Transforme le tableau en Map projetId → ProjetAvancement */
  static toMap(list: ProjetAvancement[]): Map<number, ProjetAvancement> {
    const m = new Map<number, ProjetAvancement>();
    list.forEach(a => m.set(a.projetId, a));
    return m;
  }
}