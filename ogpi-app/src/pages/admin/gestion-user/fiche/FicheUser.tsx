import React, { useState, useEffect } from "react";
import { Profil } from "../../../../types/profil/Profil";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useUserService } from "../../../../services/user/UserService.tsx";
import "./FicheUser.css";

interface FicheUserProps {
  userId: number; 
  onClose: () => void;
  onSave: () => void;
  isEditMode?: boolean;
  modalTitle?: string;
}

const FicheUser: React.FC<FicheUserProps> = ({
  userId,
  onClose,
  onSave,
  isEditMode = false,
  modalTitle,
}) => {
  const { getById, update } = useUserService();
  const [user, setUser] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const { resetPassword } = useUserService();

  // ----------- Fetch user complet ----------- 
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getById(userId);
        console.log("Utilisateur récupéré :", data); 
        setUser(data);
        setEditData({ ...data });
      } catch (err) {
        console.error("Erreur récupération utilisateur :", err);
      }
    };
    fetchUser();
  }, [userId]);

  if (!user) return null; 

  const handleSave = async () => {
    try {
      if (showResetPassword && newPassword) {
        await resetPassword(user.userId, newPassword);
      }
      delete editData.password;
      const updated = await update(editData);
      setUser(updated);
      onSave(updated);
      onClose();
    } catch (err) {
      console.error("Erreur mise à jour utilisateur :", err);
    }
  };

  return (
    <Modal show={true} onHide={onClose} size="lg" centered scrollable className="fiche-user-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          {modalTitle ?? (isEditMode
            ? `Modifier l'utilisateur ${user.profil?.nom} ${user.profil?.prenom}`
            : `${user.profil?.nom} ${user.profil?.prenom}`)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="fiche-profil-body">
        <div className="type-collab-badge-wrapper mb-3">
          <span className={`type-collab-badge ${user.role?.roleLabel === "COLLABORATEUR" ? "interne" : "externe"}`}>
            {user.role?.roleLabel}
          </span>
        </div>

        <section className="fiche-section mb-4">
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
                <div className="p-2 bg-light rounded">{user.username}</div>
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
                <div className="p-2 bg-light rounded">{user.email}</div>
              )}
            </Col>
            <Col md={6}>
              <Form.Label>Rôle</Form.Label>
              {isEditMode ? (
                <Form.Select
                  value={editData.role?.roleId || ""}
                  onChange={e =>
                    setEditData({ ...editData, role: { ...editData.role, roleId: Number(e.target.value) } })
                  }
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
                <div className="p-2 bg-light rounded">{user.role?.roleLabel}</div>
              )}
            </Col>
            <Col md={6}>
              <Form.Label>Statut</Form.Label>
              {isEditMode ? (
                <Form.Check
                  type="checkbox"
                  label="Utilisateur actif"
                  checked={editData.isActive}
                  onChange={e => setEditData({ ...editData, isActive: e.target.checked })}
                />
              ) : (
                <div className="p-2 bg-light rounded">
                  <span className={`badge ${user.isActive ? "bg-success" : "bg-danger"}`}>
                    {user.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
              )}
            </Col>
          </Row>
        </section>

        {user.profil && (
          <section className="fiche-section">
            <h4>Profil collaborateur</h4>
            <div className="fiche-grid">
              <div><strong>Nom :</strong> {user.profil.nom}</div>
              <div><strong>Prénom :</strong> {user.profil.prenom}</div>
              <div><strong>Genre :</strong> {user.profil.sexe === 1 ? "Homme" : "Femme"}</div>
              <div><strong>Matricule :</strong> {user.profil.matricule}</div>
              <div><strong>Appellation :</strong> {user.profil.appellation}</div>
              <div><strong>Téléphone :</strong> {user.profil.telephone}</div>
              <div><strong>Email pro :</strong> {user.profil.emailPro}</div>
              <div><strong>Email perso :</strong> {user.profil.emailPerso}</div>
            </div>
          </section>
        )}

        {isEditMode && (
          <>
            <hr className="my-4" />
            <div className="mb-3">
              <Button
                variant="outline-warning"
                onClick={() => setShowResetPassword(!showResetPassword)}
              >
                {showResetPassword ? "Annuler" : "Réinitialiser le mot de passe"}
              </Button>
            </div>
            {showResetPassword && (
              <section className="fiche-section">
                <h4>Réinitialisation mot de passe</h4>
                <Form.Control
                  type="password"
                  placeholder="Entrez le nouveau mot de passe"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </section>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
        {isEditMode && <Button variant="primary" onClick={handleSave}>Sauvegarder</Button>}
      </Modal.Footer>
    </Modal>
  );
};

export default FicheUser;
