// config/routes.tsx
import { FaUsers, FaUserTie } from "react-icons/fa";

export const routes = [
  {
    path: "/admin/gestion-user",
    label: "Utilisateurs",
    icon: <FaUsers />,
  },
  {
    path: "/admin/collaborateurs",
    label: "Collaborateurs",
    icon: <FaUserTie />,
  },
];
