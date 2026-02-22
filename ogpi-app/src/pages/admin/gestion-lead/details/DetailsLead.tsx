import React, { useState, useEffect } from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import DetailsQualif from "./qualif/DetailsQualif.tsx";
import DetailsEtapes from "./etape/DetailsEtapes.tsx";
import DetailsOffreTech from "./offre-tech/DetailsOffreTech.tsx";
import "./DetailsLead.css";

type DetailsLeadProps = {
  show: boolean;
  onClose: () => void;
  lead?: any | null;
};

const DetailsLead: React.FC<DetailsLeadProps> = ({ show, onClose, lead }) => {
  if (!lead) return null;

  const getBadgeClass = (statusLabel?: string) => {
    switch (statusLabel) {
      case "No Go":
      case "lost":
        return "bg-danger";
      case "Go":
      case "won":
      case "active":
        return "bg-success";
      case "submitted":
        return "bg-info";
      default:
        return "bg-secondary";
    }
  };

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
      <Modal.Header closeButton>
        <div className="details-lead-header-content">
          <div>
            <Modal.Title style={{ color: "white" }}>
              {lead.leadName || "-"}
            </Modal.Title>
            <p className="mb-1">{lead.leadRef || "-"}</p>
            {lead.createdByUser && (
              <small style={{ color: "#ddd" }}>
                Créé par: {lead.createdByUser.username} ({lead.createdByUser.email})
              </small>
            )}
          </div>

          <div className="d-flex flex-column align-items-end gap-2">
            <span
              className={`badge ${getBadgeClass(
                lead.currentLeadStatus?.leadStatus?.label
              )}`}
            >
              {lead.currentLeadStatus?.leadStatus?.label ||
                "En attente de validation"}
            </span>
            {lead.currentLeadStep?.leadStep && (
              <span className="badge bg-primary">
                Étape: {lead.currentLeadStep.leadStep.label}
              </span>
            )}
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="details-lead-body">
        <Tab.Container defaultActiveKey="qualification">
          {/* ===== Onglets ===== */}
          <Nav variant="pills" className="details-lead-tabs mb-4">
            <Nav.Item>
              <Nav.Link eventKey="qualification">Qualification</Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link eventKey="offre">
                Offre technique & financière
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link eventKey="etapes">
                Étapes & Validations
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* ===== Contenu ===== */}
          <Tab.Content>
            <Tab.Pane eventKey="qualification">
              <DetailsQualif lead={lead} />
            </Tab.Pane>

            <Tab.Pane eventKey="offre">
              <DetailsOffreTech lead={lead} />
            </Tab.Pane>

            <Tab.Pane eventKey="etapes">
              <DetailsEtapes lead={lead} />
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default DetailsLead;