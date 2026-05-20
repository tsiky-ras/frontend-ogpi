import React, { useState } from "react";
import { Row, Col, Button, Badge, Form, Modal } from "react-bootstrap";
import StepBar from "../../../../../components/stepbar/StepBar.tsx";
import { OFFER_STEPS, getStepNames, canChangeStep } from "../../../../../services/lead/OfferStepService.tsx";
import "../DetailsLead.css";

type DetailsEtapesProps = {
  lead?: any | null;
};

const DetailsEtapes: React.FC<DetailsEtapesProps> = ({ lead }) => {
  const [currentStep, setCurrentStep] = useState(lead?.currentStep ?? 0);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedStepForValidation, setSelectedStepForValidation] = useState<number | null>(null);
  const [validationStatus, setValidationStatus] = useState<'approved' | 'rejected'>('approved');
  const [validationComment, setValidationComment] = useState('');
  const [validationUser, setValidationUser] = useState('');

  if (!lead) return null;

  const stepNames = getStepNames();

  const getValidationStatusBadge = (status?: string) => {
    const map: any = {
      pending: ['bg-warning', '⏳ En attente'],
      approved: ['bg-success', '✓ Approuvé'],
      rejected: ['bg-danger', '✗ Rejeté'],
    };
    const [cls, label] = status ? (map[status] || ['bg-secondary', '-']) : ['bg-secondary', '⏳ En attente'];
    return { class: cls, label };
  };

  const openValidationModal = (stepOrder: number, status: 'approved' | 'rejected' = 'approved') => {
    if (!canChangeStep(currentStep, stepOrder)) return;
    setSelectedStepForValidation(stepOrder);
    setValidationStatus(status);
    setShowValidationModal(true);
  };

  const handleValidateStep = () => {
    if (selectedStepForValidation === null) return;

    if (validationStatus === 'approved' && selectedStepForValidation === currentStep) {
      setCurrentStep(currentStep + 1);
    }

    setShowValidationModal(false);
    setSelectedStepForValidation(null);
    setValidationStatus('approved');
    setValidationComment('');
    setValidationUser('');
  };

  return (
    <div className="details-etapes-container">
      <StepBar steps={stepNames} currentStep={currentStep} />

      <section className="details-section mt-4">
        <h5>Progression du processus de validation</h5>
        <div className="steps-details mt-4">
          {OFFER_STEPS.map((step, index) => {
            const validation = lead?.stepValidations?.[step.id];
            const badge = getValidationStatusBadge(validation?.status);

            return (
              <div key={step.id} className={`step-detail ${index <= currentStep ? 'completed' : ''} ${index === currentStep ? 'current' : ''}`}>
                <div className="step-detail-header">
                  <div className="step-detail-number">{step.order + 1}</div>
                  <div className="step-detail-info">
                    <h6>{step.name}</h6>
                    <p className="step-description">{step.description}</p>
                  </div>
                  <Badge className={`step-status-badge ${badge.class}`}>{badge.label}</Badge>
                </div>

                <div className="step-detail-content">
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="step-role">
                        <label className="role-label">Validateurs</label>
                        <ul className="role-list">
                          {step?.validators?.map((v: string, idx: number) => <li key={idx}>👤 {v}</li>) || <li>-</li>}
                        </ul>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="step-role">
                        <label className="role-label">À informer</label>
                        <ul className="role-list">
                          {step?.toNotify?.map((p: string, idx: number) => <li key={idx}>📧 {p}</li>) || <li>-</li>}
                        </ul>
                      </div>
                    </Col>
                  </Row>

                  {validation && (
                    <Row className="g-3 mt-3">
                      <Col md={6}>
                        <div className="step-detail-item">
                          <label>Validé par</label>
                          <p>{validation.validatedBy || '-'}</p>
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="step-detail-item">
                          <label>Date</label>
                          <p>{validation.validatedDate ? new Date(validation.validatedDate).toLocaleDateString('fr-FR') : '-'}</p>
                        </div>
                      </Col>
                      {validation.comment && (
                        <Col md={12}>
                          <div className="step-detail-item">
                            <label>Commentaire</label>
                            <p className="comment-text">{validation.comment}</p>
                          </div>
                        </Col>
                      )}
                    </Row>
                  )}

                  {index === currentStep && (
                    <Row className="g-3 mt-4">
                      <Col xs="auto">
                        <Button variant="success" size="sm" onClick={() => openValidationModal(step.order, 'approved')}>
                          ✓ Approuver & Continuer
                        </Button>
                      </Col>
                      <Col xs="auto">
                        <Button variant="danger" size="sm" onClick={() => openValidationModal(step.order, 'rejected')}>
                          ✗ Rejeter
                        </Button>
                      </Col>
                    </Row>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal pour la validation */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{validationStatus === 'approved' ? '✓ Approuver l\'étape' : '✗ Rejeter l\'étape'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Votre nom/Identifiant</Form.Label>
              <Form.Control type="text" placeholder="Entrez votre nom" value={validationUser} onChange={e => setValidationUser(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Statut</Form.Label>
              <Form.Select value={validationStatus} onChange={e => setValidationStatus(e.target.value as 'approved' | 'rejected')}>
                <option value="approved">✓ Approuver</option>
                <option value="rejected">✗ Rejeter</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Commentaire {validationStatus === 'rejected' ? '(obligatoire)' : '(optionnel)'}</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Ajoutez un commentaire..." value={validationComment} onChange={e => setValidationComment(e.target.value)} />
            </Form.Group>
            {validationStatus === 'rejected' && !validationComment && (
              <div className="alert alert-warning">⚠️ Un commentaire est obligatoire pour rejeter une étape.</div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>Annuler</Button>
          <Button variant={validationStatus === 'approved' ? 'success' : 'danger'} onClick={handleValidateStep} disabled={validationStatus === 'rejected' && !validationComment}>
            {validationStatus === 'approved' ? '✓ Approuver' : '✗ Rejeter'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DetailsEtapes;
