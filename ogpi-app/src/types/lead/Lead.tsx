import { Client } from './Client.tsx';
import { LeadCategory } from './LeadCategory.tsx';
import { LeadSecteur } from './LeadSecteur';
import { LeadStatus } from './LeadStatus';
import { LeadType } from './LeadType';
import { Partenaire } from './Partenaire.tsx';
export interface Opportunity {
  id: number;                // lead_id
  name: string;              // lead_name
  reference: string;         // lead_ref
  description: string;       // lead_descri

  periode: string;           // lead_periode (ISO date)
  internalDeadline: string;  // lead_internal_deadline
  realDeadline: string;      // lead_real_deadline

  projetFinancement: string; // projet_de_financement
  commentaire: string;       // lead_commentaire

  zone: number;              // lead_zone
  jiraProject: string;       // lead_go_projet_jira_avv
  jiraTicket: string;        // lead_go_ticket_jira

  driveFolder: string;       // lien_drive_folder
  driveFile: string;         // lien_drive_file

  // Relations simplifiées
  client: Client;
  type: LeadType;
  category: LeadCategory;
  secteur: LeadSecteur;
  status: LeadStatus;

  partenaires: Partenaire[];

  createdAt?: string;
  updatedAt?: string;
}
