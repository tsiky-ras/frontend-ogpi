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
  /* ================= Technologies ================= */
  const [showTechnoModal, setShowTechnoModal] = useState(false);
  const [localTechnos, setLocalTechnos] = useState<any[]>([]);

  useEffect(() => {
    setLocalTechnos(technos);
  }, [technos]);

  /* ================= Devises ================= */
  const [showDeviseModal, setShowDeviseModal] = useState(false);
  const [localDevises, setLocalDevises] = useState<any[]>([]);

  useEffect(() => {
    setLocalDevises(devises);
  }, [devises]);

  /* ================= Type Facturation ================= */
  const [showFacturationModal, setShowFacturationModal] = useState(false);
  const [localTypeFacturations, setLocalTypeFacturations] = useState<any[]>([]);

  useEffect(() => {
    setLocalTypeFacturations(typeFacturations);
  }, [typeFacturations]);
  
  useEffect(() => {
    console.log("=== DEBUG FormTechFin ===");
    console.log("form.technos:", form.technos);
    console.log("Type:", typeof form.technos, "IsArray:", Array.isArray(form.technos));
    if (Array.isArray(form.technos)) {
      console.log("Premier élément:", form.technos[0]);
    }
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
                // Normaliser form.technos pour toujours avoir un tableau d'IDs
                const technosIds = Array.isArray(form.technos)
                  ? form.technos.map((item: any) => {
                      if (typeof item === 'object' && item !== null) {
                        return item.idTechno || item.id;
                      }
                      return item;
                    }).filter((id: any) => id != null && !isNaN(Number(id)))
                  : [];

                const isChecked = technosIds.includes(Number(t.idTechno));

                return (
                  <Form.Check
                    key={t.idTechno}
                    type="checkbox"
                    id={`techno-${t.idTechno}`}
                    label={t.nomTechno}
                    checked={isChecked}
                    onChange={(e) => {
                      setForm((prev: any) => {
                        // Normaliser prev.technos
                        const currentIds = Array.isArray(prev.technos)
                          ? prev.technos.map((item: any) => {
                              if (typeof item === 'object' && item !== null) {
                                return Number(item.idTechno || item.id);
                              }
                              return Number(item);
                            }).filter((id: any) => !isNaN(id))
                          : [];

                        const newTechnos = e.target.checked
                          ? [...currentIds, Number(t.idTechno)]
                          : currentIds.filter((id: number) => id !== Number(t.idTechno));

                        return {
                          ...prev,
                          technos: newTechnos,
                        };
                      });
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

      {/* ================= Financier ================= */}
      <section className="fiche-section">
        <h4>Données financières</h4>

        <Row className="g-3">
          <Col md={4}>
            <Form.Label>Volume JH vendu</Form.Label>
            <Form.Control
              type="number"
              value={form.volumeJHVendu}
              onChange={(e) =>
                setForm((prev: any) => ({
                  ...prev,
                  volumeJHVendu: Number(e.target.value),
                }))
              }
            />
          </Col>

          {/* ================= DEVISE ================= */}
          <Col md={4}>
            <Form.Label>Devise</Form.Label>
            <InputGroup>
              <Form.Select
                value={form.deviseId}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev: any) => ({
                    ...prev,
                    deviseId: value === "" ? "" : Number(value),
                  }))
                }}
              >
                <option value="">-- Sélectionner --</option>
                {localDevises.map((d) => (
                  <option key={d.idDevise} value={d.idDevise}>
                    {d.abrDevise}
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="outline-primary"
                onClick={() => setShowDeviseModal(true)}
              >
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
              onChange={(e) =>
                setForm((prev: any) => ({
                  ...prev,
                  tauxDeChange: Number(e.target.value),
                }))
              }
            />
          </Col>

          <Col md={4}>
            <Form.Label>Budget nécessaire</Form.Label>
            <Form.Control
              type="number"
              value={form.budget}
              onChange={(e) =>
                setForm((prev: any) => ({
                  ...prev,
                  budget: Number(e.target.value),
                }))
              }
            />
          </Col>

        {/* ================= TYPE FACTURATION ================= */}
        <Col md={4}>
          <Form.Label>Type de facturation</Form.Label>
          <InputGroup>
            <Form.Select
              value={form.typeFacturationId}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev: any) => ({
                  ...prev,
                  typeFacturationId: value === "" ? "" : Number(value),
                }))
              }}
            >
              <option value="">-- Sélectionner --</option>
              {localTypeFacturations.map((t) => (
                <option key={t.idTypeFacturation} value={t.idTypeFacturation}>
                  {t.nomTypeFacturation}
                </option>
              ))}
            </Form.Select>

            <Button
              variant="outline-primary"
              onClick={() => setShowFacturationModal(true)}
            >
              <FaPlus />
            </Button>
          </InputGroup>
        </Col>
          <Col md={4}>
            <Form.Label>Impôts (%)</Form.Label>
            <Form.Control
              type="number"
              value={form.impots}
              onChange={(e) =>
                setForm((prev: any) => ({
                  ...prev,
                  impots: Number(e.target.value),
                }))
              }
            />
          </Col>

          <Col md={4}>
            <Form.Label>Date d'attribution</Form.Label>
            <Form.Control
              type="date"
              value={form.dateAttribution}
              onChange={(e) =>
                setForm((prev: any) => ({
                  ...prev,
                  dateAttribution: e.target.value,
                }))
              }
            />
          </Col>
        </Row>
      </section>

      {/* ================= Modal création Techno ================= */}
      <Modal
        show={showTechnoModal}
        onHide={() => setShowTechnoModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Créer une technologie</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <GenericForm
            valueKey="nomTechno"
            initialData={{ nomTechno: "", descTechno: "" }}
            extraInputs={[
              {
                name: "descTechno",
                label: "Description",
                type: "textarea",
              },
            ]}
            onSubmit={async (data: any) => {
              const newTechno = await technoService.create(data);
              setLocalTechnos((prev) => [...prev, newTechno]);
              setForm((prev: any) => ({
                ...prev,
                technos: [...(prev.technos || []), newTechno.idTechno || newTechno.id],
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