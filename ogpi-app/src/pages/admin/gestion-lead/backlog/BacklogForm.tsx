import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import "./BacklogForm.css";
import { CreateBacklogRequest, BacklogType } from "../../../../types/lead/Backlog/Backlog.tsx";

type BacklogFormProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (item: CreateBacklogRequest) => void; 
  leadId: number; 
};

const BacklogForm: React.FC<BacklogFormProps> = ({ show, onClose, onSubmit, leadId }) => {
  // State du formulaire
  const [form, setForm] = useState<CreateBacklogRequest>({
    name: "",
    leadId: leadId,
    projetId: null,
    desc: "",   
    type: 0 as BacklogType, 
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mise à jour du leadId si la props change
  useEffect(() => {
    setForm(prev => ({ ...prev, leadId }));
  }, [leadId]);

  // Gestion des changements sur les inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!form.name.trim()) {  
      setError("Le nom est obligatoire.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await onSubmit({
        name: form.name.trim(),
        leadId: form.leadId,
        projetId: null,           
        desc: form.desc?.trim(),
        type: 0                    
      });

      setForm({
        name: "",
        leadId,
        projetId: null,
        desc: "",
        type: 0
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
        <Modal.Title>Créer un backlog</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Row className="g-3">
            <Col md={12}>
              <Form.Label>
                Nom <span className="required-asterisk">*</span>
              </Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nom du backlog"
              />
            </Col>

            <Col md={12}>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="desc"
                value={form.desc}
                onChange={handleChange}
                placeholder="Description facultative"
              />
            </Col>

            {error && (
              <Col md={12} className="form-error text-danger">
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

export default BacklogForm;