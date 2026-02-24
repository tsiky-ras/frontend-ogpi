import React from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import InfoGeneral from "./info-general/InfoGeneral.tsx";
import "./ProjetDetails.css";
import { Projet } from "../../../../../types/projet/Projet.tsx";

type ProjetDetailsProps = {
  show: boolean;
  onClose: () => void;
  projet?: Projet | null; // projet complet
};

const ProjetDetails: React.FC<ProjetDetailsProps> = ({ show, onClose, projet }) => {
  if (!projet) return null; // ne rien afficher si aucun projet

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
      <Modal.Header closeButton>
        <div className="details-lead-header-content">
          <div>
            <Modal.Title style={{ color: "white" }}>
              {projet.nomProjet || "Projet sans nom"}
            </Modal.Title>
            <p>{projet.refBC || "-"}</p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="details-lead-body">
        <Tab.Container defaultActiveKey="infoGeneral">
          {/* ===== Onglets ===== */}
          <Nav variant="pills" className="details-lead-tabs mb-4">
            <Nav.Item>
              <Nav.Link eventKey="infoGeneral">Informations générales</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="phases">Phases</Nav.Link>
            </Nav.Item>
          </Nav>

          {/* ===== Contenu ===== */}
          <Tab.Content>
            <Tab.Pane eventKey="infoGeneral">
            <div className="details-section">
                <InfoGeneral projet={projet} />
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="phases">
              <div className="details-section">
                <p>Liste des phases du projet (à compléter)...</p>
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default ProjetDetails;