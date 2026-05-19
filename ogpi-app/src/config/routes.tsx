import React from "react";
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
  FaUserCheck,
  FaTags,
  FaIndustry,
  FaFlagCheckered,
  FaThList,
  FaHandshake,
  FaMoneyBillWave,
  FaProjectDiagram,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartBar,
  FaShieldAlt,
  FaDatabase,
} from "react-icons/fa";

export interface RouteConfig {
  path?: string;
  label: string;
  icon: React.ReactNode;
  requiredPerm?: string;   // perm code required to see this entry
  children?: RouteConfig[];
}

export const routes: RouteConfig[] = [
  {
    path: "/admin/gestion-user",
    label: "Utilisateurs",
    icon: <FaUsers />,
    requiredPerm: "ADMIN_USERS",
  },
  {
    path: "/admin/collaborateurs",
    label: "Collaborateurs",
    icon: <FaUserTie />,
    requiredPerm: "COLLAB_VIEW",
  },
  {
    path: "/gestion-opportunites",
    label: "Opportunités",
    icon: <FaBriefcase />,
    requiredPerm: "OPP_VIEW",
  },
  {
    path: "/gestion-projets",
    label: "Projets",
    icon: <FaProjectDiagram />,
    requiredPerm: "PROJ_VIEW",
  },
  {
    label: "Tâches",
    icon: <FaThList />,
    children: [
      {
        path: "/gestion-taches",
        label: "Tâches Leads",
        icon: <FaThList />,
        requiredPerm: "TACHE_VIEW",
      },
      {
        path: "/gestion-taches-projet",
        label: "Tâches Projet",
        icon: <FaThList />,
        requiredPerm: "TACHE_VIEW",
      },
    ],
  },
  {
    label: "Calendrier",
    icon: <FaCalendarAlt />,
    path: "/calendrier/deadlines",
  },
  {
    path: "/admin/occupation-collaborateurs",
    label: "Charge & Équipe",
    icon: <FaChartBar />,
    requiredPerm: "OCC_VIEW_OWN",
  },
  {
    path: "/admin/gestion-droits",
    label: "Droits d'accès",
    icon: <FaShieldAlt />,
    requiredPerm: "ADMIN_RIGHTS",
  },
  // {
  //   path: "/admin/backup",
  //   label: "Exports & Backup",
  //   icon: <FaDatabase />,
  //   requiredPerm: "EXPORT_DATA",
  // },
  {
    label: "Archives",
    icon: <FaThList />,
    children: [
      {
        path: "/archive-lead",
        label: "Archives Leads",
        icon: <FaThList />,
        requiredPerm: "ARCHIVE_VIEW",
      },
      {
        path: "/archive-projets",
        label: "Archives Projet",
        icon: <FaThList />,
        requiredPerm: "ARCHIVE_VIEW",
      },
    ],
  },
  {
    label: "Référentiels",
    icon: <FaCogs />,
    requiredPerm: "ADMIN_CONFIG",
    children: [
      {
        label: "Utilisateur",
        icon: <FaUsers />,
        children: [
          { path: "/admin/config/diplomes",       label: "Diplômes",        icon: <FaGraduationCap /> },
          { path: "/admin/config/etablissements", label: "Établissements",  icon: <FaUniversity /> },
          { path: "/admin/config/filieres",       label: "Filières",        icon: <FaStream /> },
          { path: "/admin/config/hard-skills",    label: "Hard Skills",     icon: <FaTools /> },
          { path: "/admin/config/soft-skills",    label: "Soft Skills",     icon: <FaTools /> },
          { path: "/admin/config/postes",         label: "Postes",          icon: <FaBriefcase /> },
          { path: "/admin/config/certifications", label: "Certifications",  icon: <FaCertificate /> },
          { path: "/admin/config/organismes",     label: "Organismes",      icon: <FaUniversity /> },
          { path: "/admin/config/business-units", label: "Business Units",  icon: <FaBriefcase /> },
        ],
      },
      {
        label: "Opportunités",
        icon: <FaBriefcase />,
        children: [
          { path: "/admin/config/lead-clients",     label: "Client",               icon: <FaUserCheck /> },
          { path: "/admin/config/lead-categories",  label: "Catégorie",            icon: <FaTags /> },
          { path: "/admin/config/lead-secteur",     label: "Secteur",              icon: <FaIndustry /> },
          { path: "/admin/config/lead-statut",      label: "Statut Opportunité",   icon: <FaFlagCheckered /> },
          { path: "/admin/config/lead-types",       label: "Type Opportunité",     icon: <FaThList /> },
          { path: "/admin/config/lead-partenaire",  label: "Partenaire",           icon: <FaHandshake /> },
          { path: "/admin/config/lead-financement", label: "Type de Financement",  icon: <FaMoneyBillWave /> },
        ],
      },
      {
        path: "/admin/config/jours-feries",
        label: "Jours fériés",
        icon: <FaCalendarCheck />,
      },
    ],
  },
];
