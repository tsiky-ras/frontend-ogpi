import { BacklogProfil } from "../Backlog/Backlog.tsx";

/* =======================
   TECHNO / FINANCE
======================= */

export interface Techno {
  id: number;
  name: string;
  desc?: string;
}

export interface TechnoLead {
  id: number;
  techno: Techno;
}

export interface Devise {
  id: number;
  abrDevise: string;
  nomDevise: string;
}

export interface TypeFacturation {
  id: number;
  nom: string;
  isFacturable: boolean;
}

/* =======================
   CHIFFRES (BACKLOG)
======================= */

export interface ChiffresPhase {
  idPhase: number;
  nomPhase: string;

  totalVolumeJH: number;
  totalMontant: number;
}

export interface ChiffresLot {
  idLot: number;
  nomLot: string;

  totalVolumeJH: number;
  totalMontant: number;

  phases: ChiffresPhase[];
}

export interface ChiffresBacklog {
  idBacklog: number;
  nomBacklog: string;

  totalVolumeJHBacklog: number;
  totalMontantBacklog: number;

  lots: ChiffresLot[];
}

/* =======================
   LEAD TECH & FIN
======================= */

export interface LeadTechFinDetails {
  idLeadTechFinDetails?: number;
  idLead: number;
  technos: number[];
  volumeJHVendu: number;
  montantOffre: number; 
  tauxDeChange: number;
  impots: number;
  dateAttribution: string;
  devise: {
    idDevise: number;
    abrDevise?:string;
  };
  typeFacturation: {
    idTypeFacturation: number;
  };
  volumeJHVenduEtMontant?: ChiffresBacklog[];
  montantChargeAnnexe?: number;
  montantAvecChargeAnnexe?:number;
}
