import React, { useEffect, useState } from "react";
import { Form, Row, Col, InputGroup, Button, Modal, ListGroup, Badge } from "react-bootstrap";
import { FaPlus, FaLink, FaTimes } from "react-icons/fa";
import GenericForm from "../../../../../components/form/GenericForm.tsx";
import './FormQualif.css';

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
  partenaireService
}) => {
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);
  const [localClients, setLocalClients] = useState<any[]>([]);
  const [localPartenaires, setLocalPartenaires] = useState<any[]>([]);
  const [selectedPartenaireId, setSelectedPartenaireId] = useState<string>("");

  // Initialiser les données
  useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  useEffect(() => {
    setLocalPartenaires(partenaires);
  }, [partenaires]);

  // Initialiser le form avec les partenaires s'ils existent
  useEffect(() => {
    if (form.partenaires && partenaires.length > 0) {
      // Assurer que les partenaires sont des objets complets
      const updatedPartenaires = form.partenaires.map((p: any) => {
        if (typeof p === 'number' || typeof p === 'string') {
          return partenaires.find(part => part.id === Number(p)) || { id: p };
        }
        return p;
      });
      setForm(prev => ({ ...prev, partenaires: updatedPartenaires }));
    }
  }, [partenaires]);

  // Valeurs par défaut
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    if (!form.periode) {
      setForm(prev => ({ ...prev, periode: `${now.getFullYear()}-${pad(now.getMonth()+1)}` }));
    }

    if (!form.businessUnit) {
      const consultingBU = businessUnits.find(bu => bu.name.toLowerCase() === "consulting");
      if (consultingBU) setForm(prev => ({ ...prev, businessUnit: consultingBU.id }));
    }

    if (!form.dateHeureSoumission) {
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setForm(prev => ({ ...prev, dateHeureSoumission: dateStr }));
    }

    if (!form.internalDeadline) {
      const defaultDeadline = new Date();
      defaultDeadline.setDate(defaultDeadline.getDate() + 7);
      const isoDeadline = `${defaultDeadline.getFullYear()}-${pad(defaultDeadline.getMonth()+1)}-${pad(defaultDeadline.getDate())}T${pad(defaultDeadline.getHours())}:${pad(defaultDeadline.getMinutes())}`;
      setForm(prev => ({ ...prev, internalDeadline: isoDeadline }));
    }
  }, []);

  // Gestion des partenaires multiples
  const handleAddPartenaire = () => {
    if (!selectedPartenaireId) return;
    
    const selectedPartenaire = localPartenaires.find(p => p.id === Number(selectedPartenaireId));
    if (!selectedPartenaire) return;

    // Vérifier si le partenaire est déjà sélectionné
    const isAlreadySelected = form.partenaires?.some((p: any) => 
      (typeof p === 'object' ? p.id : p) === selectedPartenaire.id
    );

    if (!isAlreadySelected) {
      const updatedPartenaires = [...(form.partenaires || []), selectedPartenaire];
      setForm(prev => ({ ...prev, partenaires: updatedPartenaires }));
    }

    setSelectedPartenaireId("");
  };

  const handleRemovePartenaire = (partenaireId: number) => {
    const updatedPartenaires = form.partenaires?.filter((p: any) => 
      (typeof p === 'object' ? p.id : p) !== partenaireId
    ) || [];
    setForm(prev => ({ ...prev, partenaires: updatedPartenaires }));
  };

  return (
    <>
      {/* --- Informations Générales --- */}
      <section className="fiche-section">
        <h4>Informations Générales</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label className="required-asterisk">Période *</Form.Label>
            <Form.Control 
              type="month" 
              name="periode"
              value={form.periode || ""}
              onChange={handleChange} 
            />
          </Col>
          <Col md={6}>
            <Form.Label className="required-asterisk">Business Unit *</Form.Label>
            <Form.Select
              name="businessUnit"
              value={form.businessUnit || ""}
              onChange={handleChange}
            >
              <option value="">-- Sélectionner --</option>
              {businessUnits.map(bu => (
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
          {/* Nom / Référence / Description */}
          <Col md={6}>
            <Form.Label className="required-asterisk">Nom du Lead *</Form.Label>
            <Form.Control
              name="nom"
              value={form.nom || ""}
              onChange={handleChange}
            />
          </Col>
          <Col md={6}>
            <Form.Label className="required-asterisk">Référence *</Form.Label>
            <Form.Control
              name="reference"
              value={form.reference || ""}
              onChange={handleChange}
            />
          </Col>
          <Col md={12}>
            <Form.Label className="required-asterisk">Description *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={form.description || ""}
              onChange={handleChange}
            />
          </Col>

          {/* Client */}
          <Col md={6}>
            <Form.Label className="required-asterisk">Client *</Form.Label>
            <InputGroup>
              <Form.Select
                name="client"
                value={form.client?.id || ""}
                onChange={e => {
                  const selectedClient = localClients.find(c => c.id === Number(e.target.value)) || null;
                  setForm(prev => ({ ...prev, client: selectedClient }));
                }}
              >
                <option value="">-- Sélectionner --</option>
                {localClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Form.Select>
              <Button variant="outline-primary" onClick={() => setShowClientModal(true)}>
                <FaPlus />
              </Button>
            </InputGroup>
          </Col>

          {/* Partenaires eTech - Version multiple */}
          <Col md={6}>
            <Form.Label>Partenaires eTech</Form.Label>
            <InputGroup>
              <Form.Select
                value={selectedPartenaireId}
                onChange={e => setSelectedPartenaireId(e.target.value)}
              >
                <option value="">-- Sélectionner un partenaire --</option>
                {localPartenaires.map(p => {
                  // Vérifier si le partenaire est déjà sélectionné
                  const isSelected = form.partenaires?.some((part: any) => 
                    (typeof part === 'object' ? part.id : part) === p.id
                  );
                  return !isSelected ? (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ) : null;
                })}
              </Form.Select>
              <Button 
                variant="outline-primary" 
                onClick={handleAddPartenaire}
                disabled={!selectedPartenaireId}
              >
                <FaPlus />
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowPartenaireModal(true)}
              >
                Nouveau
              </Button>
            </InputGroup>

            {/* Liste des partenaires sélectionnés */}
            {(form.partenaires && form.partenaires.length > 0) && (
              <ListGroup className="mt-2">
                {form.partenaires.map((p: any, index: number) => {
                  const partenaire = typeof p === 'object' ? p : localPartenaires.find(part => part.id === p);
                  if (!partenaire) return null;
                  
                  return (
                    <ListGroup.Item 
                      key={partenaire.id || index}
                      className="d-flex justify-content-between align-items-center py-1"
                    >
                      <span>{partenaire.name || `Partenaire #${partenaire.id}`}</span>
                      <Badge 
                        bg="danger" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRemovePartenaire(partenaire.id)}
                      >
                        <FaTimes />
                      </Badge>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            )}
          </Col>

          {/* Deadlines */}
          <Col md={6}>
            <Form.Label>Date et heure de soumission</Form.Label>
            <Form.Control
              type="datetime-local"
              name="realDeadline"
              value={form.realDeadline || ""}
              onChange={handleChange}
            />
          </Col>

          {/* Projets / Type financement */}
          <Col md={6}>
            <Form.Label>Type de financement</Form.Label>
            <Form.Select
              name="typeFinancement"
              value={form.typeFinancement?.id || ""}
              onChange={e => {
                const selected = typeFinancements.find(t => t.id === Number(e.target.value)) || null;
                setForm(prev => ({ ...prev, typeFinancement: selected }));
              }}
            >
              <option value="">-- Sélectionner --</option>
              {typeFinancements.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Form.Select>
          </Col>

          {/* Drive avec nom et lien */}
          <Col md={6}>
            <Form.Label>Nom du Répertoire Drive</Form.Label>
            <Form.Control
              name="driveFolderName"
              value={form.driveFolderName || ""}
              onChange={handleChange}
              placeholder="Ex: Projet ABC"
            />
          </Col>

          <Col md={6}>
            <Form.Label>Lien du Répertoire Drive</Form.Label>
            <InputGroup>
              <Form.Control
                name="driveFolderLink"
                value={form.driveFolderLink || ""}
                onChange={handleChange}
                placeholder="https://drive.google.com/..."
              />
              {form.driveFolderLink && (
                <Button
                  variant="outline-success"
                  href={form.driveFolderLink}
                  target="_blank"
                  title="Ouvrir le répertoire"
                >
                  <FaLink />
                </Button>
              )}
            </InputGroup>
          </Col>

          {/* TDR */}
          <Col md={6}>
            <Form.Label>Nom du TDR</Form.Label>
            <Form.Control
              name="mainDriveFileName"
              value={form.mainDriveFileName || ""}
              onChange={handleChange}
            />
          </Col>
          <Col md={6}>
            <Form.Label>Lien du TDR</Form.Label>
            <Form.Control
              name="mainDriveFileLink"
              value={form.mainDriveFileLink || ""}
              onChange={handleChange}
            />
          </Col>
          <Col md={12}>
            <Form.Label>Description TDR</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="mainDriveFileDescription"
              value={form.mainDriveFileDescription || ""}
              onChange={handleChange}
            />
          </Col>

          {/* Commentaire */}
          <Col md={12}>
            <Form.Label>Commentaire</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="commentaire"
              value={form.commentaire || ""}
              onChange={handleChange}
            />
          </Col>
        </Row>
      </section>

      {/* --- Classification --- */}
      <section className="fiche-section">
        <h4>Classification</h4>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Type Opportunité</Form.Label>
            <Form.Select
              name="typeOpportunite"
              value={form.typeOpportunite || ""}
              onChange={handleChange}
            >
              <option value="">-- Sélectionner --</option>
              {typeOpportunites.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Catégorie</Form.Label>
            <Form.Select
              name="categorie"
              value={form.categorie || ""}
              onChange={handleChange}
            >
              <option value="">-- Sélectionner --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>Secteur</Form.Label>
            <Form.Select
              name="secteur"
              value={form.secteur || ""}
              onChange={handleChange}
            >
              <option value="">-- Sélectionner --</option>
              {secteurs.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Form.Select>
          </Col>

          <Col md={6}>
            <Form.Label>Zone</Form.Label>
            <Form.Select
              name="zone"
              value={form.zone !== undefined && form.zone !== null ? String(form.zone) : ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm(prev => ({
                  ...prev,
                  zone: value !== "" ? Number(value) : null, 
                }));
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
              { name: "phone", label: "Téléphone", type: "tel" }
            ]}
            onSubmit={async (data: any) => {
              const newClient = await clientService.create(data);
              setLocalClients(prev => [...prev, newClient]); 
              setForm(prev => ({ ...prev, client: newClient })); 
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
              { name: "phone", label: "Téléphone", type: "tel" }
            ]}
            onSubmit={async (data: any) => {
              const newPartenaire = await partenaireService.create(data);
              setLocalPartenaires(prev => [...prev, newPartenaire]);
              
              // Ajouter automatiquement le nouveau partenaire à la liste
              const updatedPartenaires = [...(form.partenaires || []), newPartenaire];
              setForm(prev => ({ ...prev, partenaires: updatedPartenaires }));
              
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