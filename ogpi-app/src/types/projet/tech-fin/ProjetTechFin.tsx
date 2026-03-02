import { ChiffresBacklog, Techno } from "../../lead/tech-fin/LeadTechFin.tsx";

/* =======================
   PROJET TECHNO / FINANCE
======================= */

export interface TechnoProjet {
  id: number;
  techno: Techno;
}

/* =======================
   PROJET TECH & FIN
======================= */

export interface ProjetTechFinDetails {
  idProjetTechFinDetails?: number;
  idProjet: number;

  technos: number[]; 

  volumeJHTotal: number;     
  montantProjet: number;     

  tauxDeChange: number;
  impots: number;

  dateDemarrage: string;
  dateFinPrevue: string;

  devise: {
    idDevise: number;
  };

  typeFacturation: {
    idTypeFacturation: number;
  };

  chiffresBacklog?: ChiffresBacklog[];
}