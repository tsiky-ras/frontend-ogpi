import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { User } from "../../../../types/user/User.tsx";
import { Profil } from "../../../../types/profil/Profil.tsx";
import "./FormUser.css";

type FormUserProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (user: User) => void;
  collaborateurs: Profil[];
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

const BU_OPTIONS = [
  "Marché public",
  "Good",
  "IA",
  "Juridique",
  "RH",
  "Finance",
  "IT",
];

const FormUser: React.FC<FormUserProps> = ({ show, onClose, onSubmit, collaborateurs }) => {
  const [mode, setMode] = useState<"manual" | "existing">("manual");
  const [selectedProfil, setSelectedProfil] = useState<Profil | null>(null);
  const [searchCollab, setSearchCollab] = useState("");

  const [form, setForm] = useState<any>({
    username: "",
    email: "",
    password: "",
    role_id: null,
    is_active: true,
    matricule: "",
    nom: "",
    prenom: "",
    appelation: "",
    sexe: "",
    date_naissance: "",
    poste: "",
    type_profil: 1,
    bu: "",
    type_contrat: 1,
    date_embauche: "",
    date_integration: "",
    date_debauche: "",
    etudes: [],
    certifications: [],
    profil: null,
  });

  // Pré-remplissage si collaborateur sélectionné
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
    if (!form.username || !form.password || !form.role_id) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }
    onSubmit(form);
    onClose();
    setSelectedProfil(null);
    setForm({
      username: "",
      email: "",
      password: "",
      role_id: null,
      is_active: true,
      matricule: "",
      nom: "",
      prenom: "",
      appelation: "",
      sexe: "",
      date_naissance: "",
      poste: "",
      type_profil: 1,
      bu: "",
      type_contrat: 1,
      date_embauche: "",
      date_integration: "",
      date_debauche: "",
      etudes: [],
      certifications: [],
      profil: null,
    });
  };

  const filteredCollaborateurs = collaborateurs.filter(
    (c) =>
      c.nom.toLowerCase().includes(searchCollab.toLowerCase()) ||
      c.prenom.toLowerCase().includes(searchCollab.toLowerCase())
  );

  /* ===== Fonctions diplômes ===== */
  const addDiplome = () => {
    setForm((prev: any) => ({
      ...prev,
      etudes: [...prev.etudes, { diplome: "", etablissement: "", obtention: "", file: null }],
    }));
  };
  const updateDiplome = (i: number, key: string, value: any) => {
    const updated = [...form.etudes];
    updated[i][key] = value;
    setForm({ ...form, etudes: updated });
  };
  const removeDiplome = (i: number) => {
    setForm({ ...form, etudes: form.etudes.filter((_: any, idx: number) => idx !== i) });
  };

  /* ===== Fonctions certifications ===== */
  const addCertification = () => {
    setForm((prev: any) => ({
      ...prev,
      certifications: [...prev.certifications, { label: "", organisme: "", score: "", badge: "" }],
    }));
  };
  const updateCertification = (i: number, key: string, value: any) => {
    const updated = [...form.certifications];
    updated[i][key] = value;
    setForm({ ...form, certifications: updated });
  };
  const removeCertification = (i: number) => {
    setForm({ ...form, certifications: form.certifications.filter((_: any, idx: number) => idx !== i) });
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Créer un utilisateur</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ===== Choix du mode ===== */}
        <div className="d-flex mb-3 gap-2">
          <Button
            size="sm"
            variant={mode === "existing" ? "primary" : "outline-primary"}
            onClick={() => setMode("existing")}
          >
            À partir d’un collaborateur existant
          </Button>
          <Button
            size="sm"
            variant={mode === "manual" ? "primary" : "outline-primary"}
            onClick={() => setMode("manual")}
          >
            Saisie manuelle
          </Button>
        </div>

        <Form>
          {/* ================= MODE EXISTING ================= */}
          {mode === "existing" && (
            <div>
              <section className="mb-4">
                <h5>Choisir un collaborateur</h5>
                <Form.Control
                  className="mb-2"
                  placeholder="Rechercher..."
                  value={searchCollab}
                  onChange={(e) => setSearchCollab(e.target.value)}
                />
                {searchCollab && (
                  <div className="border rounded p-2" style={{ maxHeight: 220, overflowY: "auto" }}>
                    {filteredCollaborateurs.length > 0 ? (
                      filteredCollaborateurs.map((c) => (
                        <div
                          key={c.profil_id}
                          className={`p-2 selectable ${selectedProfil?.profil_id === c.profil_id ? "bg-light" : ""}`}
                          onClick={() => setSelectedProfil(c)}
                          style={{ cursor: "pointer" }}
                        >
                          <strong>{c.prenom} {c.nom}</strong>
                          <div className="text-muted small">{c.appelation}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-muted">Aucun collaborateur trouvé</div>
                    )}
                  </div>
                )}
              </section>

              {selectedProfil && (
                <section className="fiche-section">
                  <h4>Informations du collaborateur</h4>
                  <Row className="g-3">
                    <Col md={6}><Form.Label>Nom</Form.Label><div className="p-2 bg-light rounded">{selectedProfil.nom}</div></Col>
                    <Col md={6}><Form.Label>Prénom</Form.Label><div className="p-2 bg-light rounded">{selectedProfil.prenom}</div></Col>
                    <Col md={6}><Form.Label>Appellation</Form.Label><div className="p-2 bg-light rounded">{selectedProfil.appelation}</div></Col>
                    <Col md={6}><Form.Label>Matricule</Form.Label><div className="p-2 bg-light rounded">{selectedProfil.matricule}</div></Col>
                    <Col md={6}><Form.Label>Email professionnel</Form.Label><div className="p-2 bg-light rounded">{selectedProfil.email_pro}</div></Col>
                    <Col md={6}><Form.Label>Téléphone</Form.Label><div className="p-2 bg-light rounded">{selectedProfil.telephone}</div></Col>
                  </Row>
                </section>
              )}
            </div>
          )}

          {/* ================= MODE MANUAL ================= */}
          {mode === "manual" && (
            <div>
              <h5>Saisie Manuelle</h5>
              {/* Identité */}
              <section className="fiche-section">
                <h4>1. Identité professionnelle</h4>
                <Row className="g-3">
                  <Col md={4}><Form.Label>Matricule</Form.Label><Form.Control name="matricule" value={form.matricule} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Nom</Form.Label><Form.Control name="nom" value={form.nom} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Prénom</Form.Label><Form.Control name="prenom" value={form.prenom} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Appellation</Form.Label><Form.Control name="appelation" value={form.appelation} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Sexe</Form.Label>
                    <Form.Select name="sexe" value={form.sexe} onChange={handleChange}>
                      <option value="">Sexe</option>
                      <option value="1">Masculin</option>
                      <option value="2">Féminin</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}><Form.Label>Date de naissance</Form.Label><Form.Control type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange} /></Col>
                </Row>
              </section>

              {/* Organisation */}
              <section className="fiche-section">
                <h4>2. Organisation</h4>
                <Row className="g-3">
                  <Col md={4}><Form.Label>Poste actuel</Form.Label><Form.Control name="poste" value={form.poste} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Type de collaborateur</Form.Label>
                    <Form.Select name="type_profil" value={form.type_profil} onChange={handleChange}>
                      <option value={1}>Collaborateur interne</option>
                      <option value={2}>Collaborateur externe</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}><Form.Label>Business Unit</Form.Label>
                    <Form.Select name="bu" value={form.bu} onChange={handleChange}>
                      {BU_OPTIONS.map(bu => <option key={bu} value={bu}>{bu}</option>)}
                    </Form.Select>
                  </Col>
                </Row>
              </section>

              {/* Contrat & Dates */}
              <section className="fiche-section">
                <h4>3. Contrat & Dates</h4>
                <Row className="g-3">
                  <Col md={4}><Form.Label>Type de contrat</Form.Label>
                    <Form.Select name="type_contrat" value={form.type_contrat} onChange={handleChange}>
                      <option value={1}>CDI</option>
                      <option value={2}>CDD</option>
                      <option value={3}>Stage</option>
                    </Form.Select>
                  </Col>
                  <Col md={4}><Form.Label>Date embauche</Form.Label><Form.Control type="date" name="date_embauche" value={form.date_embauche} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Date intégration</Form.Label><Form.Control type="date" name="date_integration" value={form.date_integration} onChange={handleChange} /></Col>
                  <Col md={4}><Form.Label>Date de départ</Form.Label><Form.Control type="date" name="date_debauche" value={form.date_debauche} onChange={handleChange} /></Col>
                </Row>
              </section>

              {/* Diplômes */}
              <section className="fiche-section">
                <h4>4. Diplômes</h4>
                {form.etudes.map((d: any, i: number) => (
                  <Row className="g-3 mb-2 align-items-end" key={i}>
                    <Col md={3}><Form.Label>Diplôme</Form.Label><Form.Control placeholder="Diplôme" value={d.diplome || ""} onChange={e => updateDiplome(i, "diplome", e.target.value)} /></Col>
                    <Col md={3}><Form.Label>Établissement</Form.Label><Form.Control placeholder="Établissement" value={d.etablissement || ""} onChange={e => updateDiplome(i, "etablissement", e.target.value)} /></Col>
                    <Col md={2}><Form.Label>Obtention</Form.Label><Form.Control type="date" value={d.obtention || ""} onChange={e => updateDiplome(i, "obtention", e.target.value)} /></Col>
                    <Col md={2}><Form.Label>Fichier PDF</Form.Label><Form.Control type="file" accept="application/pdf" onChange={e => updateDiplome(i, "file", e.target.files?.[0])} /></Col>
                    <Col md={1}><Button type="button" variant="outline-danger" size="sm" onClick={() => removeDiplome(i)}>-</Button></Col>
                  </Row>
                ))}
                <Button type="button" size="sm" variant="outline-primary" onClick={addDiplome}>+ Ajouter un diplôme</Button>
              </section>

              {/* Certifications */}
              <section className="fiche-section">
                <h4>5. Certifications</h4>
                {form.certifications.map((c: any, i: number) => (
                  <Row className="g-3 mb-2 align-items-end" key={i}>
                    <Col md={3}><Form.Label>Nom</Form.Label><Form.Control placeholder="Nom" value={c.label || ""} onChange={e => updateCertification(i, "label", e.target.value)} /></Col>
                    <Col md={3}><Form.Label>Organisme</Form.Label><Form.Control placeholder="Organisme" value={c.organisme || ""} onChange={e => updateCertification(i, "organisme", e.target.value)} /></Col>
                    <Col md={2}><Form.Label>Score</Form.Label><Form.Control type="number" placeholder="Score" value={c.score || ""} onChange={e => updateCertification(i, "score", e.target.value)} /></Col>
                    <Col md={3}><Form.Label>Badge (URL)</Form.Label><Form.Control placeholder="Badge (URL)" value={c.badge || ""} onChange={e => updateCertification(i, "badge", e.target.value)} /></Col>
                    <Col md={1}><Button type="button" variant="outline-danger" size="sm" onClick={() => removeCertification(i)}>-</Button></Col>
                  </Row>
                ))}
                <Button type="button" size="sm" variant="outline-primary" onClick={addCertification}>+ Ajouter une certification</Button>
              </section>
            </div>
          )}

          {/* ================= FORMULAIRE AUTHENTIFICATION COMMUN ================= */}
          <section className="fiche-section">
            <h4>6. Configuration d’authentification</h4>
            <Row className="g-3">
              <Col md={6}><Form.Label>Username *</Form.Label><Form.Control name="username" value={form.username} onChange={handleChange} disabled={mode === "existing"} /></Col>
              <Col md={6}><Form.Label>Email</Form.Label><Form.Control name="email" value={form.email} onChange={handleChange} disabled={mode === "existing"} /></Col>
              <Col md={6}><Form.Label>Mot de passe *</Form.Label><Form.Control type="password" name="password" value={form.password} onChange={handleChange} /></Col>
              <Col md={6}><Form.Label>Rôle *</Form.Label>
                <Form.Select value={form.role_id || ""} onChange={e => setForm((prev: any) => ({ ...prev, role_id: Number(e.target.value) }))}>
                  <option value="">-- Sélectionner --</option>
                  {ROLE_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </Form.Select>
              </Col>
              <Col md={12}><Form.Check label="Utilisateur actif" checked={form.is_active} onChange={handleChange} name="is_active" /></Col>
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
