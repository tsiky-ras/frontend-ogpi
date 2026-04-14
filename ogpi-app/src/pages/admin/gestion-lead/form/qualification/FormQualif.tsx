import React, { useEffect, useState, useRef } from "react";
import { Form, Row, Col, InputGroup, Button, Modal, ListGroup, Badge } from "react-bootstrap";
import { FaPlus, FaLink, FaTimes, FaSearch } from "react-icons/fa";
import GenericForm from "../../../../../components/form/GenericForm.tsx";
import './FormQualif.css';

type AutocompleteProps = {
  items: any[];
  value: any | null;
  onChange: (item: any | null) => void;
  placeholder?: string;
  labelKey?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
};

const AutocompleteSelect: React.FC<AutocompleteProps> = ({
  items,
  value,
  onChange,
  placeholder = "Rechercher...",
  labelKey = "name",
  onAddNew,
  addNewLabel = "Nouveau",
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value[labelKey] || "");
    else setQuery("");
  }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value) setQuery(value[labelKey] || "");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [value]);

  const filtered = items.filter((item) =>
    (item[labelKey] || "").toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: any) => {
    onChange(item);
    setQuery(item[labelKey] || "");
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="autocomplete-wrapper">
      <InputGroup>
        <span className="input-group-text autocomplete-icon">
          <FaSearch style={{ fontSize: 12, opacity: 0.5 }} />
        </span>
        <Form.Control
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          className="autocomplete-input"
        />
        {value && (
          <Button variant="outline-secondary" onClick={handleClear} tabIndex={-1} className="autocomplete-clear">
            <FaTimes style={{ fontSize: 11 }} />
          </Button>
        )}
        {onAddNew && (
          <Button variant="outline-primary" onClick={onAddNew} title={addNewLabel}>
            <FaPlus style={{ fontSize: 12 }} />
          </Button>
        )}
      </InputGroup>

      {open && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className={`autocomplete-option${value?.id === item.id ? " selected" : ""}`}
              onMouseDown={() => handleSelect(item)}
            >
              {item[labelKey]}
            </div>
          ))}
          {filtered.length > 8 && (
            <div className="autocomplete-more">
              {filtered.length - 8} autre(s) — affinez votre recherche
            </div>
          )}
        </div>
      )}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="autocomplete-dropdown">
          <div className="autocomplete-empty">Aucun résultat pour « {query} »</div>
        </div>
      )}
    </div>
  );
};

type Props = {
  form: any;
  setForm: React.Dispatch<any>;
  handleChange: (e: any) => void;
  businessUnits: any[];
  typeOpportunites: any[];
  categories: any[];
  secteurs: any[];
  statuts: any[];
  typeFinancements: any[];
  clients: any[];
  clientService: any;
  partenaires: any[];
  partenaireService: any;
};

const FormQualif: React.FC<Props> = ({
  form,
  setForm,
  handleChange,
  businessUnits,
  typeOpportunites,
  categories,
  secteurs,
  statuts,
  typeFinancements,
  clients = [],
  clientService,
  partenaires = [],
  partenaireService,
}) => {
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);
  const [localClients, setLocalClients] = useState<any[]>([]);
  const [localPartenaires, setLocalPartenaires] = useState<any[]>([]);

  useEffect(() => { setLocalClients(clients); }, [clients]);
  useEffect(() => { setLocalPartenaires(partenaires); }, [partenaires]);

  useEffect(() => {
    if (form.partenaires && partenaires.length > 0) {
      const updatedPartenaires = form.partenaires.map((p: any) => {
        if (typeof p === "number" || typeof p === "string") {
          return partenaires.find((part) => part.id === Number(p)) || { id: p };
        }
        return p;
      });
      setForm((prev: any) => ({ ...prev, partenaires: updatedPartenaires }));
    }
  }, [partenaires]);

  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    if (!form.periode) {
      setForm((prev: any) => ({ ...prev, periode: `${now.getFullYear()}-${pad(now.getMonth() + 1)}` }));
    }
    if (!form.businessUnit) {
      const consultingBU = businessUnits.find((bu) => bu.name.toLowerCase() === "consulting");
      if (consultingBU) setForm((prev: any) => ({ ...prev, businessUnit: consultingBU.id }));
    }
    if (!form.dateHeureSoumission) {
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setForm((prev: any) => ({ ...prev, dateHeureSoumission: dateStr }));
    }
    if (!form.internalDeadline) {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      const isoDeadline = `${defaultDeadline.getFullYear()}-${pad(defaultDeadline.getMonth() + 1)}-${pad(defaultDeadline.getDate())}T${pad(defaultDeadline.getHours())}:${pad(defaultDeadline.getMinutes())}`;
      setForm((prev: any) => ({ ...prev, internalDeadline: isoDeadline }));
    }
  }, []);

  const handleAddPartenaire = (partenaire: any) => {
    if (!partenaire) return;
    const isAlreadySelected = form.partenaires?.some(
      (p: any) => (typeof p === "object" ? p.id : p) === partenaire.id
    );
    if (!isAlreadySelected) {
      setForm((prev: any) => ({ ...prev, partenaires: [...(prev.partenaires || []), partenaire] }));
    }
  };

  const handleRemovePartenaire = (partenaireId: number) => {
    const updated = form.partenaires?.filter(
      (p: any) => (typeof p === "object" ? p.id : p) !== partenaireId
    ) || [];
    setForm((prev: any) => ({ ...prev, partenaires: updated }));
  };

  // Partenaires disponibles (non encore sélectionnés) pour l'autocomplete
  const availablePartenaires = localPartenaires.filter(
    (p) => !form.partenaires?.some((sel: any) => (typeof sel === "object" ? sel.id : sel) === p.id)
  );

  return (
    <>
      {/* --- Informations Générales --- */}
      <section className="fiche-section">
        <h4>Informations Générales</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label className="required-asterisk">Période *</Form.Label>
            <Form.Control type="month" name="periode" value={form.periode || ""} onChange={handleChange} />
          </Col>
          <Col md={6}>
            <Form.Label className="required-asterisk">Business Unit *</Form.Label>
            <Form.Select name="businessUnit" value={form.businessUnit || ""} onChange={handleChange}>
              <option value="">-- Sélectionner --</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>{bu.name}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </section>

      {/* --- Détails de l'Opportunité --- */}
      <section className="fiche-section">
        <h4>Détails de l'Opportunité</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label className="required-asterisk">Nom du Lead *</Form.Label>
            <Form.Control name="nom" value={form.nom || ""} onChange={handleChange} />
          </Col>
          <Col md={6}>
            <Form.Label className="required-asterisk">Référence *</Form.Label>
            <Form.Control name="reference" value={form.reference || ""} onChange={handleChange} />
          </Col>
          <Col md={12}>
            <Form.Label className="required-asterisk">Description *</Form.Label>
            <Form.Control as="textarea" rows={3} name="description" value={form.description || ""} onChange={handleChange} />
          </Col>

          {/* Client — autocomplete */}
          <Col md={6}>
            <Form.Label className="required-asterisk">Client *</Form.Label>
            <AutocompleteSelect
              items={localClients}
              value={form.client}
              onChange={(c) => setForm((prev: any) => ({ ...prev, client: c }))}
              placeholder="Rechercher un client..."
              onAddNew={() => setShowClientModal(true)}
              addNewLabel="Créer un client"
            />
          </Col>

          {/* Partenaires — autocomplete + liste des sélectionnés */}
          <Col md={6}>
            <Form.Label>Partenaires eTech</Form.Label>
            <AutocompleteSelect
              items={availablePartenaires}
              value={null}
              onChange={(p) => { if (p) handleAddPartenaire(p); }}
              placeholder="Ajouter un partenaire..."
              onAddNew={() => setShowPartenaireModal(true)}
              addNewLabel="Créer un partenaire"
            />
            {form.partenaires && form.partenaires.length > 0 && (
              <ListGroup className="partenaire-list mt-2">
                {form.partenaires.map((p: any, index: number) => {
                  const partenaire = typeof p === "object" ? p : localPartenaires.find((part) => part.id === p);
                  if (!partenaire) return null;
                  return (
                    <ListGroup.Item key={partenaire.id || index} className="partenaire-list-item">
                      <span>{partenaire.name || `Partenaire #${partenaire.id}`}</span>
                      <button
                        type="button"
                        className="partenaire-remove"
                        onClick={() => handleRemovePartenaire(partenaire.id)}
                        title="Retirer"
                      >
                        <FaTimes style={{ fontSize: 11 }} />
                      </button>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            )}
          </Col>

          <Col md={6}>
            <Form.Label>Date et heure de soumission *</Form.Label>
            <Form.Control type="datetime-local" name="realDeadline" value={form.realDeadline || ""} onChange={handleChange} />
          </Col>

          <Col md={6}>
            <Form.Label>Type de financement *</Form.Label>
            <Form.Select
              name="typeFinancement"
              value={form.typeFinancement?.id || ""}
              onChange={(e) => {
                const selected = typeFinancements.find((t) => t.id === Number(e.target.value)) || null;
                setForm((prev: any) => ({ ...prev, typeFinancement: selected }));
              }}
            >
              <option value="">-- Sélectionner --</option>
              {typeFinancements.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Form.Select>
          </Col>

          <Col md={6}>
            <Form.Label>Nom du Répertoire Drive *</Form.Label>
            <Form.Control name="driveFolderName" value={form.driveFolderName || ""} onChange={handleChange} placeholder="Ex: Projet ABC" />
          </Col>

          <Col md={6}>
            <Form.Label>Lien du Répertoire Drive *</Form.Label>
            <InputGroup>
              <Form.Control name="driveFolderLink" value={form.driveFolderLink || ""} onChange={handleChange} placeholder="https://drive.google.com/..." />
              {form.driveFolderLink && (
                <Button variant="outline-success" href={form.driveFolderLink} target="_blank" title="Ouvrir le répertoire">
                  <FaLink />
                </Button>
              )}
            </InputGroup>
          </Col>

          <Col md={6}>
            <Form.Label>Nom du TDR *</Form.Label>
            <Form.Control name="mainDriveFileName" value={form.mainDriveFileName || ""} onChange={handleChange} />
          </Col>
          <Col md={6}>
            <Form.Label>Lien du TDR *</Form.Label>
            <Form.Control name="mainDriveFileLink" value={form.mainDriveFileLink || ""} onChange={handleChange} />
          </Col>
          <Col md={12}>
            <Form.Label>Description TDR</Form.Label>
            <Form.Control as="textarea" rows={2} name="mainDriveFileDescription" value={form.mainDriveFileDescription || ""} onChange={handleChange} />
          </Col>

          <Col md={12}>
            <Form.Label>Commentaire</Form.Label>
            <Form.Control as="textarea" rows={2} name="commentaire" value={form.commentaire || ""} onChange={handleChange} />
          </Col>
        </Row>
      </section>

      {/* --- Classification --- */}
      <section className="fiche-section">
        <h4>Classification</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Type Opportunité *</Form.Label>
            <Form.Select name="typeOpportunite" value={form.typeOpportunite || ""} onChange={handleChange}>
              <option value="">-- Sélectionner --</option>
              {typeOpportunites.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Catégorie *</Form.Label>
            <Form.Select name="categorie" value={form.categorie || ""} onChange={handleChange}>
              <option value="">-- Sélectionner --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Secteur *</Form.Label>
            <Form.Select name="secteur" value={form.secteur || ""} onChange={handleChange}>
              <option value="">-- Sélectionner --</option>
              {secteurs.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Zone *</Form.Label>
            <Form.Select
              name="zone"
              value={form.zone !== undefined && form.zone !== null ? String(form.zone) : ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev: any) => ({ ...prev, zone: value !== "" ? Number(value) : null }));
              }}
            >
              <option value="">-- Sélectionner --</option>
              <option value="0">Local</option>
              <option value="1">Offshore</option>
            </Form.Select>
          </Col>
        </Row>
      </section>

      {/* --- Modal Client --- */}
      <Modal show={showClientModal} onHide={() => setShowClientModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer un Client</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GenericForm
            valueKey="name"
            initialData={{ name: "", email: "", phone: "" }}
            extraInputs={[
              { name: "email", label: "Email", type: "email" },
              { name: "phone", label: "Téléphone", type: "tel" },
            ]}
            onSubmit={async (data: any) => {
              const newClient = await clientService.create(data);
              setLocalClients((prev) => [...prev, newClient]);
              setForm((prev: any) => ({ ...prev, client: newClient }));
              setShowClientModal(false);
            }}
            onCancel={() => setShowClientModal(false)}
            submitLabel="Créer"
            title=""
          />
        </Modal.Body>
      </Modal>

      {/* --- Modal Partenaire --- */}
      <Modal show={showPartenaireModal} onHide={() => setShowPartenaireModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer un Partenaire</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GenericForm
            valueKey="name"
            initialData={{ name: "", email: "", phone: "" }}
            extraInputs={[
              { name: "email", label: "Email", type: "email" },
              { name: "phone", label: "Téléphone", type: "tel" },
            ]}
            onSubmit={async (data: any) => {
              const newPartenaire = await partenaireService.create(data);
              setLocalPartenaires((prev) => [...prev, newPartenaire]);
              setForm((prev: any) => ({ ...prev, partenaires: [...(prev.partenaires || []), newPartenaire] }));
              setShowPartenaireModal(false);
            }}
            onCancel={() => setShowPartenaireModal(false)}
            submitLabel="Créer"
            title=""
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default FormQualif;