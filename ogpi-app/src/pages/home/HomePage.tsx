import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/header/Header.tsx";
import Sidebar from "../../components/sidebar/Sidebar.tsx";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  FaBriefcase,
  FaProjectDiagram,
  FaThList,
  FaCalendarAlt,
  FaChartBar,
  FaUsers,
  FaHome,
  FaChevronRight,
} from "react-icons/fa";
import "./HomePage.css";

interface NavCard {
  label: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  accent: string;
  requiredPerm?: string;
}

const NAV_CARDS: NavCard[] = [
  {
    label: "Opportunités",
    description: "Suivi des leads, validation et organisation",
    path: "/gestion-opportunites",
    icon: <FaBriefcase size={20} />,
    accent: "#2563eb",
    requiredPerm: "OPP_VIEW",
  },
  {
    label: "Projets",
    description: "Gestion et pilotage des projets en cours",
    path: "/gestion-projets",
    icon: <FaProjectDiagram size={20} />,
    accent: "#0891b2",
    requiredPerm: "PROJ_VIEW",
  },
  {
    label: "Tâches Leads",
    description: "Mes tâches à faire et à valider",
    path: "/gestion-taches",
    icon: <FaThList size={20} />,
    accent: "#059669",
    requiredPerm: "TACHE_VIEW",
  },
  {
    label: "Tâches Projet",
    description: "Tâches workload des projets",
    path: "/gestion-taches-projet",
    icon: <FaThList size={20} />,
    accent: "#d97706",
    requiredPerm: "TACHE_VIEW",
  },
  {
    label: "Calendrier",
    description: "Échéances et deadlines à venir",
    path: "/calendrier/deadlines",
    icon: <FaCalendarAlt size={20} />,
    accent: "#dc2626",
  },
  {
    label: "Charge & Équipe",
    description: "Taux d'occupation des collaborateurs",
    path: "/admin/occupation-collaborateurs",
    icon: <FaChartBar size={20} />,
    accent: "#7c3aed",
    requiredPerm: "OCC_VIEW_OWN",
  },
  {
    label: "Collaborateurs",
    description: "Gestion des profils collaborateurs",
    path: "/admin/collaborateurs",
    icon: <FaUsers size={20} />,
    accent: "#475569",
    requiredPerm: "COLLAB_VIEW",
  },
];

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userPerms: string[] = (user as any)?.permissions ?? [];

  const visibleCards = NAV_CARDS.filter(
    (c) => !c.requiredPerm || userPerms.includes(c.requiredPerm)
  );

  return (
    <div className="page-lead-layout">
      <Header />
      <div className="liste-lead-wrapper">
        <aside className="liste-lead-sidebar">
          <Sidebar />
        </aside>

        <main className="liste-lead-main">
          <div className="hp-container">

            {/* Bandeau de bienvenue */}
            <div className="hp-welcome">
              <div className="hp-welcome-icon">
                <FaHome size={22} />
              </div>
              <div className="hp-welcome-text">
                <h2 className="hp-title">
                  Bonjour{user?.username ? `, ${user.username}` : ""}
                </h2>
                <p className="hp-subtitle">
                  Bienvenue sur OGPI — Gestion de projets et opportunités.
                  Choisissez une section pour commencer.
                </p>
              </div>
            </div>

            {/* Label section */}
            <div className="hp-section-label">Accès rapide</div>

            {/* Grille de navigation */}
            <div className="hp-grid">
              {visibleCards.map((card) => (
                <button
                  key={card.path}
                  className="hp-card"
                  onClick={() => navigate(card.path)}
                  style={{ "--card-accent": card.accent } as React.CSSProperties}
                >
                  <div className="hp-card-icon">{card.icon}</div>
                  <div className="hp-card-body">
                    <span className="hp-card-label">{card.label}</span>
                    <span className="hp-card-desc">{card.description}</span>
                  </div>
                  <div className="hp-card-arrow">
                    <FaChevronRight size={12} />
                  </div>
                </button>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
