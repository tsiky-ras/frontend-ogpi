import { ProfilPoste } from "./ProfilPoste";
import { ProfilEtude } from "./ProfilEtude";
import { ProfilCertification } from "./ProfilCertification";
import { ProfilHardSkill, ProfilSoftSkill } from "./Skills";
import { UserProfil } from "./UserProfil";

export interface Profil {
  profil_id: number;
  matricule: string;

  nom: string;
  prenom: string;
  appelation: string;
  sexe: number;
  date_naissance?: string;

  email_pro: string;
  email_perso: string;
  telephone: string;

  type_profil: number;
  type_contrat: number;
  date_embauche: string;
  date_integration?: string;
  date_debauche?: string;
  experience_avant?: number;

  postes: ProfilPoste[];
  etudes: ProfilEtude[];
  certifications: ProfilCertification[];
  hard_skills: ProfilHardSkill[];
  soft_skills: ProfilSoftSkill[];

  user?: UserProfil; 
}
