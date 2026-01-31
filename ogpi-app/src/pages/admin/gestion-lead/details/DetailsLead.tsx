import React, { useState, useEffect } from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import StepBar from "../../../../components/stepbar/StepBar.tsx";
import { OFFER_STEPS, getStepNames, canChangeStep } from "../../../../services/lead/OfferStepService.tsx";
import DetailsQualif from "./qualif/DetailsQualif.tsx";
import "./DetailsLead.css";

type DetailsLeadProps = {
  show: boolean;
  onClose: () => void;
  lead?: any | null;
};

const DetailsLead: React.FC<DetailsLeadProps> = ({ show, onClose, lead }) => {
  const [currentStep, setCurrentStep] = useState(lead?.currentStep || 0);

  if (!lead) return null;
  const getBadgeClass = (statusLabel?: string) => {
    switch (statusLabel) {
      case "No Go":
      case "lost":
        return "bg-danger";
      case "Go":
      case "won":
        return "bg-success";
      case "submitted":
        return "bg-info";
      case "active":
        return "bg-success";
      default:
        return "bg-secondary";
    }
  };

  const stepNames = getStepNames();

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
    <Modal.Header closeButton>
      <div className="details-lead-header-content">
        <div>
          <Modal.Title style={{ color: 'white' }}>{lead.leadName || "-"}</Modal.Title>
          <p>{lead.leadRef || "-"}</p>
        </div>

        {/* Badge avec vraie valeur */}
        <span className={`badge ${getBadgeClass(lead.currentLeadStatus?.leadStatus?.label)}`}>
          {lead.currentLeadStatus?.leadStatus?.label || "Brouillon"}
        </span>
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
          <Tab.Pane eventKey="qualification">
            <DetailsQualif lead={lead} />
          </Tab.Pane>
          <Tab.Pane eventKey="offre">
            {/* Composant ou tableau de l’offre */}
          </Tab.Pane>
          <Tab.Pane eventKey="etapes">
            {/* StepBar et validations */}
          </Tab.Pane>
        </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default DetailsLead;
