import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import "../../gestion-lead/backlog/BacklogForm.css";
import { BacklogType } from "../../../../types/lead/Backlog/Backlog.tsx";
import { CreateBacklogForProjetRequest } from "../../../../types/projet/backlog/BacklogProjet.tsx";

type BacklogFormProjetProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (item: CreateBacklogForProjetRequest) => void;
  projetId: number;
};


const BacklogFormProjet: React.FC<BacklogFormProjetProps> = ({ show, onClose, onSubmit, projetId }) => {
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [type,    setType]    = useState<BacklogType>(1 as BacklogType);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Reset complet à chaque ouverture
  useEffect(() => {
    if (show) {
      setName("");
      setDesc("");
      setType(1 as BacklogType);
      setError("");
    }
  }, [show]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await onSubmit({
        name:     name.trim(),
        desc:     desc.trim(),
        projetId,
        type,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du backlog.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered className="backlog-modal">
      <Modal.Header closeButton>
        <Modal.Title>Créer un backlog projet</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Row className="g-3">

            <Col md={12}>
              <Form.Label>
                Nom <span className="required-asterisk">*</span>
              </Form.Label>
              <Form.Control
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nom du backlog projet"
                disabled={loading}
                autoFocus
              />
            </Col>

            <Col md={12}>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Description facultative"
                disabled={loading}
              />
            </Col>

            {error && (
              <Col md={12} className="form-error text-danger small">
                {error}
              </Col>
            )}

          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Création..." : "Créer"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BacklogFormProjet;