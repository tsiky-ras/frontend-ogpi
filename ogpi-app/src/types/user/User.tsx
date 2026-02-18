import { Role } from "./Role";
import { Permission } from "./Permission";
import { Profil } from "../profil/Profil";
import { RoleUser } from "./RoleUser";

export interface User {
  userId: number;
  username: string;
  email: string;
  password?: string;

  is_active: boolean;
  role?: Role;
  permissions?: Permission[];
  profil?: Profil;
}
