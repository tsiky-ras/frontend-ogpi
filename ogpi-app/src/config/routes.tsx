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
    label: "Référentiels",
    icon: <FaCogs />,
    children: [
      // 🔹 2e niveau : Utilisateur
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

      // 🔹 2e niveau : Opportunités
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
    ],
  },
];
