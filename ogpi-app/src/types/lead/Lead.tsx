import { TypeProjetFinancementService } from '../../services/lead/TypeProjetFinancementService.tsx';
import { Client } from './Client.tsx';
import { LeadCategory } from './LeadCategory.tsx';
import { LeadSecteur } from './LeadSecteur';
import { LeadStatus } from './LeadStatus';
import { LeadType } from './LeadType';
import { Partenaire } from './Partenaire.tsx';
import { TypeProjetFinancement } from './TypeProjetFinancement.tsx';
import { BusinessUnit } from '../profil/poste/BusinessUnit.tsx';
import { DriveFile } from './DriveFile.tsx';
import { DriveFolder } from './DriveFolder.tsx';
import { Validation } from './Validation.tsx';

// Types pour les historiques et statuts actuels
export interface LeadStep {
  id: number;
  order: number;
  label: string;
}

export interface CurrentLeadStatus {
  id: number;
  dateUpdated: string;
  leadId: number;
  leadStatus: LeadStatus;
}

export interface CurrentLeadStep {
  id: number;
  dateChangement: string;
  leadId: number;
  leadStep: LeadStep;
}

export interface CreatedByUser {
  id: number;
  username: string;
  email: string;
}

export interface Lead {
  // Identifiants
  id: number;               
  name: string;            
  reference: string;        
  description: string;       

  // Dates
  periode: string;           
  internalDeadline: string;  
  realDeadline: string;      

  // Détails du projet
  projetFinancement: string; 
  commentaire: string;      

  // Zone et JIRA
  zone: number;              // 0 = Local, 1 = OffShore
  jiraProject: string;     
  jiraTicket: string;        

  // Drive
  driveFolder?: DriveFolder; 
  driveFile?: DriveFile;
  
  // Relations
  client: Client;
  type: LeadType;
  category: LeadCategory;
  secteur: LeadSecteur;
  status: LeadStatus;
  typeFinancement: TypeProjetFinancement;
  businessUnit: BusinessUnit;

  // Partenaires
  partenaires: Partenaire[];
  // used for display
  leadPartenaires:Partenaire[];

  // Statut et étape actuels
  currentLeadStatus?: CurrentLeadStatus;
  currentLeadStep?: CurrentLeadStep;

  // Créateur du lead
  createdByUser?: CreatedByUser;

  // Validations
  validations?: Validation[];
}