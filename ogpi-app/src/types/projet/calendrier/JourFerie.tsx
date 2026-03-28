// src/types/calendrier/JourFerie.ts

export type JourFerieType = 'FIXE' | 'VARIABLE';

export interface JourFerie {
  id: number;
  libelle: string;
  type: JourFerieType;
  /** Mois 1-12 — rempli pour les FIXE */
  mois?: number;
  /** Jour 1-31 — rempli pour les FIXE */
  jour?: number;
  /** Date exacte ISO (yyyy-MM-dd) — remplie pour les VARIABLE */
  dateExacte?: string;
  actif: boolean;
  description?: string;
}

export interface JourFerieForm {
  libelle: string;
  type: JourFerieType;
  mois?: number;
  jour?: number;
  dateExacte?: string;
  actif: boolean;
  description?: string;
}

/** Réponse de GET /api/jours-feries/prochain-ouvrable */
export interface ProchainOuvrableResponse {
  dateOriginale: string;
  dateAjustee: string;
  estAjustee: boolean;
  libelleJourFerie: string;
}

/** Réponse de GET /api/jours-feries/verifier */
export interface VerifierDateResponse {
  date: string;
  ferie: boolean;
}

/** Noms lisibles des mois */
export const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
  5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
  9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
};

/** Formatte un JourFerie FIXE en texte lisible (ex : "1er janvier") */
export function formatDateFixe(jf: JourFerie): string {
  if (jf.type !== 'FIXE' || !jf.mois || !jf.jour) return '';
  return `${jf.jour} ${MOIS_LABELS[jf.mois]}`;
}
