import {
  FaUsers,
  FaUserTie,
  FaCogs,
  FaGraduationCap,
  FaUniversity,
  FaStream,
  FaTools,
  FaBriefcase,
  FaCertificate,
} from "react-icons/fa";

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
  {
    path: "/admin/gestion-opportunites",
    label: "Opportunités",
    icon : <FaBriefcase />,
  },
  {
    label: "Référentiels",
    icon: <FaCogs />,
    children: [
      {
        path: "/admin/config/diplomes",
        label: "Diplômes",
        icon: <FaGraduationCap />,
      },
      {
        path: "/admin/config/etablissements",
        label: "Établissements",
        icon: <FaUniversity />,
      },
      {
        path: "/admin/config/filieres",
        label: "Filières",
        icon: <FaStream />,
      },
      {
        path: "/admin/config/hard-skills",
        label: "Hard Skills",
        icon: <FaTools />,
      },
      {
        path: "/admin/config/soft-skills",
        label: "Soft Skills",
        icon: <FaTools />,
      },
      {
        path: "/admin/config/postes",
        label: "Postes",
        icon: <FaBriefcase />,
      },
      {
        path: "/admin/config/certifications",
        label: "Certifications",
        icon: <FaCertificate />,
      },
      {
        path: "/admin/config/organismes",
        label: "Organismes",
        icon: <FaUniversity />,
      },
      {
        path: "/admin/config/business-units",
        label: "Business Units",
        icon: <FaBriefcase />,
      },
    ],
  },
];
