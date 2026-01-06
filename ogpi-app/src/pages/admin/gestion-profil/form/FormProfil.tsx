import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { Profil } from "../../../../types/profil/Profil";
import "./FormProfil.css";

type FormProfilProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  profil?: Profil | null;
};

const BU_OPTIONS = [
  "Marché public",
  "Good",
  "IA",
  "Juridique",
  "RH",
  "Finance",
  "IT",
];

const FormProfil: React.FC<FormProfilProps> = ({
  show,
  onClose,
  onSubmit,
  profil,
}) => {
  const [form, setForm] = useState<any>({
    type_profil: 1,
    type_contrat: 1,

    matricule: "",
    nom: "",
    prenom: "",
    appelation: "",
    sexe: "",
    date_naissance: "",

    email_pro: "",
    email_perso: "",
    telephone: "",
    experience_avant: "",

    poste: "",
    bu: "",

    date_embauche: "",
    date_integration: "",
    date_debauche: "",

    etudes: [],
    certifications: [],
  });

  /* ===== MODE ÉDITION ===== */
  useEffect(() => {
    if (profil) {
      setForm({
        ...form,
        ...profil,
        poste: profil.postes?.[0]?.poste?.label ?? "",
        bu: profil.postes?.[0]?.bu?.name ?? "",
      });
    }
    // eslint-disable-next-line
  }, [profil]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  /* ===== Diplômes ===== */
  const addDiplome = () => {
    setForm({
      ...form,
      etudes: [
        ...form.etudes,
        { diplome: "", etablissement: "", obtention: "", file: null },
      ],
    });
  };
  const updateDiplome = (i: number, key: string, value: any) => {
    const updated = [...form.etudes];
    updated[i][key] = value;
    setForm({ ...form, etudes: updated });
  };
  const removeDiplome = (i: number) => {
    setForm({
      ...form,
      etudes: form.etudes.filter((_: any, index: number) => index !== i),
    });
  };

  /* ===== Certifications ===== */
  const addCertification = () => {
    setForm({
      ...form,
      certifications: [
        ...form.certifications,
        { label: "", organisme: "", score: "", badge: "" },
      ],
    });
  };
  const updateCertification = (i: number, key: string, value: any) => {
    const updated = [...form.certifications];
    updated[i][key] = value;
    setForm({ ...form, certifications: updated });
  };
  const removeCertification = (i: number) => {
    setForm({
      ...form,
      certifications: form.certifications.filter((_: any, index: number) => index !== i),
    });
  };

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {profil ? "Modifier collaborateur" : "Ajouter collaborateur"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="fiche-profil-body">

        {/* ===== Identité ===== */}
        <section className="fiche-section">
          <h4>1. Identité professionnelle</h4>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Matricule</Form.Label>
              <Form.Control name="matricule" value={form.matricule} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Nom</Form.Label>
              <Form.Control name="nom" value={form.nom} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Prénom</Form.Label>
              <Form.Control name="prenom" value={form.prenom} onChange={handleChange} />
            </Col>

            <Col md={4}>
              <Form.Label>Appellation</Form.Label>
              <Form.Control name="appelation" value={form.appelation} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Sexe</Form.Label>
              <Form.Select name="sexe" value={form.sexe} onChange={handleChange}>
                <option value="">Sexe</option>
                <option value="1">Masculin</option>
                <option value="2">Féminin</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Date de naissance</Form.Label>
              <Form.Control type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange} />
            </Col>
          </Row>
        </section>

        {/* ===== Organisation ===== */}
        <section className="fiche-section">
          <h4>2. Organisation</h4>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Poste actuel</Form.Label>
              <Form.Control name="poste" value={form.poste} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Type de collaborateur</Form.Label>
              <Form.Select name="type_profil" value={form.type_profil} onChange={handleChange}>
                <option value={1}>Collaborateur interne</option>
                <option value={2}>Collaborateur externe</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Business Unit</Form.Label>
              <Form.Select name="bu" value={form.bu} onChange={handleChange}>
                <option value="">Business Unit</option>
                {BU_OPTIONS.map(bu => (
                  <option key={bu} value={bu}>{bu}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </section>

        {/* ===== Contrat ===== */}
        <section className="fiche-section">
          <h4>3. Contrat & Dates</h4>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Type de contrat</Form.Label>
              <Form.Select name="type_contrat" value={form.type_contrat} onChange={handleChange}>
                <option value={1}>CDI</option>
                <option value={2}>CDD</option>
                <option value={3}>Stage</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Date embauche</Form.Label>
              <Form.Control type="date" name="date_embauche" value={form.date_embauche} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Date intégration</Form.Label>
              <Form.Control type="date" name="date_integration" value={form.date_integration} onChange={handleChange} />
            </Col>
            <Col md={4}>
              <Form.Label>Date de départ</Form.Label>
              <Form.Control type="date" name="date_debauche" value={form.date_debauche} onChange={handleChange} />
            </Col>
          </Row>
        </section>

        {/* ===== Diplômes ===== */}
        <section className="fiche-section">
        <h4>4. Diplômes</h4>
        {form.etudes.map((d: any, i: number) => (
            <Row className="g-3 mb-2 align-items-end" key={i}>
            <Col md={3}>
                <Form.Label>Diplôme</Form.Label>
                <Form.Control
                placeholder="Diplôme"
                value={d.diplome?.label || d.diplome || ""} 
                onChange={e => updateDiplome(i, "diplome", e.target.value)}
                />
            </Col>
            <Col md={3}>
                <Form.Label>Établissement</Form.Label>
                <Form.Control
                placeholder="Établissement"
                value={d.etablissement?.label || d.etablissement || ""}
                onChange={e => updateDiplome(i, "etablissement", e.target.value)}
                />
            </Col>
            <Col md={2}>
                <Form.Label>Obtention</Form.Label>
                <Form.Control
                type="date"
                value={d.obtention || ""}
                onChange={e => updateDiplome(i, "obtention", e.target.value)}
                />
            </Col>
            <Col md={2}>
                <Form.Label>Fichier PDF</Form.Label>
                <Form.Control
                type="file"
                accept="application/pdf"
                onChange={e => updateDiplome(i, "file", e.target.files?.[0])}
                />
            </Col>
            <Col md={1} className="d-flex flex-column align-items-center justify-content-center">
                <Button
                type="button"
                variant="outline-danger"
                size="sm"
                onClick={() => removeDiplome(i)}
                >
                -
                </Button>
            </Col>
            </Row>
        ))}
        <Button type="button" size="sm" variant="outline-primary" onClick={addDiplome}>
            + Ajouter un diplôme
        </Button>
        </section>

        {/* ===== Certifications ===== */}
        <section className="fiche-section">
        <h4>5. Certifications</h4>
        {form.certifications.map((c: any, i: number) => (
            <Row className="g-3 mb-2 align-items-end" key={i}>
            <Col md={3}>
                <Form.Label>Nom</Form.Label>
                <Form.Control
                placeholder="Nom"
                value={c.label || ""}
                onChange={e => updateCertification(i, "label", e.target.value)}
                />
            </Col>
            <Col md={3}>
                <Form.Label>Organisme</Form.Label>
                <Form.Control
                placeholder="Organisme"
                value={c.organisme?.label || c.organisme || ""}
                onChange={e => updateCertification(i, "organisme", e.target.value)}
                />
            </Col>
            <Col md={2}>
                <Form.Label>Score</Form.Label>
                <Form.Control
                type="number"
                placeholder="Score"
                value={c.score || ""}
                onChange={e => updateCertification(i, "score", e.target.value)}
                />
            </Col>
            <Col md={3}>
                <Form.Label>Badge (URL)</Form.Label>
                <Form.Control
                placeholder="Badge (URL)"
                value={c.badge || ""}
                onChange={e => updateCertification(i, "badge", e.target.value)}
                />
            </Col>
            <Col md={1} className="d-flex flex-column align-items-center justify-content-center">
                <Button
                type="button"
                variant="outline-danger"
                size="sm"
                onClick={() => removeCertification(i)}
                >
                -
                </Button>
            </Col>
            </Row>
        ))}
        <Button type="button" size="sm" variant="outline-primary" onClick={addCertification}>
            + Ajouter une certification
        </Button>
        </section>


      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit}>{profil ? "Mettre à jour" : "Créer"}</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FormProfil;
