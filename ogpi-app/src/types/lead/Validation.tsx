import { RoleUser } from "../user/RoleUser";
import { Lead } from "./Lead";

export interface Validation {
  id?: number;
  lead?: Lead   ;
  decision: number; 
  comments: string;
  dateValidation?: string;
  validatedBy: RoleUser;
}
