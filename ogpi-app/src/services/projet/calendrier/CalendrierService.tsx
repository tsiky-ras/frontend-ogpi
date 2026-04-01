// src/services/calendrier/CalendrierService.tsx

export type TypeEvenement =
  | "DEADLINE_TACHE"
  | "LIVRAISON"
  | "PAIEMENT"
  | "DEADLINE_OFFRE"
  | "DEADLINE_PROJET"
  | "DEADLINE_LOT"
  | "DEADLINE_PHASE"
  | "DEADLINE_SPRINT"
  | "DEADLINE_LIVRABLE"
  | "REUNION";

export interface CalendrierEvenement {
  id: number;
  type: TypeEvenement;
  date: string;             // ISO yyyy-MM-dd
  titre: string;
  description?: string | null;
  projetNom?: string | null;
  projetId?: number | null;
  statut?: string | null;
  meta1?: string | null;    // profilNom (tâche) | typeRef (paiement) | lotNom | phaseNom | sprintNom
  meta2?: string | null;    // collaborateur (tâche) | montant (paiement)
  accompli?: boolean | null;
}

export interface AddEvenementPayload {
  type: TypeEvenement;
  titre: string;
  date: string;
  description?: string | null;
  projetNom?: string | null;
}

export const TYPE_META: Record<
  TypeEvenement,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  DEADLINE_TACHE:    { label: "Deadline tâche",    color: "#C93C29", bg: "#fff5f5", border: "#f8d0cb", dot: "#C93C29" },
  LIVRAISON:         { label: "Livraison",          color: "#c4942a", bg: "#fffbeb", border: "#f5dfa3", dot: "#EABF5B" },
  PAIEMENT:          { label: "Paiement client",    color: "#223A46", bg: "#f0f4f7", border: "#b8cdd6", dot: "#223A46" },
  DEADLINE_OFFRE:    { label: "Deadline offre",     color: "#7c3aed", bg: "#f5f3ff", border: "#d4c6f7", dot: "#8b5cf6" },
  DEADLINE_PROJET:   { label: "DL projet",          color: "#0f6e56", bg: "#e1f5ee", border: "#9fe1cb", dot: "#1D9E75" },
  DEADLINE_LOT:      { label: "DL lot",             color: "#185FA5", bg: "#e6f1fb", border: "#b5d4f4", dot: "#378ADD" },
  DEADLINE_PHASE:    { label: "DL phase",           color: "#854F0B", bg: "#faeeda", border: "#fac775", dot: "#EF9F27" },
  DEADLINE_SPRINT:   { label: "DL sprint",          color: "#993556", bg: "#fbeaf0", border: "#f4c0d1", dot: "#D4537E" },
  DEADLINE_LIVRABLE: { label: "DL livrable",        color: "#5F6F6E", bg: "#f1f5f9", border: "#d3d1c7", dot: "#888780" },
  REUNION:           { label: "Réunion",             color: "#7c3aed", bg: "#f5f3ff", border: "#d4c6f7", dot: "#7c3aed" },
};

export class CalendrierService {
  private readonly api: any;

  constructor(api: any) {
    this.api = api;
  }

  /** Récupère tous les événements de l'utilisateur courant */
  async getEvenements(): Promise<CalendrierEvenement[]> {
    try {
      const r = await this.api.get("/calendrier/evenements");
      return r.data ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Ajoute un événement manuel.
   * Retourne l'événement créé avec son id serveur.
   */
  async addEvenement(payload: AddEvenementPayload): Promise<CalendrierEvenement> {
    const r = await this.api.post("/calendrier/evenements", payload);
    return r.data;
  }
}