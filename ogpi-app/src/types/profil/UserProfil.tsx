import { Role } from "../user/Role";
import { Permission } from "../user/Permission";

export interface UserProfil {
  user_id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  date_desactivation?: string;

  roles: Role[];
  permissions: Permission[];
}
