import React from "react";
import { FaUserTie, FaUsers } from "react-icons/fa";

type Collaborateur = {
  id: number;
  nom: string;
  prenom: string;
  appellation?: string | null;
  emailPro?: string | null;
};

type ProfilEquipe = {
  id: number;
  name: string;
  desc?: string | null;
  tjm: number;
  order: number;
  collaborateurs: Collaborateur[];
};

type EquipeTabProps = {
  profils: ProfilEquipe[];
  deviseAbr?: string;
  loading?: boolean;
};

const EquipeTab: React.FC<EquipeTabProps> = ({ profils, deviseAbr = "€", loading }) => {
  if (loading) return (
    <div className="struct-loading"><div className="struct-spinner" /><span>Chargement de l'équipe…</span></div>
  );

  const totalCollabs = profils.reduce((sum, p) => sum + p.collaborateurs.length, 0);
  const nonPourvus = profils.filter(p => p.collaborateurs.length === 0).length;

  if (!profils.length) return (
    <div className="struct-empty"><FaUsers size={32} opacity={0.3} /><p>Aucun profil défini pour ce projet.</p></div>
  );

  return (
    <div className="equipe-container">
      {/* Stats */}
      <div className="equipe-stats">
        <div className="equipe-stat-card">
          <div className="equipe-stat-value">{totalCollabs}</div>
          <div className="equipe-stat-label">Collaborateur{totalCollabs !== 1 ? "s" : ""}</div>
        </div>
        <div className="equipe-stat-card">
          <div className="equipe-stat-value">{profils.length}</div>
          <div className="equipe-stat-label">Profil{profils.length !== 1 ? "s" : ""} définis</div>
        </div>
      </div>

      {/* Profils */}
      <div className="equipe-profils">
        {profils.sort((a, b) => a.order - b.order).map(profil => (
          <div key={profil.id} className="equipe-profil-card">
            <div className="equipe-profil-header">
              <div className="equipe-profil-info">
                <FaUserTie size={14} className="me-2 text-muted" />
                <strong>{profil.name}</strong>
                {profil.desc && <small className="text-muted ms-2">— {profil.desc}</small>}
              </div>
              <span className="equipe-tjm-badge">{profil.tjm.toLocaleString("fr-FR")} {deviseAbr}/j</span>
            </div>

            <div className="equipe-collabs">
              {profil.collaborateurs.length === 0 ? (
                <div className="equipe-collab-empty">
                  <span className="equipe-badge-unassigned">Non pourvu</span>
                </div>
              ) : (
                profil.collaborateurs.map((c: Collaborateur) => (
                  <div key={c.id} className="equipe-collab-card">
                    <div className="equipe-avatar">
                      {c.prenom?.[0]?.toUpperCase()}{c.nom?.[0]?.toUpperCase()}
                    </div>
                    <div className="equipe-collab-info">
                      <div className="equipe-collab-name">{c.prenom} {c.nom}</div>
                      {c.appellation && <div className="equipe-collab-role">{c.appellation}</div>}
                      {c.emailPro && <div className="equipe-collab-email">{c.emailPro}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EquipeTab;