import { Role } from "./Role";
import { Permission } from "./Permission";
import { Profil } from "../profil/Profil";

export interface User {
  userId: number;            // ID du compte
  username: string;          // login
  email: string;             // email de connexion
  password: string;          // mot de passe (hashed)
  created_at: string;         // date création compte (ISO string)
  is_active: boolean;         // compte actif ou non
  date_desactivation?: string; // date de désactivation éventuelle

  roles: Role[];             // rôles appliqués à ce compte
  permissions: Permission[]; // permissions spécifiques (optionnel si rôle suffit)

  profil: Profil;            // lien vers le profil RH
}
