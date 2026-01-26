import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col, Nav, Tab } from "react-bootstrap";
import { useAuth } from "../../../context/AuthContext.tsx";
import CollecteSuccessMessage from "../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../components/message/CollecteLoadingMessage.tsx";
import "./FormLead.css";
import "../../../components/message/CollecteMessages.css";
import { LeadTypeService } from "../../../services/lead/LeadTypeService.tsx";
import { LeadCategoryService } from "../../../services/lead/LeadCategoryService.tsx";
import { LeadSecteurService } from "../../../services/lead/LeadSecteurService.tsx";
import { LeadStatusService } from "../../../services/lead/LeadStatusService.tsx";
import { TypeFinancementService } from "../../../services/lead/TypeFinancementService.tsx";
import { TypeFacturationService } from "../../../services/lead/TypeFacturationService.tsx";
import { ClientService } from "../../../services/lead/ClientService.tsx";
import { PartenaireService } from "../../../services/lead/PartenaireService.tsx";
import { BusinessUnitService } from "../../../services/profil/poste/BusinessUnitService.tsx";

type FormLeadProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  lead?: any | null;
};

const FormLead: React.FC<FormLeadProps> = ({ show, onClose, onSubmit, lead }) => {
  const { api } = useAuth();

  // ===== Form State =====
  const [form, setForm] = useState<any>({
    // Onglet 1: Qualification
    periode: "",
    businessUnit: "Consulting",
    description: "",
    nom: "",
    reference: "",
    typeOpportunite: "",
    categorie: "",
    zone: "",
    dateSubmission: "",
    heureSubmission: "00:00:00",
    client: "",
    projetFinancement: "",
    typeFinancement: "",
    partenaireETech: "",
    secteur: "",
    statut: "",
    fichier: "",
    commentaire: "",
    // Onglet 2: Offre technique & Financière
    techno: "",
    jhVendu: "",
    devise: "€",
    tjm: "",
    montantOffre: "",
    tauxChange: "",
    impot: "",
    typeFacturation: "",
    dateAttribution: "",
  });

  // ===== Dropdown Options State =====
  const [businessUnits, setBusinessUnits] = useState<{ id: number; name: string }[]>([]);
  const [typeOpportunites, setTypeOpportunites] = useState<{ id: number; label: string }[]>([]);
  const [categories, setCategories] = useState<{ id: number; label: string }[]>([]);
  const [zones, setZones] = useState<{ id: number; label: string }[]>([]);
  const [typeFinancements, setTypeFinancements] = useState<{ id: number; label: string }[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<{ id: number; label: string }[]>([]);
  const [secteurs, setSecteurs] = useState<{ id: number; label: string }[]>([]);
  const [statuts, setStatuts] = useState<{ id: number; label: string }[]>([]);

  // ===== Message Modals State =====
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  // ===== Auto-complete Période =====
  useEffect(() => {
    if (show && !form.periode) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setForm((prev: any) => ({ ...prev, periode: `${month}/${year}` }));
    }
  }, [show]);

  // ===== Fetch Dropdown Data =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const buService = new BusinessUnitService(api);
        const leadTypeService = new LeadTypeService(api);
        const leadCategoryService = new LeadCategoryService(api);
        const leadSecteurService = new LeadSecteurService(api);
        const leadStatusService = new LeadStatusService(api);
        const typeFinancementService = new TypeFinancementService(api);
        const typeFacturationService = new TypeFacturationService(api);
        const clientService = new ClientService(api);
        const partenaireService = new PartenaireService(api);

        const [
          buData,
          typeOpportuniteData,
          categoryData,
          secteurData,
          statusData,
          typeFinancementData,
          typeFacturationData,
          clientData,
          partenaireData,
        ] = await Promise.all([
          buService.getAll(),
          leadTypeService.getAll(),
          leadCategoryService.getAll(),
          leadSecteurService.getAll(),
          leadStatusService.getAll(),
          typeFinancementService.getAll(),
          typeFacturationService.getAll(),
          clientService.getAll(),
          partenaireService.getAll(),
        ]);

        setBusinessUnits(buData);
        setTypeOpportunites(typeOpportuniteData);
        setCategories(categoryData);
        setSecteurs(secteurData);
        setStatuts(statusData);
        setTypeFinancements(typeFinancementData);
        setTypeFacturations(typeFacturationData);
        // Note: clientData et partenaireData sont des listes libres, donc non utilisées dans les dropdowns
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };

    if (show) {
      fetchData();
    }
  }, [show, api]);

  // ===== Pré-remplir le formulaire si lead sélectionné =====
  useEffect(() => {
    if (lead) {
      setForm({
        periode: lead.periode || "",
        businessUnit: lead.businessUnit || "",
        description: lead.description || "",
        nom: lead.name || "",
        reference: lead.reference || "",
        typeOpportunite: lead.type || "",
        categorie: lead.category || "",
        zone: lead.zone || "",
        dateSubmission: lead.dateSubmission || "",
        heureSubmission: lead.heureSubmission || "",
        client: lead.company || "",
        projetFinancement: lead.projetFinancement || "",
        typeFinancement: lead.typeFinancement || "",
        partenaireETech: lead.partenaireETech || "",
        secteur: lead.sector || "",
        statut: lead.status || "",
        fichier: "",
        commentaire: lead.commentaire || "",
        techno: lead.techno || "",
        jhVendu: lead.jhVendu || "",
        devise: lead.currency || "EUR",
        tjm: lead.tjm || "",
        montantOffre: lead.amount || "",
        tauxChange: lead.tauxChange || "",
        impot: lead.impot || "",
        typeFacturation: lead.typeFacturation || "",
        dateAttribution: lead.dateAttribution || "",
      });
    } else {
      // Réinitialiser le formulaire pour une nouvelle opportunité
      setForm({
        periode: new Date().getMonth().toString().padStart(2, "0") + "/" + new Date().getFullYear(),
        businessUnit: "",
        description: "",
        nom: "",
        reference: "",
        typeOpportunite: "",
        categorie: "",
        zone: "",
        dateSubmission: "",
        heureSubmission: "",
        client: "",
        projetFinancement: "",
        typeFinancement: "",
        partenaireETech: "",
        secteur: "",
        statut: "",
        fichier: "",
        commentaire: "",
        techno: "",
        jhVendu: "",
        devise: "EUR",
        tjm: "",
        montantOffre: "",
        tauxChange: "",
        impot: "",
        typeFacturation: "",
        dateAttribution: "",
      });
    }
  }, [lead, show]);

  // ===== Handle Change =====
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  // ===== Handle Submit =====
  const handleSubmit = async () => {
    try {
      setShowLoadingMessage(true);

      // Validation basique
      if (
        !form.nom ||
        !form.reference ||
        !form.typeOpportunite ||
        !form.categorie ||
        !form.dateSubmission
      ) {
        setShowLoadingMessage(false);
        setErrorMessage("Veuillez remplir tous les champs obligatoires");
        setShowErrorMessage(true);
        return;
      }

      // TODO: Appel API pour créer/modifier le lead
      // await leadService.create(form) ou leadService.update(form)

      setShowLoadingMessage(false);
      setSuccessMessage(
        lead
          ? "Lead modifié avec succès !"
          : "Lead créé avec succès !"
      );
      setShowSuccessMessage(true);

      setTimeout(() => {
        setShowSuccessMessage(false);
        onSubmit(form);
        onClose();
      }, 2000);
    } catch (err: any) {
      setShowLoadingMessage(false);
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement";
      setErrorMessage(msg);
      setShowErrorMessage(true);
      console.error("Erreur :", err);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable className="form-lead-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {lead ? `Modifier : ${lead.nom}` : "Créer une nouvelle opportunité"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="form-lead-body">
          <Tab.Container defaultActiveKey="qualification">
            <Nav variant="tabs" className="form-lead-tabs">
              <Nav.Item>
                <Nav.Link eventKey="qualification">Qualification</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="offre">Offre technique & Financière</Nav.Link>
              </Nav.Item>
              {/* Autres onglets à ajouter */}
            </Nav>

            <Tab.Content className="form-lead-tab-content">
              {/* ===== ONGLET QUALIFICATION ===== */}
              <Tab.Pane eventKey="qualification">
                {/* Période et Business Unit */}
                <section className="fiche-section">
                  <h4>Informations Générales</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Période <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="periode"
                        placeholder="MM/YYYY"
                        value={form.periode}
                        onChange={handleChange}
                        disabled
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Business Unit <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="businessUnit"
                        value={form.businessUnit}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {businessUnits.map((bu) => (
                          <option key={bu.id} value={bu.id}>
                            {bu.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                </section>

                {/* Description et Nom du lead */}
                <section className="fiche-section">
                  <h4>Détails de l'Opportunité</h4>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Label>Description <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        placeholder="Description de l'opportunité"
                        value={form.description}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Nom du Lead <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        name="nom"
                        placeholder="Nom du lead"
                        value={form.nom}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Références <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        name="reference"
                        placeholder="Références"
                        value={form.reference}
                        onChange={handleChange}
                      />
                    </Col>
                  </Row>
                </section>

                {/* Types et Catégories */}
                <section className="fiche-section">
                  <h4>Classification</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Type d'Opportunité <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="typeOpportunite"
                        value={form.typeOpportunite}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {typeOpportunites.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Catégorie <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="categorie"
                        value={form.categorie}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Zone <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="zone"
                        value={form.zone}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Secteur <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="secteur"
                        value={form.secteur}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {secteurs.map((sect) => (
                          <option key={sect.id} value={sect.id}>
                            {sect.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                </section>

                {/* Date et Heure de Soumission */}
                <section className="fiche-section">
                  <h4>Dates et Délais</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Date de Soumission <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        name="dateSubmission"
                        value={form.dateSubmission}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Heure de Soumission (HH:MM:SS)</Form.Label>
                      <Form.Control
                        type="time"
                        name="heureSubmission"
                        value={form.heureSubmission.substring(0, 5)}
                        onChange={(e) => {
                          const time = e.target.value;
                          setForm((prev: any) => ({
                            ...prev,
                            heureSubmission: time ? `${time}:00` : "00:00:00",
                          }));
                        }}
                      />
                    </Col>
                  </Row>
                </section>

                {/* Client et Projets */}
                <section className="fiche-section">
                  <h4>Client et Projets</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Client <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        name="client"
                        placeholder="Nom du client"
                        value={form.client}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Projets de Financement</Form.Label>
                      <Form.Control
                        name="projetFinancement"
                        placeholder="Projet de financement"
                        value={form.projetFinancement}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Type de Financement <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="typeFinancement"
                        value={form.typeFinancement}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {typeFinancements.map((tf) => (
                          <option key={tf.id} value={tf.id}>
                            {tf.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Partenaire eTech</Form.Label>
                      <Form.Control
                        name="partenaireETech"
                        placeholder="Partenaire eTech"
                        value={form.partenaireETech}
                        onChange={handleChange}
                      />
                    </Col>
                  </Row>
                </section>

                {/* Statut et Fichier */}
                <section className="fiche-section">
                  <h4>Statut et Fichiers</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Statut <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="statut"
                        value={form.statut}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {statuts.map((stat) => (
                          <option key={stat.id} value={stat.id}>
                            {stat.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Fichier (Lien Drive)</Form.Label>
                      <Form.Control
                        type="url"
                        name="fichier"
                        placeholder="https://drive.google.com/..."
                        value={form.fichier}
                        onChange={handleChange}
                      />
                    </Col>
                  </Row>
                </section>

                {/* Commentaire */}
                <section className="fiche-section">
                  <h4>Commentaires</h4>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Label>Commentaire</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="commentaire"
                        placeholder="Commentaires additionnels"
                        value={form.commentaire}
                        onChange={handleChange}
                      />
                    </Col>
                  </Row>
                </section>
              </Tab.Pane>

              {/* ===== ONGLET OFFRE TECHNIQUE & FINANCIÈRE ===== */}
              <Tab.Pane eventKey="offre">
                {/* Techno et JH Vendu */}
                <section className="fiche-section">
                  <h4>Offre Technique</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Technologie <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        name="techno"
                        placeholder="Ex: React, Node.js, Python..."
                        value={form.techno}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>JH Vendu <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        name="jhVendu"
                        placeholder="Nombre de jours/heures"
                        value={form.jhVendu}
                        onChange={handleChange}
                      />
                    </Col>
                  </Row>
                </section>

                {/* Devise, TJM et Montant */}
                <section className="fiche-section">
                  <h4>Offre Financière</h4>
                  <Row className="g-3">
                    <Col md={4}>
                      <Form.Label>Devise <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="devise"
                        value={form.devise}
                        onChange={handleChange}
                      >
                        <option value="€">€ - Euro</option>
                        <option value="USD">$ - Dollar USD</option>
                        <option value="MGA">Ar - Ariary</option>
                      </Form.Select>
                    </Col>
                    <Col md={4}>
                      <Form.Label>TJM (Tarif Journalier Moyen) <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        name="tjm"
                        placeholder="TJM"
                        value={form.tjm}
                        onChange={handleChange}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label>Montant de l'offre <span className="required-asterisk">*</span></Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="number"
                          name="montantOffre"
                          placeholder="Montant"
                          value={form.montantOffre}
                          onChange={handleChange}
                        />
                        <span className="input-group-text">{form.devise}</span>
                      </div>
                    </Col>
                  </Row>
                </section>

                {/* Taux de Change et Impôt */}
                <section className="fiche-section">
                  <h4>Conversions & Taxes</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Taux de Change (vers MGA)</Form.Label>
                      <Form.Control
                        type="number"
                        name="tauxChange"
                        placeholder="Taux de change du jour"
                        value={form.tauxChange}
                        onChange={handleChange}
                        disabled={form.devise === "MGA"}
                      />
                      <small className="text-muted">Conversion devise étrangère en MGA</small>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Impôt</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="number"
                          name="impot"
                          placeholder="Montant de l'impôt"
                          value={form.impot}
                          onChange={handleChange}
                        />
                        <span className="input-group-text">{form.devise}</span>
                      </div>
                    </Col>
                  </Row>
                </section>

                {/* Type de Facturation et Date d'Attribution */}
                <section className="fiche-section">
                  <h4>Facturation & Attribution</h4>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label>Type de Facturation <span className="required-asterisk">*</span></Form.Label>
                      <Form.Select
                        name="typeFacturation"
                        value={form.typeFacturation}
                        onChange={handleChange}
                      >
                        <option value="">-- Sélectionner --</option>
                        {typeFacturations.map((tf) => (
                          <option key={tf.id} value={tf.id}>
                            {tf.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Date d'Attribution <span className="required-asterisk">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        name="dateAttribution"
                        value={form.dateAttribution}
                        onChange={handleChange}
                      />
                    </Col>
                  </Row>
                </section>
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {lead ? "Modifier" : "Créer"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Message Modals */}
      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage && <CollecteErrorMessage message={errorMessage} />}
    </>
  );
};

export default FormLead;
