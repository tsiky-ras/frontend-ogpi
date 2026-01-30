import React from "react";
import { Form, Row, Col } from "react-bootstrap";

type Props = {
  form: any;
  handleChange: (e: any) => void;
  typeFacturations: { id: number; label: string }[];
};

const FormTechFin: React.FC<Props> = ({ form, handleChange, typeFacturations }) => {
  return (
    <>
      {/* Offre Technique */}
      <section className="fiche-section">
        <h4>Offre Technique</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Technologie *</Form.Label>
            <Form.Control
              name="techno"
              placeholder="Ex: React, Node.js, Python..."
              value={form.techno}
              onChange={handleChange}
            />
          </Col>
          <Col md={6}>
            <Form.Label>JH Vendu *</Form.Label>
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

      {/* Offre Financière */}
      <section className="fiche-section">
        <h4>Offre Financière</h4>
        <Row className="g-3">
          <Col md={4}>
            <Form.Label>Devise *</Form.Label>
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
            <Form.Label>TJM *</Form.Label>
            <Form.Control
              type="number"
              name="tjm"
              placeholder="TJM"
              value={form.tjm}
              onChange={handleChange}
            />
          </Col>
          <Col md={4}>
            <Form.Label>Montant de l'offre *</Form.Label>
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

      {/* Conversions & Taxes */}
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

      {/* Facturation & Attribution */}
      <section className="fiche-section">
        <h4>Facturation & Attribution</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Type de Facturation *</Form.Label>
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
            <Form.Label>Date d'Attribution *</Form.Label>
            <Form.Control
              type="date"
              name="dateAttribution"
              value={form.dateAttribution}
              onChange={handleChange}
            />
          </Col>
        </Row>
      </section>
    </>
  );
};

export default FormTechFin;
