import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaCheck, FaTimes, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./TacheStatusForm.css";

export type TacheStatus = "À faire" | "En cours" | "Terminé";
export type TacheType = "LEAD" | "PROJET";

export interface Tache {
  id: number;
  titre: string;
  statut: TacheStatus;
  attribuee: boolean;
  description?: string;
  responsable?: string;
  type?: TacheType;
  linkedId?: number; 
  linkedName?: string; 
}

interface TacheStatusFormProps {
  tache: Tache;
  onUpdateStatus?: (newStatus: TacheStatus) => void;
  onToggleAttribuee?: (attribuee: boolean) => void;
  readonly?: boolean;
  userView?: boolean; 
}

const STATUS_CONFIG: Record<TacheStatus, { class: string; label: string }> = {
  "À faire": { class: "status-todo", label: "À faire" },
  "En cours": { class: "status-progress", label: "En cours" },
  "Terminé": { class: "status-done", label: "Terminé" },
};

const TacheStatusForm: React.FC<TacheStatusFormProps> = ({
  tache,
  onUpdateStatus,
  onToggleAttribuee,
  readonly = false,
  userView = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<TacheStatus>(tache.statut);
  const [attribuee, setAttribuee] = useState<boolean>(tache.attribuee);

  const handleStatusChange = (newStatus: TacheStatus) => {
    setStatus(newStatus);
    onUpdateStatus?.(newStatus);
  };

  const handleToggleAttribuee = () => {
    const newValue = !attribuee;
    setAttribuee(newValue);
    onToggleAttribuee?.(newValue);
  };

  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className={`tache-status-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div
        className="tache-status-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="tache-header-left">
          <h5 className="tache-title">{tache.titre}</h5>
          {tache.linkedName && (
            <span className="tache-linked-badge">
              {tache.type === "LEAD"} {tache.linkedName}
            </span>
          )}
        </div>

        <div className="tache-header-right">
          <div className="tache-badges">
            <span className={`tache-status-badge ${statusConfig.class}`}>
              {status}
            </span>
            {!userView && (
              <span className={`tache-attribuee-badge ${attribuee ? 'assigned' : 'unassigned'}`}>
                {attribuee ? "Attribuée" : "Non attribuée"}
              </span>
            )}
          </div>

          <button className="expand-toggle" type="button">
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="tache-status-expandable">
          <div className="tache-info-section">
            {tache.description && (
              <div className="tache-info-item">
                <strong>Description :</strong>
                <p>{tache.description}</p>
              </div>
            )}
            
            {tache.responsable && !userView && (
              <div className="tache-info-item">
                <strong>Responsable :</strong>
                <span className="tache-responsable-name">{tache.responsable}</span>
              </div>
            )}

            {tache.type && tache.linkedName && (
              <div className="tache-info-item">
                <strong>{tache.type === "LEAD" ? "Opportunité liée" : "Projet lié"} :</strong>
                <span className="tache-linked-name">{tache.linkedName}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!readonly && (
            <div className="tache-actions">
              {/* Vue utilisateur simplifiée */}
              {userView ? (
                <div className="status-buttons-compact">
                  <label className="action-label">Statut de la tâche :</label>
                  <div className="status-toggle-group">
                    {(["À faire", "En cours", "Terminé"] as TacheStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`status-toggle-btn ${s === status ? 'active' : ''} ${STATUS_CONFIG[s].class}`}
                        onClick={() => handleStatusChange(s)}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="status-buttons-group">
                    <label className="action-label">Changer le statut :</label>
                    <div className="status-buttons">
                      {(["À faire", "En cours", "Terminé"] as TacheStatus[]).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === status ? "primary" : "outline-secondary"}
                          onClick={() => handleStatusChange(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="attribution-group">
                    <label className="action-label">Attribution :</label>
                    <Button
                      size="sm"
                      variant={attribuee ? "danger" : "success"}
                      onClick={handleToggleAttribuee}
                    >
                      {attribuee ? (
                        <>
                          <FaTimes className="me-1" /> Retirer l'attribution
                        </>
                      ) : (
                        <>
                          <FaCheck className="me-1" /> Attribuer
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tâche terminée mais possibilité de refaire */}
          {readonly && status === "Terminé" && (
            <div className="tache-actions">
              <label className="action-label">Revenir à une tâche active :</label>
              <div className="status-buttons">
                {(["À faire", "En cours"] as TacheStatus[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleStatusChange(s)}
                  >
                    {STATUS_CONFIG[s].label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TacheStatusForm;
