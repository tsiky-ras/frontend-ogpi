import { TypeFacturation } from "../../types/lead/tech-fin/LeadTechFin.tsx";
import { User } from "../user/User";
export interface Projet {
  idProjet?: number;
  nomProjet: string;
  dateAttribution?: string;      
  dateDebutPrevu: string;
  dateFinPrevu: string;
  refBC?: string;
  refCompte?: string;
  userCp?: User;
  userSuppleante?: User;
  typeFacturation?: TypeFacturation;
}