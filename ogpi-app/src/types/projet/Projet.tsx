import { TypeFacturation } from "../../types/lead/tech-fin/LeadTechFin.tsx";
import { User } from "../user/User";

export interface ProjetClient {
  id: number;
  name: string;
  email?: string;
}

export interface ProjetLead {
  leadId: number;
  leadName?: string;
  leadRef?: string;
  client?: ProjetClient;
}

export interface Projet {
  idProjet?: number;
  nomProjet: string;
  dateAttribution?: string;
  dateDebutPrevu: string;
  dateFinPrevu: string;
  refBC?: string;
  refCompte?: string;
  description?: string;
  userCp?: User;
  userSuppleante?: User;
  typeFacturation?: TypeFacturation;
  lead?: ProjetLead;
}