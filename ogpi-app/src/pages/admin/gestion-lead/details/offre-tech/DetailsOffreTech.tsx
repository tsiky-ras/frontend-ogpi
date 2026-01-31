import React from "react";
import { Modal, Row, Col } from "react-bootstrap";
import "./DetailsLead.css";

type DetailsOffreTechProps = {
  show: boolean;
  onClose: () => void;
  lead?: any | null;
};

const DetailsOffreTech: React.FC<DetailsOffreTechProps> = ({ show, onClose, lead }) => {
  if (!lead) return null;

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
      <Modal.Header closeButton>
        <Modal.Title>{lead.name} - Offre technique & Financière</Modal.Title>
      </Modal.Header>

      <Modal.Body className="details-lead-body">
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
                <p>{lead.amount?.toLocaleString()} {lead.currency || "EUR"}</p>
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
      </Modal.Body>
    </Modal>
  );
};

export default DetailsOffreTech;
