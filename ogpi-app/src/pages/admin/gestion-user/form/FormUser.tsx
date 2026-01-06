import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { User } from "../../../../types/user/User.tsx";
import { Profil } from "../../../../types/profil/Profil.tsx";
import "./FormUser.css";

type FormUserProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (user: User) => void;
  collaborateurs: Profil[]; // Liste des collaborateurs existants
};

const FormUser: React.FC<FormUserProps> = ({ show, onClose, onSubmit, collaborateurs }) => {
  const [isExistingCollab, setIsExistingCollab] = useState(true);
  const [selectedProfil, setSelectedProfil] = useState<Profil | null>(null);
  const [searchCollab, setSearchCollab] = useState("");

  const [userForm, setUserForm] = useState<any>({
    username: "",
    email: "",
    password: "",
    is_active: true,
    roles: [] as { id_role: number; label: string }[],
    profil: null as Profil | null,
  });

  // Met à jour le formulaire si un profil est sélectionné
  useEffect(() => {
    if (selectedProfil) {
      setUserForm((prev: any) => ({
        ...prev,
        username: `${selectedProfil.prenom}.${selectedProfil.nom}`.toLowerCase(),
        email: selectedProfil.email_pro,
        profil: selectedProfil,
      }));
    } else if (!isExistingCollab) {
      setUserForm((prev: any) => ({ ...prev, username: "", email: "", profil: null }));
    }
  }, [selectedProfil, isExistingCollab]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;
    setUserForm((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = () => {
    if (!userForm.profil && !isExistingCollab) {
      alert("Vous devez créer un collaborateur avant de créer l'utilisateur !");
      return;
    }
    onSubmit(userForm as User);
    onClose();
    setSelectedProfil(null);
    setIsExistingCollab(true);
    setSearchCollab("");
    setUserForm({
      username: "",
      email: "",
      password: "",
      is_active: true,
      roles: [],
      profil: null,
    });
  };

  // Filtrer collaborateurs selon la recherche
  const filteredCollaborateurs = collaborateurs.filter(
    p =>
      p.nom.toLowerCase().includes(searchCollab.toLowerCase()) ||
      p.prenom.toLowerCase().includes(searchCollab.toLowerCase())
  );

  return (
    <Modal show={show} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Créer un utilisateur</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          {/* ===== Choix mode ===== */}
          <Form.Group className="mb-3">
            <Form.Check
              type="radio"
              id="existingCollab"
              label="Créer un utilisateur depuis un collaborateur existant"
              checked={isExistingCollab}
              onChange={() => setIsExistingCollab(true)}
            />
            <Form.Check
              type="radio"
              id="newCollab"
              label="Créer un nouveau collaborateur et utilisateur"
              checked={!isExistingCollab}
              onChange={() => setIsExistingCollab(false)}
            />
          </Form.Group>

          {/* ===== Collaborateur existant ===== */}
          {isExistingCollab && (
            <Form.Group className="mb-3">
              <Form.Label>Recherche collaborateur</Form.Label>
              <Form.Control
                type="text"
                placeholder="Rechercher un collaborateur..."
                value={searchCollab}
                onChange={e => setSearchCollab(e.target.value)}
              />

              <Form.Select
                className="mt-2"
                value={selectedProfil?.profil_id || ""}
                onChange={e =>
                  setSelectedProfil(
                    collaborateurs.find(p => p.profil_id === Number(e.target.value)) || null
                  )
                }
              >
                <option value="">-- Sélectionner --</option>
                {filteredCollaborateurs.map(p => (
                  <option key={p.profil_id} value={p.profil_id}>
                    {p.prenom} {p.nom} ({p.appelation})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          {/* ===== Nouveau collaborateur ===== */}
          {!isExistingCollab && (
            <>
              <h5>Créer un collaborateur</h5>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Label>Nom</Form.Label>
                  <Form.Control
                    name="nom"
                    value={userForm.profil?.nom || ""}
                    onChange={e =>
                      setUserForm(prev => ({
                        ...prev,
                        profil: { ...prev.profil, nom: e.target.value },
                      }))
                    }
                  />
                </Col>
                <Col md={6}>
                  <Form.Label>Prénom</Form.Label>
                  <Form.Control
                    name="prenom"
                    value={userForm.profil?.prenom || ""}
                    onChange={e =>
                      setUserForm(prev => ({
                        ...prev,
                        profil: { ...prev.profil, prenom: e.target.value },
                      }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <Form.Label>Email professionnel</Form.Label>
                  <Form.Control
                    name="email_pro"
                    value={userForm.profil?.email_pro || ""}
                    onChange={e =>
                      setUserForm(prev => ({
                        ...prev,
                        profil: { ...prev.profil, email_pro: e.target.value },
                      }))
                    }
                  />
                </Col>
              </Row>
            </>
          )}

          {/* ===== User info ===== */}
          <h5 className="mt-3">Informations utilisateur</h5>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Nom d'utilisateur</Form.Label>
              <Form.Control
                name="username"
                value={userForm.username}
                onChange={handleChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                value={userForm.email}
                onChange={handleChange}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Mot de passe</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={userForm.password}
                onChange={handleChange}
              />
            </Col>
            <Col md={6} className="d-flex align-items-center mt-4">
              <Form.Check
                type="checkbox"
                label="Actif"
                name="is_active"
                checked={userForm.is_active}
                onChange={handleChange}
              />
            </Col>
          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit}>Créer</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FormUser;
