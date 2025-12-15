import { Role } from "./Role";

export interface User {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  role: string ;
  roleRank?: number;
  landingPage?: string;
  statut: "actif" | "inactif";
  email: string;
  username: string;
  password: string;
  adresse?: string;
  address?: string;
  createdAt?: string;
  roleObject?:Role;
}
