import React, { useState, useMemo } from "react";
import { FaCheckCircle, FaClock, FaHourglassHalf } from "react-icons/fa";
import TacheStatusForm, { Tache, TacheStatus } from "../status/TacheStatusForm.tsx";
import StatCard from "../../../../components/stat/StatCard.tsx";
import "./MesTaches.css";
import { mockUsers, mockLeads, mockProjets } from "./mockData";
type Props = {
  currentUser?: string;
};

const MesTaches: React.FC<Props> = ({ currentUser = "Tsiky" }) => {
  const [taches, setTaches] = useState<Tache[]>([
    {
      id: 1,
      titre: "Préparer devis",
      statut: "En cours",
      attribuee: true,
      description: "Préparer le devis pour le client ABC",
      responsable: "Tsiky",
      type: "LEAD",
      linkedId: 5,
      linkedName: "Opportunité ABC Corp",
    },
    {
      id: 2,
      titre: "Validation budget",
      statut: "À faire",
      attribuee: true,
      description: "Validation du budget avec finance",
      responsable: "Tsiky",
      type: "PROJET",
      linkedId: 12,
      linkedName: "Projet Digital XYZ",
    },
    {
      id: 3,
      titre: "Rédiger compte-rendu",
      statut: "Terminé",
      attribuee: true,
      description: "Compte-rendu de la réunion client",
      responsable: "Tsiky",
      type: "LEAD",
      linkedId: 7,
      linkedName: "Lead Solution Tech",
    },
  ]);

  const mesTachesFiltered = useMemo(() => {
    return taches.filter(
      (t) => t.attribuee && t.responsable === currentUser
    );
  }, [taches, currentUser]);

  const stats = useMemo(() => {
    const total = mesTachesFiltered.length;
    const aFaire = mesTachesFiltered.filter((t) => t.statut === "À faire").length;
    const enCours = mesTachesFiltered.filter((t) => t.statut === "En cours").length;
    const terminees = mesTachesFiltered.filter((t) => t.statut === "Terminé").length;

    return { total, aFaire, enCours, terminees };
  }, [mesTachesFiltered]);

  const tachesGroupees = useMemo(() => {
    return {
      aFaire: mesTachesFiltered.filter((t) => t.statut === "À faire"),
      enCours: mesTachesFiltered.filter((t) => t.statut === "En cours"),
      terminees: mesTachesFiltered.filter((t) => t.statut === "Terminé"),
    };
  }, [mesTachesFiltered]);

  const handleUpdateStatus = (id: number, newStatus: TacheStatus) => {
    setTaches((prev) =>
      prev.map((t) => (t.id === id ? { ...t, statut: newStatus } : t))
    );
  };

  const handleToggleAttribuee = (id: number, attribuee: boolean) => {
    setTaches((prev) =>
      prev.map((t) => (t.id === id ? { ...t, attribuee } : t))
    );
  };

  return (
    <div className="mes-taches-wrapper">
      <div className="mes-taches-header">
        <div className="header-title">
          <h4>Mes Tâches</h4>
          <p className="header-subtitle">
            Bonjour <strong>{currentUser}</strong>, vous avez{" "}
            <strong>{stats.total}</strong> tâche{stats.total > 1 ? "s" : ""} attribuée
            {stats.total > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mes-taches-stats">
        <StatCard
          title="À faire"
          value={stats.aFaire}
          subtitle="Tâches en attente"
          variant={["dim", "linen"]}
          icon={<FaClock />}
        />

        <StatCard
          title="En cours"
          value={stats.enCours}
          subtitle="Tâches actives"
          variant={["tuscan", "linen"]}
          icon={<FaHourglassHalf />}
        />

        <StatCard
          title="Terminées"
          value={stats.terminees}
          subtitle="Tâches complétées"
          variant={["#2ECC71", "linen"]}
          icon={<FaCheckCircle />}
        />
      </div>

      {mesTachesFiltered.length === 0 ? (
        <div className="mes-taches-empty">
          <div className="empty-icon">✓</div>
          <p>Aucune tâche attribuée pour le moment</p>
          <span className="empty-subtitle">Profitez de votre temps libre !</span>
        </div>
      ) : (
        <div className="mes-taches-content">
          {tachesGroupees.aFaire.length > 0 && (
            <div className="taches-section">
              <div className="section-header section-todo">
                <FaClock className="section-icon" />
                <h5>À faire ({tachesGroupees.aFaire.length})</h5>
              </div>
              <div className="taches-list">
                {tachesGroupees.aFaire.map((t) => (
                  <TacheStatusForm
                    key={t.id}
                    tache={t}
                    onUpdateStatus={(status) => handleUpdateStatus(t.id, status)}
                    onToggleAttribuee={(attribuee) =>
                      handleToggleAttribuee(t.id, attribuee)
                    }
                    userView={true}
                  />
                ))}
              </div>
            </div>
          )}

          {tachesGroupees.enCours.length > 0 && (
            <div className="taches-section">
              <div className="section-header section-progress">
                <FaHourglassHalf className="section-icon" />
                <h5>En cours ({tachesGroupees.enCours.length})</h5>
              </div>
              <div className="taches-list">
                {tachesGroupees.enCours.map((t) => (
                  <TacheStatusForm
                    key={t.id}
                    tache={t}
                    onUpdateStatus={(status) => handleUpdateStatus(t.id, status)}
                    onToggleAttribuee={(attribuee) =>
                      handleToggleAttribuee(t.id, attribuee)
                    }
                    userView={true}
                  />
                ))}
              </div>
            </div>
          )}

          {tachesGroupees.terminees.length > 0 && (
            <div className="taches-section">
              <div className="section-header section-done">
                <FaCheckCircle className="section-icon" />
                <h5>Terminées ({tachesGroupees.terminees.length})</h5>
              </div>
              <div className="taches-list">
                {tachesGroupees.terminees.map((t) => (
                  <TacheStatusForm
                    key={t.id}
                    tache={t}
                    onUpdateStatus={(status) => handleUpdateStatus(t.id, status)}
                    onToggleAttribuee={(attribuee) =>
                      handleToggleAttribuee(t.id, attribuee)
                    }
                    readonly
                    userView={true}
                  />
                  
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MesTaches;