import React, { useState } from "react";
import { Modal, Button, Row, Col, Nav, Tab, Form, Badge } from "react-bootstrap";
import StepBar from "../../../components/stepbar/StepBar.tsx";
import { OFFER_STEPS, getStepNames, canChangeStep } from "../../../services/lead/OfferStepService.tsx";
import "./DetailsLead.css";

type DetailsLeadProps = {
  show: boolean;
  onClose: () => void;
  lead?: any | null;
};

const DetailsLead: React.FC<DetailsLeadProps> = ({ show, onClose, lead }) => {
  const [currentStep, setCurrentStep] = useState(lead?.currentStep || 0);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedStepForValidation, setSelectedStepForValidation] = useState<number | null>(null);
  const [validationStatus, setValidationStatus] = useState<'approved' | 'rejected'>('approved');
  const [validationComment, setValidationComment] = useState('');
  const [validationUser, setValidationUser] = useState('');

  if (!lead) return null;

  const getStatusBadge = (status: string) => {
    const map: any = {
      active: ["bg-success", "Actif"],
      submitted: ["bg-info", "Soumis"],
      won: ["bg-success", "Gagné"],
      lost: ["bg-danger", "Perdu"],
    };
    const [cls, label] = map[status] || ["bg-secondary", "Brouillon"];
    return { class: cls, label };
  };

  const getValidationStatusBadge = (status: string) => {
    const map: any = {
      pending: ['bg-warning', '⏳ En attente'],
      approved: ['bg-success', '✓ Approuvé'],
      rejected: ['bg-danger', '✗ Rejeté'],
    };
    const [cls, label] = map[status] || ['bg-secondary', '-'];
    return { class: cls, label };
  };

  const handleValidateStep = () => {
    if (selectedStepForValidation === null) return;

    // Simuler la sauvegarde de la validation
    console.log('Validation du step:', selectedStepForValidation, {
      status: validationStatus,
      comment: validationComment,
      validatedBy: validationUser,
      date: new Date().toISOString(),
    });

    // Mettre à jour l'étape actuelle si approuvée
    if (validationStatus === 'approved' && selectedStepForValidation === currentStep) {
      setCurrentStep(currentStep + 1);
    }

    // Réinitialiser la modale
    setShowValidationModal(false);
    setSelectedStepForValidation(null);
    setValidationStatus('approved');
    setValidationComment('');
    setValidationUser('');
  };

  const openValidationModal = (stepOrder: number) => {
    // Vérifier que le changement est séquencé
    if (!canChangeStep(currentStep, stepOrder)) {
      console.warn('Changement d\'étape non autorisé');
      return;
    }
    setSelectedStepForValidation(stepOrder);
    setShowValidationModal(true);
  };

  const statusBadge = getStatusBadge(lead.status);
  const deadlineDate = new Date(lead.deadline).toLocaleDateString("fr-FR");
  const createdDate = new Date(lead.createdAt).toLocaleDateString("fr-FR");
  const stepNames = getStepNames();

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
      <Modal.Header closeButton>
        <div className="details-lead-header-content">
          <div>
            <Modal.Title style={{ color: 'white' }}>{lead.name}</Modal.Title>
            <p>{lead.reference}</p>
          </div>
          <span className={`badge ${statusBadge.class} ms-3`}>{statusBadge.label}</span>
        </div>
      </Modal.Header>

      <Modal.Body className="details-lead-body">
        <Tab.Container defaultActiveKey="qualification">
          <Nav variant="pills" className="details-lead-tabs mb-4">
            <Nav.Item>
              <Nav.Link eventKey="qualification">Qualification</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="offre">Offre technique & Financière</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="etapes">Étapes & Validations</Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            {/* TAB 1: QUALIFICATION */}
            <Tab.Pane eventKey="qualification">
              {/* Informations Générales */}
              <section className="details-section">
                <h5>Informations Générales</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Période</label>
                      <p>{lead.periode || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Business Unit</label>
                      <p>{lead.businessUnit || "-"}</p>
                    </div>
                  </Col>
                  <Col md={12}>
                    <div className="detail-item">
                      <label>Description</label>
                      <p>{lead.description || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Détails Opportunité */}
              <section className="details-section">
                <h5>Détails de l'opportunité</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Nom</label>
                      <p>{lead.name || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Référence</label>
                      <p>{lead.reference || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Type d'opportunité</label>
                      <p>{lead.type || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Catégorie</label>
                      <p>{lead.category || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Classification */}
              <section className="details-section">
                <h5>Classification</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Zone</label>
                      <p>{lead.zone || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Secteur</label>
                      <p>{lead.sector || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Statut</label>
                      <span>{statusBadge.label}</span>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Dates et Soumission */}
              <section className="details-section">
                <h5>Dates et soumission</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Date de soumission</label>
                      <p>{lead.dateSubmission || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Heure de soumission</label>
                      <p>{lead.heureSubmission || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Date de création</label>
                      <p>{createdDate}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Deadline</label>
                      <p className="deadline">{deadlineDate}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Entités */}
              <section className="details-section">
                <h5>Entités impliquées</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Client/Entreprise</label>
                      <p>{lead.company || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Projet de financement</label>
                      <p>{lead.projetFinancement || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Type de financement</label>
                      <p>{lead.typeFinancement || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Partenaire E-tech</label>
                      <p>{lead.partenaireETech || "-"}</p>
                    </div>
                  </Col>
                  <Col md={12}>
                    <div className="detail-item">
                      <label>Commentaires</label>
                      <p>{lead.commentaire || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Contact */}
              <section className="details-section">
                <h5>Informations de contact</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Email</label>
                      <p>
                        {lead.email ? (
                          <a href={`mailto:${lead.email}`}>{lead.email}</a>
                        ) : (
                          "-"
                        )}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Téléphone</label>
                      <p>
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                        ) : (
                          "-"
                        )}
                      </p>
                    </div>
                  </Col>
                </Row>
              </section>
            </Tab.Pane>

            {/* TAB 2: OFFRE TECHNIQUE & FINANCIÈRE */}
            <Tab.Pane eventKey="offre">
              {/* Offre Technique */}
              <section className="details-section">
                <h5>Offre Technique</h5>
                <Row className="g-3">
                  <Col md={12}>
                    <div className="detail-item">
                      <label>Technologie</label>
                      <p>{lead.techno || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Jour-Homme vendus (JH)</label>
                      <p>{lead.jhVendu || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Offre Financière */}
              <section className="details-section">
                <h5>Offre Financière</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Devise</label>
                      <p>{lead.currency || "EUR"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Montant de l'offre</label>
                      <p className="amount">
                        {lead.amount?.toLocaleString()} {lead.currency || "EUR"}
                      </p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>TJM (Tarif Jour-Homme)</label>
                      <p>{lead.tjm || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Conversions & Taxes */}
              <section className="details-section">
                <h5>Conversions & Taxes</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Taux de change</label>
                      <p>{lead.tauxChange || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Impôt/Taxe</label>
                      <p>{lead.impot || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>

              {/* Facturation & Attribution */}
              <section className="details-section">
                <h5>Facturation & Attribution</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Type de facturation</label>
                      <p>{lead.typeFacturation || "-"}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="detail-item">
                      <label>Date d'attribution</label>
                      <p>{lead.dateAttribution || "-"}</p>
                    </div>
                  </Col>
                </Row>
              </section>
            </Tab.Pane>

            {/* TAB 3: ÉTAPES & VALIDATIONS */}
            <Tab.Pane eventKey="etapes">
              {/* StepBar */}
              <StepBar steps={stepNames} currentStep={currentStep} />

              {/* Détails des étapes */}
              <section className="details-section mt-4">
                <h5>Progression du processus de validation</h5>
                <div className="steps-details mt-4">
                  {OFFER_STEPS.map((step, index) => (
                    <div key={step.id} className={`step-detail ${index <= currentStep ? 'completed' : ''} ${index === currentStep ? 'current' : ''}`}>
                      <div className="step-detail-header">
                        <div className="step-detail-number">{step.order + 1}</div>
                        <div className="step-detail-info">
                          <h6>{step.name}</h6>
                          <p className="step-description">{step.description}</p>
                        </div>
                        <Badge className={`step-status-badge ${lead.stepValidations?.[step.id]?.status ? getValidationStatusBadge(lead.stepValidations[step.id].status).class : 'bg-secondary'}`}>
                          {lead.stepValidations?.[step.id]?.status ? getValidationStatusBadge(lead.stepValidations[step.id].status).label : '⏳ En attente'}
                        </Badge>
                      </div>

                      <div className="step-detail-content">
                        <Row className="g-3">
                          <Col md={6}>
                            <div className="step-role">
                              <label className="role-label">Validateurs</label>
                              <ul className="role-list">
                                {step.validators.map((validator, idx) => (
                                  <li key={idx}>👤 {validator}</li>
                                ))}
                              </ul>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="step-role">
                              <label className="role-label">À informer</label>
                              <ul className="role-list">
                                {step.toNotify.map((person, idx) => (
                                  <li key={idx}>📧 {person}</li>
                                ))}
                              </ul>
                            </div>
                          </Col>
                        </Row>

                        {lead.stepValidations?.[step.id] && (
                          <Row className="g-3 mt-3">
                            <Col md={6}>
                              <div className="step-detail-item">
                                <label>Validé par</label>
                                <p>{lead.stepValidations[step.id].validatedBy || '-'}</p>
                              </div>
                            </Col>
                            <Col md={6}>
                              <div className="step-detail-item">
                                <label>Date</label>
                                <p>{lead.stepValidations[step.id].validatedDate ? new Date(lead.stepValidations[step.id].validatedDate).toLocaleDateString('fr-FR') : '-'}</p>
                              </div>
                            </Col>
                            {lead.stepValidations[step.id].comment && (
                              <Col md={12}>
                                <div className="step-detail-item">
                                  <label>Commentaire</label>
                                  <p className="comment-text">{lead.stepValidations[step.id].comment}</p>
                                </div>
                              </Col>
                            )}
                          </Row>
                        )}

                        {/* Boutons d'action pour changer d'étape */}
                        {index === currentStep && (
                          <Row className="g-3 mt-4">
                            <Col xs="auto">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => openValidationModal(step.order)}
                              >
                                ✓ Approuver & Continuer
                              </Button>
                            </Col>
                            <Col xs="auto">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setValidationStatus('rejected');
                                  setSelectedStepForValidation(step.order);
                                  setShowValidationModal(true);
                                }}
                              >
                                ✗ Rejeter
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>

      <Modal.Footer>
      </Modal.Footer>

      {/* Modal de Validation */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {validationStatus === 'approved' ? '✓ Approuver l\'étape' : '✗ Rejeter l\'étape'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Votre nom/Identifiant</Form.Label>
              <Form.Control
                type="text"
                placeholder="Entrez votre nom"
                value={validationUser}
                onChange={(e) => setValidationUser(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Statut</Form.Label>
              <Form.Select
                value={validationStatus}
                onChange={(e) => setValidationStatus(e.target.value as 'approved' | 'rejected')}
              >
                <option value="approved">✓ Approuver</option>
                <option value="rejected">✗ Rejeter</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Commentaire {validationStatus === 'rejected' ? '(obligatoire)' : '(optionnel)'}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Ajoutez un commentaire..."
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
              />
            </Form.Group>

            {validationStatus === 'rejected' && !validationComment && (
              <div className="alert alert-warning" role="alert">
                ⚠️ Un commentaire est obligatoire pour rejeter une étape.
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
            Annuler
          </Button>
          <Button
            variant={validationStatus === 'approved' ? 'success' : 'danger'}
            onClick={handleValidateStep}
            disabled={validationStatus === 'rejected' && !validationComment}
          >
            {validationStatus === 'approved' ? '✓ Approuver' : '✗ Rejeter'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Modal>
  );
};

export default DetailsLead;
