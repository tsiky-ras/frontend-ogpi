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

const ROLE_OPTIONS = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Deputy" },
  { id: 3, label: "Manager" },
  { id: 4, label: "PMO" },
  { id: 5, label: "Collaborateur" },
  { id: 6, label: "Lead Project" },
  { id: 7, label: "Lead Commercial" },
  { id: 8, label: "DB" },
];

const FormUser: React.FC<FormUserProps> = ({
  show,
  onClose,
  onSubmit,
  collaborateurs,
}) => {
  const [mode, setMode] = useState<"manual" | "existing">("manual");
  const [selectedProfil, setSelectedProfil] = useState<Profil | null>(null);
  const [searchCollab, setSearchCollab] = useState("");

  const [form, setForm] = useState<any>({
    username: "",
    email: "",
    password: "",
    role_id: null,
    is_active: true,
    profil: null,
  });

  /* ===== Pré-remplissage depuis collaborateur ===== */
  useEffect(() => {
    if (selectedProfil) {
      setForm((prev: any) => ({
        ...prev,
        username: `${selectedProfil.prenom}.${selectedProfil.nom}`.toLowerCase(),
        email: selectedProfil.email_pro,
        profil: selectedProfil,
      }));
    }
  }, [selectedProfil]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = () => {
    if (!form.password || !form.username || !form.role_id) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }
    onSubmit(form);
    onClose();
  };

  const filteredCollaborateurs = collaborateurs.filter(
    c =>
      c.nom.toLowerCase().includes(searchCollab.toLowerCase()) ||
      c.prenom.toLowerCase().includes(searchCollab.toLowerCase())
  );

  return (
    <Modal show={show} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Créer un utilisateur</Modal.Title>

        {/* 🔥 Bouton mode */}
        <Button
          size="sm"
          variant="outline-primary"
          className="ms-auto"
          onClick={() =>
            setMode(mode === "manual" ? "existing" : "manual")
          }
        >
          {mode === "manual"
            ? "À partir d’un collaborateur existant"
            : "Création manuelle"}
        </Button>
      </Modal.Header>

      <Modal.Body>
        <Form>

          {/* ================= COLLABORATEUR EXISTANT ================= */}
          {mode === "existing" && (
            <section className="mb-4">
              <h5>Choisir un collaborateur</h5>

              <Form.Control
                className="mb-2"
                placeholder="Rechercher..."
                value={searchCollab}
                onChange={e => setSearchCollab(e.target.value)}
              />

              <div className="border rounded p-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                {filteredCollaborateurs.map(c => (
                  <div
                    key={c.profil_id}
                    className={`p-2 selectable ${
                      selectedProfil?.profil_id === c.profil_id ? "bg-light" : ""
                    }`}
                    onClick={() => setSelectedProfil(c)}
                    style={{ cursor: "pointer" }}
                  >
                    <strong>{c.prenom} {c.nom}</strong>
                    <div className="text-muted small">{c.appelation}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ================= AUTHENTIFICATION ================= */}
          <section className="fiche-section">
            <h4>Configuration d’authentification</h4>

            <Row className="g-3">
              <Col md={6}>
                <Form.Label>Username *</Form.Label>
                <Form.Control
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                />
              </Col>

              <Col md={6}>
                <Form.Label>Email</Form.Label>
                <Form.Control
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </Col>

              <Col md={6}>
                <Form.Label>Mot de passe *</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                />
              </Col>

              <Col md={6}>
                <Form.Label>Rôle *</Form.Label>
                <Form.Select
                  value={form.role_id || ""}
                  onChange={e =>
                    setForm((prev: any) => ({
                      ...prev,
                      role_id: Number(e.target.value),
                    }))
                  }
                >
                  <option value="">-- Sélectionner --</option>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={12}>
                <Form.Check
                  label="Utilisateur actif"
                  checked={form.is_active}
                  onChange={handleChange}
                  name="is_active"
                />
              </Col>
            </Row>
          </section>

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
