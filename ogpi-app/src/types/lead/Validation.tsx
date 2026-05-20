export interface ValidationUser {
  id: number;
  username: string;
  email: string;
}

export interface ValidationRole {
  roleId: number;
  roleLabel: string;
}

export interface Validation {
  id: number;
  user: ValidationUser;
  decision: number; // 0 = No Go, 1 = Go
  commentaire: string;
  leadId: number;
  role: ValidationRole;
  dateValidation:String;
}

export interface CreateValidationRequest {
  leadId: number;
  decision: number; // 0 = No Go, 1 = Go
  commentaire: string;
}

export interface LeadValidationCheckDTO {
  validated: boolean;
  nextRole?:string;
}