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
} from "react-icons/fa";

/* ================= TYPES ================= */

export type LeadValidation = {
  name: string;
  reference: string;
  client?: string;
  type?: string;
  category?: string;
  secteur?: string;
  description?: string;
  internalDeadline?: string;
  realDeadline?: string;
  driveLink?: string;
};

interface ValidationFormProps {
  lead: LeadValidation;
  onValidate?: (comment: string) => void;
  onReject?: (comment: string) => void;
  readonly?: boolean;
}

/* ================= COMPONENT ================= */

const ValidationForm: React.FC<ValidationFormProps> = ({
  lead,
  onValidate,
  onReject,
  readonly = false,
}) => {
  const [comment, setComment] = useState("");

  return (
    <div className="validation-form-container">
      <div className="validation-card">
        {/* Titre */}
        <div className="validation-title-row">
          <h2 className="validation-title">{lead.name}</h2>
        </div>

        {/* Contenu */}
        <div className="validation-content">
          {/* Colonne gauche */}
          <div className="validation-left">
            <div className="validation-infos">
              {/* Référence */}
              <div className="validation-item">
                <FaHashtag className="validation-icon" />
                <span>
                  <b>Référence</b> : {lead.reference}
                </span>
              </div>

              {/* Type */}
              {lead.type && (
                <div className="validation-item">
                  <FaTag className="validation-icon" />
                  <span>
                    <b>Type</b> : {lead.type}
                  </span>
                </div>
              )}

              {/* Catégorie */}
              {lead.category && (
                <div className="validation-item">
                  <FaTag className="validation-icon" />
                  <span>
                    <b>Catégorie</b> : {lead.category}
                  </span>
                </div>
              )}

              {/* Secteur */}
              {lead.secteur && (
                <div className="validation-item">
                  <FaIndustry className="validation-icon" />
                  <span>
                    <b>Secteur</b> : {lead.secteur}
                  </span>
                </div>
              )}

              {/* Deadlines */}
              {lead.internalDeadline && (
                <div className="validation-item">
                  <FaCalendarAlt className="validation-icon" />
                  <span>
                    <b>Deadline interne</b> :{" "}
                    {new Date(lead.internalDeadline).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}

              {lead.realDeadline && (
                <div className="validation-item">
                  <FaCalendarAlt className="validation-icon" />
                  <span>
                    <b>Date de soumission</b> :{" "}
                    {new Date(lead.realDeadline).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}

              {/* Client */}
              {lead.client && (
                <div className="validation-item">
                  <FaUserTie className="validation-icon" />
                  <span>
                    <b>Client</b> : {lead.client}
                  </span>
                </div>
              )}

              {/* Description */}
              {lead.description && (
                <div className="validation-item">
                  <FaFileAlt className="validation-icon" />
                  <span>
                    <b>Description</b> : {lead.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite */}
          <div className="validation-right">
            {lead.driveLink && (
              <div className="validation-item">
                <FaFolderOpen className="validation-icon" />
                <a
                  href={lead.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="validation-link"
                >
                  Accéder au dossier Drive
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commentaire */}
      <div className="validation-comment-row">
        <label htmlFor="validation-comment">
          Commentaires de validation :
        </label>
        <textarea
          id="validation-comment"
          className="validation-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          disabled={readonly}
        />
      </div>

      {/* Actions */}
      {!readonly && (
        <div className="validation-actions">
          <Button
            label="Go"
            variant="primary"
            onClick={() => onValidate?.(comment)}
          />
          <Button
            label="No Go"
            variant="secondary"
            onClick={() => onReject?.(comment)}
          />
        </div>
      )}

      {readonly && (
        <div className="text-end text-muted">
          Décision déjà prise
        </div>
      )}
    </div>
  );
};

export default ValidationForm;
