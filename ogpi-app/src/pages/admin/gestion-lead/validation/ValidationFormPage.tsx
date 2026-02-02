import React, { useState } from "react";
import Button from "../../../../components/button/Button.tsx";
import {
  FaUserTie,
  FaFileAlt,
  FaCalendarAlt,
  FaFolderOpen,
  FaHashtag,
  FaTag,
  FaIndustry,
  FaBuilding,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { Lead } from "../../../../types/lead/Lead.tsx";
import "./ValidationFormPage.css";

interface ValidationFormProps {
  lead: Lead;
  onValidate?: (comment: string) => void;
  onReject?: (comment: string) => void;
  readonly?: boolean;
}

const ValidationFormPage: React.FC<ValidationFormProps> = ({
  lead,
  onValidate,
  onReject,
  readonly = false,
}) => {
  const [comment, setComment] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!lead) return null;

  return (
    <div className="validation-form-container">
      <div className="validation-card">
        {/* ===== EN-TÊTE CLIQUABLE ===== */}
        <div 
          className="validation-header clickable"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="validation-header-content">
            <h1 className="validation-title">{lead.name}</h1>
            <div className="validation-meta">
              <div className="validation-reference">
                <FaHashtag className="ref-icon" />
                <span>{lead.reference}</span>
              </div>
              <div className="validation-status-badge">
                En attente de validation
              </div>
            </div>
          </div>
          <button className="expand-toggle" type="button">
            {isExpanded ? (
              <>
                <FaChevronUp className="chevron-icon" />
                <span>Masquer</span>
              </>
            ) : (
              <>
                <FaChevronDown className="chevron-icon" />
                <span>Voir détails</span>
              </>
            )}
          </button>
        </div>

        {/* ===== CONTENU DÉVELOPPABLE ===== */}
        <div className={`validation-expandable ${isExpanded ? 'expanded' : 'collapsed'}`}>
          {/* ===== CONTENU PRINCIPAL ===== */}
          <div className="validation-content">
            {/* ===== COLONNE GAUCHE - INFORMATIONS GÉNÉRALES ===== */}
            <div className="validation-section">
              <h3 className="section-title">Informations générales</h3>
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-card-header">
                    <FaBuilding className="info-icon" />
                    <span className="info-label">Business Unit</span>
                  </div>
                  <p className="info-value">{lead.businessUnit?.name || "-"}</p>
                </div>

                <div className="info-card">
                  <div className="info-card-header">
                    <FaTag className="info-icon" />
                    <span className="info-label">Catégorie</span>
                  </div>
                  <p className="info-value">{lead.category?.label || "-"}</p>
                </div>

                <div className="info-card">
                  <div className="info-card-header">
                    <FaTag className="info-icon" />
                    <span className="info-label">Type</span>
                  </div>
                  <p className="info-value">{lead.type?.label || "-"}</p>
                </div>

                <div className="info-card">
                  <div className="info-card-header">
                    <FaIndustry className="info-icon" />
                    <span className="info-label">Secteur</span>
                  </div>
                  <p className="info-value">{lead.secteur?.label || "-"}</p>
                </div>

                <div className="info-card">
                  <div className="info-card-header">
                    <FaIndustry className="info-icon" />
                    <span className="info-label">Zone</span>
                  </div>
                  <p className="info-value">
                    {lead.zone === 0 ? "Local" : lead.zone === 1 ? "Offshore" : "-"}
                  </p>
                </div>

                <div className="info-card">
                  <div className="info-card-header">
                    <FaCalendarAlt className="info-icon" />
                    <span className="info-label">Date de soumission</span>
                  </div>
                  <p className="info-value">
                    {lead.realDeadline
                      ? new Date(lead.realDeadline).toLocaleDateString("fr-FR")
                      : "-"}
                  </p>
                </div>
              </div>

              {lead.description && (
                <div className="description-box">
                  <div className="description-header">
                    <FaFileAlt className="info-icon" />
                    <span className="info-label">Description</span>
                  </div>
                  <p className="description-text">{lead.description}</p>
                </div>
              )}
            </div>

            {/* ===== COLONNE DROITE - CONTACTS ===== */}
            <div className="validation-section">
              <h3 className="section-title">Contacts</h3>

              {/* Client */}
              <div className="contact-card">
                <div className="contact-header">
                  <FaUserTie className="contact-icon" />
                  <h4 className="contact-title">Client</h4>
                </div>
                <div className="contact-details">
                  <div className="contact-row">
                    <span className="contact-label">Nom :</span>
                    <span className="contact-value">{lead.client?.name || "-"}</span>
                  </div>
                  <div className="contact-row">
                    <span className="contact-label">Email :</span>
                    <span className="contact-value">{lead.client?.email || "-"}</span>
                  </div>
                  <div className="contact-row">
                    <span className="contact-label">Téléphone :</span>
                    <span className="contact-value">{lead.client?.phone || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Partenaires */}
              <div className="contact-card">
                <div className="contact-header">
                  <FaUserTie className="contact-icon" />
                  <h4 className="contact-title">Partenaires</h4>
                </div>
                {lead.partenaires && lead.partenaires.length > 0 ? (
                  <div className="contact-details">
                    {lead.partenaires.map((p, index) => (
                      <div key={index} className="contact-details">
                        <div className="contact-row">
                          <span className="contact-label">Nom :</span>
                          <span className="contact-value">{p.name}</span>
                        </div>
                        <div className="contact-row">
                          <span className="contact-label">Email :</span>
                          <span className="contact-value">{p.email || "-"}</span>
                        </div>
                        <div className="contact-row">
                          <span className="contact-label">Téléphone :</span>
                          <span className="contact-value">{p.phone || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">Aucun partenaire</p>
                )}
              </div>
            </div>
          </div>

          {/* ===== SECTION RESSOURCES (PLEINE LARGEUR) ===== */}
          {(lead.driveFolder || lead.driveFile) && (
            <div className="resources-section">
              <div className="resources-card">
                <h3 className="section-title">Ressources</h3>
                <div className="resources-list">
                  {lead.driveFolder && (
                    <a
                      href={lead.driveFolder.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      <FaFolderOpen className="resource-icon" />
                      <div className="resource-info">
                        <span className="resource-label">Répertoire</span>
                        <span className="resource-name">
                          {lead.driveFolder.name || "Voir dossier"}
                        </span>
                      </div>
                    </a>
                  )}
                  {lead.driveFile && (
                    <a
                      href={lead.driveFile.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      <FaFileAlt className="resource-icon" />
                      <div className="resource-info">
                        <span className="resource-label">TDR</span>
                        <span className="resource-name">
                          {lead.driveFile.name || "Voir fichier"}
                        </span>
                        {lead.driveFile.description && (
                          <span className="resource-description">
                            {lead.driveFile.description}
                          </span>
                        )}
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== SECTION COMMENTAIRE ===== */}
          <div className="validation-comment-section">
            <label className="comment-label">
              <FaFileAlt className="comment-icon" />
              Commentaires de validation
            </label>
            <textarea
              className="validation-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              disabled={readonly}
              placeholder="Ajoutez vos commentaires de validation ici..."
            />
          </div>

          {/* ===== ACTIONS ===== */}
          {!readonly ? (
            <div className="validation-actions">
              <Button
                label="No Go"
                variant="secondary"
                onClick={() => onReject?.(comment)}
              />
              <Button
                label="Go"
                variant="primary"
                onClick={() => onValidate?.(comment)}
              />
            </div>
          ) : (
            <div className="validation-readonly">
              <span>✓ Décision déjà prise</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationFormPage;