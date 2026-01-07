import React, { useState } from "react";
import { Profil } from "../../../../types/profil/Profil";
import { Form, Row, Col } from "react-bootstrap";
import "./FicheUser.css";

interface FicheUserProps {
  user: any; // données utilisateur (id, nom, prenom, email, role, is_active)
  profil?: Profil; // données détaillées du collaborateur si dispo
  onClose: () => void;
  onSave: (updatedUser: any) => void;
  isEditMode?: boolean; // true = mode édition (infos utilisateur + password), false = lecture seule
}

const FicheUser: React.FC<FicheUserProps> = ({ user, profil, onClose, onSave, isEditMode = false }) => {
  const [editData, setEditData] = useState({ ...user });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleSave = () => {
    if (showResetPassword && newPassword) {
      editData.password = newPassword;
    }
    onSave(editData);
  };

  return (
    <div className="fiche-profil-body">
      {/* Sticker de type collaborateur */}
      <div className="type-collab-badge-wrapper">
        <span className={`type-collab-badge ${user.role_label === "Collaborateur" ? "interne" : "externe"}`}>
          {user.role_label}
        </span>
      </div>

      {/* Header avec titre et bouton fermer */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Modifier l'utilisateur {editData.nom} {editData.prenom}</h3>
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Fermer"
        />
      </div>

      {/* Section Infos Utilisateur */}
      <div className="fiche-section">
        <h4>Informations utilisateur</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Nom d'utilisateur</Form.Label>
            {isEditMode ? (
              <Form.Control
                value={editData.username}
                onChange={e => setEditData({ ...editData, username: e.target.value })}
              />
            ) : (
              <div className="p-2 bg-light rounded">{editData.username}</div>
            )}
          </Col>
          <Col md={6}>
            <Form.Label>Email</Form.Label>
            {isEditMode ? (
              <Form.Control
                type="email"
                value={editData.email}
                onChange={e => setEditData({ ...editData, email: e.target.value })}
              />
            ) : (
              <div className="p-2 bg-light rounded">{editData.email}</div>
            )}
          </Col>
          <Col md={6}>
            <Form.Label>Rôle</Form.Label>
            {isEditMode ? (
              <Form.Select
                value={editData.role_id || ""}
                onChange={e => setEditData({ ...editData, role_id: Number(e.target.value) })}
              >
                <option value="">-- Sélectionner --</option>
                <option value="1">Admin</option>
                <option value="2">Deputy</option>
                <option value="3">Manager</option>
                <option value="4">PMO</option>
                <option value="5">Collaborateur</option>
                <option value="6">Lead Project</option>
                <option value="7">Lead Commercial</option>
                <option value="8">DB</option>
              </Form.Select>
            ) : (
              <div className="p-2 bg-light rounded">{editData.role_label}</div>
            )}
          </Col>
          <Col md={6}>
            <Form.Label>Statut</Form.Label>
            {isEditMode ? (
              <Form.Check
                type="checkbox"
                label="Utilisateur actif"
                checked={editData.is_active}
                onChange={e => setEditData({ ...editData, is_active: e.target.checked })}
              />
            ) : (
              <div className="p-2 bg-light rounded">
                <span className={`badge ${editData.is_active ? "bg-success" : "bg-danger"}`}>
                  {editData.is_active ? "Actif" : "Inactif"}
                </span>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {/* Section Infos personnelles - LECTURE SEULE */}
      <div className="fiche-section">
        <h4>Informations personnelles</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Nom</Form.Label>
            <div className="p-2 bg-light rounded">{editData.nom}</div>
          </Col>
          <Col md={6}>
            <Form.Label>Prénom</Form.Label>
            <div className="p-2 bg-light rounded">{editData.prenom}</div>
          </Col>
        </Row>
      </div>

      {/* Section Collaborateur détaillé si profil dispo - LECTURE SEULE */}
      {profil && (
        <div className="fiche-section">
          <h4>Profil collaborateur</h4>
          <div className="fiche-grid">
            <div><strong>Matricule :</strong> {profil.matricule}</div>
            <div><strong>Appellation :</strong> {profil.appelation}</div>
            <div><strong>Téléphone :</strong> {profil.telephone}</div>
            <div><strong>Email pro :</strong> {profil.email_pro}</div>
            <div><strong>Email perso :</strong> {profil.email_perso}</div>
            <div><strong>Date embauche :</strong> {profil.date_embauche}</div>
            <div><strong>Type de contrat :</strong> {profil.type_contrat}</div>
            <div><strong>Expérience avant :</strong> {profil.experience_avant} ans</div>
          </div>
        </div>
      )}

      {/* Bouton réinitialiser mot de passe - UNIQUEMENT EN MODE ÉDITION */}
      {isEditMode && (
        <>
          <hr className="my-4" />
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-outline-warning"
              onClick={() => setShowResetPassword(!showResetPassword)}
            >
              {showResetPassword ? "Annuler" : "Réinitialiser le mot de passe"}
            </button>
          </div>

          {showResetPassword && (
            <div className="fiche-section">
              <h4>Réinitialisation mot de passe</h4>
              <Form.Control
                type="password"
                placeholder="Entrez le nouveau mot de passe"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {/* Footer avec actions */}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-secondary" onClick={onClose}>{isEditMode ? "Annuler" : "Fermer"}</button>
        {isEditMode && <button className="btn btn-primary" onClick={handleSave}>Sauvegarder</button>}
      </div>
    </div>
  );
};

export default FicheUser;
