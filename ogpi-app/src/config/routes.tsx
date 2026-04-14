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
    path: "/gestion-opportunites",
    label: "Opportunités",
    icon: <FaBriefcase />,
  },
  {
    path: "/gestion-projets",
    label: "Projets",
    icon: <FaProjectDiagram />,
  },
  {
    label: "Tâches",
    icon: <FaThList />, 
    children:[
      {
        path: "/gestion-taches",
        label: "Tâches Leads",
        icon: <FaThList />,
      },
      {
        path: "/gestion-taches-projet",
        label: "Tâches Projet",
        icon: <FaThList />,
      }
    ]
  },
  {
    label: "Calendrier",
    icon: <FaCalendarAlt />,
    path: "/calendrier/deadlines"
  },
  {
    label: "Archive",
    icon: <FaThList />, 
    children:[
      {
        path: "/gestion-taches",
        label: "Archive Leads",
        icon: <FaThList />,
      },
      {
        path: "/gestion-taches-projet",
        label: "Archive Projet",
        icon: <FaThList />,
      }
    ]
  },
  {
    label: "Référentiels",
    icon: <FaCogs />,
    children: [
      {
        label: "Utilisateur",
        icon: <FaUsers />,
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
      {
        label: "Opportunités",
        icon: <FaBriefcase />,
        children: [
          {
            path: "/admin/config/lead-clients",
            label: "Client",
            icon: <FaUserCheck />,
          },
          {
            path: "/admin/config/lead-categories",
            label: "Catégorie",
            icon: <FaTags />,
          },
          {
            path: "/admin/config/lead-secteur",
            label: "Secteur",
            icon: <FaIndustry />,          
          },
          {
            path: "/admin/config/lead-statut",
            label: "Statut Opportunité",
            icon: <FaFlagCheckered />,   
          },
          {
            path: "/admin/config/lead-types",
            label: "Type Opportunité",
            icon: <FaThList />,          
          },
          {
            path: "/admin/config/lead-partenaire",
            label: "Partenaire",
            icon: <FaHandshake />,       
          },
          {
            path: "/admin/config/lead-financement",
            label: "Type de Financement",
            icon: <FaMoneyBillWave />, 
          },
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