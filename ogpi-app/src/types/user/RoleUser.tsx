import { Role } from "./Role";
import { User } from "./User";

export interface RoleUser {
    id:number,
    user:User,
    role:Role
}