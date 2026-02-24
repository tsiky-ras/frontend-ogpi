import React, { useEffect, useState } from "react";
import { Form, Row, Col, InputGroup, Button, Modal } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import GenericForm from "../../../../../components/form/GenericForm.tsx";

type Props = {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  devises: any[];
  typeFacturations: any[];
  technos: any[];
  technoService: any;
  deviseService?: any;
  typeFacturationService?: any;
};

const FormTechFin: React.FC<Props> = ({
  form,
  setForm,
  devises = [],
  typeFacturations = [],
  technos = [],
  technoService,
  deviseService,
  typeFacturationService,
}) => {
  /* ================= Normalisation ================= */
  const normalizeTechnos = (input: any[]): number[] =>
    Array.from(
      new Set(
        input
          ?.map((item) =>
            typeof item === "object" && item !== null
              ? Number(item.idTechno || item.id)
              : Number(item)
          )
          .filter((id) => !isNaN(id)) || []
      )
    );

  /* ================= State local ================= */
  const [showTechnoModal, setShowTechnoModal] = useState(false);
  const [localTechnos, setLocalTechnos] = useState<any[]>([]);
  const [showDeviseModal, setShowDeviseModal] = useState(false);
  const [localDevises, setLocalDevises] = useState<any[]>([]);
  const [showFacturationModal, setShowFacturationModal] = useState(false);
  const [localTypeFacturations, setLocalTypeFacturations] = useState<any[]>([]);

  /* ================= Effets ================= */
  // Déduplication automatique des technos
  useEffect(() => {
    const uniqueTechnos = Array.from(new Map(technos.map((t) => [t.idTechno || t.id, t])).values());
    setLocalTechnos(uniqueTechnos);
  }, [technos]);

  useEffect(() => setLocalDevises(devises), [devises]);
  useEffect(() => setLocalTypeFacturations(typeFacturations), [typeFacturations]);

  /* ================= Debug ================= */
  useEffect(() => {
    console.log("=== DEBUG FormTechFin ===");
    console.log("form.technos:", form.technos);
    console.log("Normalisé:", normalizeTechnos(form.technos));
  }, [form.technos]);

  /* ================= Render ================= */
  return (
    <>
      {/* ================= Technologies ================= */}
      <section className="fiche-section">
        <h4>Technologies</h4>
        <Row className="g-3">
          <Col md={8}>
            <Form.Label>Technologies</Form.Label>
            <div className="d-flex flex-column">
              {localTechnos.map((t) => {
                const idTech = Number(t.idTechno || t.id);
                const isChecked = normalizeTechnos(form.technos).includes(idTech);

                return (
                  <Form.Check
                    key={idTech} 
                    type="checkbox"
                    id={`techno-${idTech}`}
                    label={t.nomTechno}
                    checked={isChecked}
                    onChange={(e) => {
                      const currentIds = normalizeTechnos(form.technos);
                      const newTechnos = e.target.checked
                        ? [...currentIds, idTech]
                        : currentIds.filter((id) => id !== idTech);
                      setForm((prev) => ({ ...prev, technos: newTechnos }));
                    }}
                  />
                );
              })}
            </div>
            <Button
              variant="outline-primary"
              className="mt-2"
              onClick={() => setShowTechnoModal(true)}
            >
              <FaPlus /> Ajouter une techno
            </Button>
          </Col>
        </Row>
      </section>

      {/* ================= Données financières ================= */}
      <section className="fiche-section">
        <h4>Données financières</h4>
        <Row className="g-3">
          <Col md={4}>
            <Form.Label>Volume JH vendu</Form.Label>
            <Form.Control
              type="number"
              value={form.volumeJHVendu}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, volumeJHVendu: Number(e.target.value) }))
              }
            />
          </Col>

          <Col md={4}>
            <Form.Label>Devise</Form.Label>
            <InputGroup>
              <Form.Select
                value={form.deviseId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    deviseId: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              >
                <option value="">-- Sélectionner --</option>
                {localDevises.map((d) => (
                  <option key={d.idDevise} value={d.idDevise}>
                    {d.abrDevise}
                  </option>
                ))}
              </Form.Select>
              <Button variant="outline-primary" onClick={() => setShowDeviseModal(true)}>
                <FaPlus />
              </Button>
            </InputGroup>
          </Col>

          <Col md={4}>
            <Form.Label>Taux de change</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={form.tauxDeChange}
              onChange={(e) => setForm((prev) => ({ ...prev, tauxDeChange: Number(e.target.value) }))}
            />
          </Col>

          <Col md={4}>
            <Form.Label>Budget nécessaire</Form.Label>
            <Form.Control
              type="number"
              value={form.budget}
              onChange={(e) => setForm((prev) => ({ ...prev, budget: Number(e.target.value) }))}
            />
          </Col>

          <Col md={4}>
            <Form.Label>Type de facturation</Form.Label>
            <InputGroup>
              <Form.Select
                value={form.typeFacturationId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    typeFacturationId: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              >
                <option value="">-- Sélectionner --</option>
                {localTypeFacturations.map((t) => (
                  <option key={t.idTypeFacturation} value={t.idTypeFacturation}>
                    {t.nomTypeFacturation}
                  </option>
                ))}
              </Form.Select>
              <Button variant="outline-primary" onClick={() => setShowFacturationModal(true)}>
                <FaPlus />
              </Button>
            </InputGroup>
          </Col>

          <Col md={4}>
            <Form.Label>Impôts (%)</Form.Label>
            <Form.Control
              type="number"
              value={form.impots}
              onChange={(e) => setForm((prev) => ({ ...prev, impots: Number(e.target.value) }))}
            />
          </Col>

          <Col md={4}>
            <Form.Label>Date d'attribution</Form.Label>
            <Form.Control
              type="date"
              value={form.dateAttribution}
              onChange={(e) => setForm((prev) => ({ ...prev, dateAttribution: e.target.value }))}
            />
          </Col>
        </Row>
      </section>

      {/* ================= Modal création Techno ================= */}
      <Modal show={showTechnoModal} onHide={() => setShowTechnoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer une technologie</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <GenericForm
            valueKey="nomTechno"
            initialData={{ nomTechno: "", descTechno: "" }}
            extraInputs={[{ name: "descTechno", label: "Description", type: "textarea" }]}
            onSubmit={async (data: any) => {
              const newTechno = await technoService.create(data);
              setLocalTechnos((prev) => {
                const uniqueTechs = Array.from(
                  new Map([...prev, newTechno].map((t) => [t.idTechno || t.id, t])).values()
                );
                return uniqueTechs;
              });
              setForm((prev) => ({
                ...prev,
                technos: normalizeTechnos([...prev.technos, newTechno.idTechno || newTechno.id]),
              }));
              setShowTechnoModal(false);
            }}
            onCancel={() => setShowTechnoModal(false)}
            submitLabel="Créer"
            title=""
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default FormTechFin;