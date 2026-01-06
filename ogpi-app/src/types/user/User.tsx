import { Role } from "./Role";
import { Permission } from "./Permission";
import { Profil } from "../profil/Profil";

export interface User {
  userId: number;            
  username: string;          
  email: string;            
  password: string;          
  created_at: string;       
  is_active: boolean;        
  date_desactivation?: string; 

  roles: Role[];            
  permissions: Permission[]; 

  profil: Profil;           
}
