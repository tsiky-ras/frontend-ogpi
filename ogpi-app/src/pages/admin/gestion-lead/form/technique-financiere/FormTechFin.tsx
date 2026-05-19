import React, { useEffect, useState, useRef } from "react";
import { Form, Row, Col, InputGroup, Button, Modal } from "react-bootstrap";
import { FaPlus, FaTimes } from "react-icons/fa";
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

  const [showTechnoModal, setShowTechnoModal] = useState(false);
  const [localTechnos, setLocalTechnos] = useState<any[]>([]);
  const [localDevises, setLocalDevises] = useState<any[]>([]);
  const [localTypeFacturations, setLocalTypeFacturations] = useState<any[]>([]);

  // Autocomplete techno
  const [technoSearch, setTechnoSearch] = useState("");
  const [showTechnoDropdown, setShowTechnoDropdown] = useState(false);
  const technoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uniqueTechnos = Array.from(new Map(technos.map((t) => [t.idTechno || t.id, t])).values());
    setLocalTechnos(uniqueTechnos);
  }, [technos]);

  useEffect(() => setLocalDevises(devises), [devises]);
  useEffect(() => setLocalTypeFacturations(typeFacturations), [typeFacturations]);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (technoRef.current && !technoRef.current.contains(e.target as Node)) {
        setShowTechnoDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fix taux de change à 1 si devise MGA
  useEffect(() => {
    if (!form.deviseId) return;
    const selectedDevise = localDevises.find((d) => String(d.idDevise) === String(form.deviseId));
    if (selectedDevise?.abrDevise === "MGA") {
      setForm((prev: any) => ({ ...prev, tauxDeChange: 1 }));
    }
  }, [form.deviseId, localDevises]);

  const isMGA = () => {
    const selectedDevise = localDevises.find((d) => String(d.idDevise) === String(form.deviseId));
    return selectedDevise?.abrDevise === "MGA";
  };

  // Champs saisissables + calculs dérivés
  const montantOffre = form.montantOffre ?? form.budget ?? 0;
  const montantChargeAnnexe = form.montantChargeAnnexe ?? 0;
  const montantAvecChargeAnnexe = montantOffre + montantChargeAnnexe;  // toujours calculé
  const tauxDeChange = form.tauxDeChange || 1;
  const impots = form.impots || 0;

  const caAvecTaux = montantAvecChargeAnnexe * tauxDeChange;
  const impotsAmount = caAvecTaux * (impots / 100);

  const selectedTechnoIds = normalizeTechnos(form.technos);
  const selectedTechnos = localTechnos.filter((t) => selectedTechnoIds.includes(Number(t.idTechno || t.id)));

  const filteredTechnos = localTechnos.filter((t) => {
    const id = Number(t.idTechno || t.id);
    const matchesSearch = t.nomTechno?.toLowerCase().includes(technoSearch.toLowerCase());
    const notSelected = !selectedTechnoIds.includes(id);
    return matchesSearch && notSelected;
  });

  const addTechno = (techno: any) => {
    const id = Number(techno.idTechno || techno.id);
    const currentIds = normalizeTechnos(form.technos);
    if (!currentIds.includes(id)) {
      setForm((prev: any) => ({ ...prev, technos: [...currentIds, id] }));
    }
    setTechnoSearch("");
    setShowTechnoDropdown(false);
  };

  const removeTechno = (id: number) => {
    const currentIds = normalizeTechnos(form.technos);
    setForm((prev: any) => ({ ...prev, technos: currentIds.filter((t) => t !== id) }));
  };

  const formatNumber = (val: number) =>
    val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      {/* ===== Technologies ===== */}
      <section className="fiche-section mb-4">
        <h4>Technologies</h4>
        <Row className="g-3">
          <Col md={8}>
            <Form.Label>Technologies utilisées</Form.Label>

            {/* Tags sélectionnés */}
            <div className="d-flex flex-wrap gap-2 mb-2">
              {selectedTechnos.map((t) => {
                const id = Number(t.idTechno || t.id);
                return (
                  <span
                    key={id}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--color-background-info)",
                      color: "var(--color-text-info)",
                      border: "0.5px solid var(--color-border-info)",
                      borderRadius: "var(--border-radius-md)",
                      padding: "4px 10px",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {t.nomTechno}
                    <button
                      type="button"
                      onClick={() => removeTechno(id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-info)",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: 11,
                      }}
                      aria-label={`Retirer ${t.nomTechno}`}
                    >
                      <FaTimes />
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Autocomplete */}
            <div ref={technoRef} style={{ position: "relative" }}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Rechercher une technologie..."
                  value={technoSearch}
                  onChange={(e) => {
                    setTechnoSearch(e.target.value);
                    setShowTechnoDropdown(true);
                  }}
                  onFocus={() => setShowTechnoDropdown(true)}
                />
                <Button variant="outline-primary" onClick={() => setShowTechnoModal(true)}>
                  <FaPlus /> Nouvelle
                </Button>
              </InputGroup>

              {showTechnoDropdown && filteredTechnos.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "var(--color-background-primary)",
                    border: "0.5px solid var(--color-border-secondary)",
                    borderRadius: "var(--border-radius-md)",
                    zIndex: 1000,
                    maxHeight: 200,
                    overflowY: "auto",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                >
                  {filteredTechnos.map((t) => (
                    <div
                      key={t.idTechno || t.id}
                      onMouseDown={() => addTechno(t)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: 14,
                        color: "var(--color-text-primary)",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {t.nomTechno}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Col>
        </Row>
      </section>

      {/* ===== Paramètres de l'offre ===== */}
      <section className="fiche-section mb-4">
        <h4>Paramètres de l'offre</h4>
        <Row className="g-3">
          <Col md={4}>
            <Form.Label>Devise</Form.Label>
            <InputGroup>
              <Form.Select
                value={form.deviseId}
                onChange={(e) =>
                  setForm((prev: any) => ({
                    ...prev,
                    deviseId: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              >
                <option value="">-- Sélectionner --</option>
                {localDevises.map((d) => (
                  <option key={d.idDevise} value={d.idDevise}>
                    {d.abrDevise} — {d.nomDevise}
                  </option>
                ))}
              </Form.Select>
              {form.deviseId && (() => {
                const sel = localDevises.find((d) => String(d.idDevise) === String(form.deviseId));
                return sel ? (
                  <Form.Control
                    type="text"
                    readOnly
                    value={sel.abrDevise}
                    style={{ maxWidth: 56, textAlign: 'center', fontWeight: 700, background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)' }}
                  />
                ) : null;
              })()}
            </InputGroup>
          </Col>

          <Col md={4}>
            <Form.Label>Taux de change</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={form.tauxDeChange}
              readOnly={isMGA()}
              disabled={isMGA()}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, tauxDeChange: Number(e.target.value) }))
              }
            />
            {isMGA() && (
              <Form.Text className="text-muted">Fixé à 1 pour la devise MGA</Form.Text>
            )}
          </Col>

          <Col md={4}>
            <Form.Label>Type de facturation</Form.Label>
            <InputGroup>
              <Form.Select
                value={form.typeFacturationId}
                onChange={(e) =>
                  setForm((prev: any) => ({
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
            </InputGroup>
          </Col>

          <Col md={4}>
            <Form.Label>Impôts (%)</Form.Label>
            <Form.Control
              type="number"
              value={form.impots}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, impots: Number(e.target.value) }))
              }
            />
          </Col>

          <Col md={4}>
            <Form.Label>Date d'attribution</Form.Label>
            <Form.Control
              type="date"
              value={form.dateAttribution}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, dateAttribution: e.target.value }))
              }
            />
          </Col>
        </Row>
      </section>

      {/* ===== Synthèse financière ===== */}
      <section className="fiche-section mb-4">
        <h4>Synthèse financière</h4>
        <Row className="g-3">
          <Col md={4}>
            <Form.Label>Montant de l'offre sans charges annexes</Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={montantOffre}
                onChange={(e) =>
                  setForm((prev: any) => ({
                    ...prev,
                    montantOffre: Number(e.target.value),
                    budget: Number(e.target.value),
                  }))
                }
              />
              {form.deviseId && (() => {
                const sel = localDevises.find((d) => String(d.idDevise) === String(form.deviseId));
                return sel ? (
                  <InputGroup.Text style={{ fontWeight: 700, minWidth: 48, justifyContent: 'center' }}>
                    {sel.abrDevise}
                  </InputGroup.Text>
                ) : null;
              })()}
            </InputGroup>
          </Col>

          <Col md={4}>
            <Form.Label>Montant charges annexes</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={montantChargeAnnexe}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, montantChargeAnnexe: Number(e.target.value) }))
              }
            />
          </Col>

          <Col md={4}>
            <Form.Label>Volume JH vendu</Form.Label>
            <Form.Control
              type="number"
              step="0.5"
              min="0"
              value={form.volumeJHVendu || 0}
              onChange={(e) =>
                setForm((prev: any) => ({ ...prev, volumeJHVendu: Number(e.target.value) }))
              }
            />
          </Col>

          <Col md={4}>
            <Form.Label>CA (offre + charges annexes)</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={formatNumber(montantAvecChargeAnnexe)}
              style={{ background: "var(--color-background-secondary)", fontWeight: 500 }}
            />
          </Col>

          <Col md={4}>
            <Form.Label>CA × taux de change (MGA)</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={formatNumber(caAvecTaux)}
              style={{ background: "var(--color-background-secondary)", fontWeight: 500 }}
            />
          </Col>

          <Col md={4}>
            <Form.Label>Impôts ({impots}% du CA converti)</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={formatNumber(impotsAmount)}
              style={{ background: "var(--color-background-secondary)", fontWeight: 500 }}
            />
          </Col>
        </Row>
      </section>

      {/* ===== Modal création Techno ===== */}
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
              setForm((prev: any) => ({
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