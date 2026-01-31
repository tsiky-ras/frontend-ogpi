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

export interface Lead {
  id: number;               
  name: string;            
  reference: string;        
  description: string;       

  periode: string;           
  internalDeadline: string;  
  realDeadline: string;      

  projetFinancement: string; 
  commentaire: string;      

  zone: number;             
  jiraProject: string;     
  jiraTicket: string;        

  driveFolder?: DriveFolder; 
  driveFile?: DriveFile;
  
  client: Client;
  type: LeadType;
  category: LeadCategory;
  secteur: LeadSecteur;
  status: LeadStatus;
  typeFinancement: TypeProjetFinancement;
  businessUnit: BusinessUnit;

  partenaires: Partenaire[];

}
