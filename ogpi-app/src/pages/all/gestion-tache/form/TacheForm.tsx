import React, { useState, useMemo } from "react";
import { Modal, Form, Button, ListGroup } from "react-bootstrap";
import { TacheStatus } from "../status/TacheStatusForm.tsx";
import "./TacheForm.css";

interface TacheFormProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (tache: {
    titre: string;
    statut: TacheStatus;
    description?: string;
    responsable?: string;
    type?: "LEAD" | "PROJET";
    linkedId?: number;
    linkedName?: string;
  }) => void;

  leads?: { id: number; name: string }[];
  projets?: { id: number; name: string }[];
  users?: { id: number; name: string }[]; 
}
// Données mockup pour tester le formulaire
export const mockUsers = [
  { id: 1, name: "Tsiky Nomena" },
  { id: 2, name: "Marie Claire" },
  { id: 3, name: "John Doe" },
  { id: 4, name: "Alice Dupont" },
  { id: 5, name: "Bob Martin" },
];

export const mockLeads = [
  { id: 1, name: "Opportunité ABC Corp" },
  { id: 2, name: "Lead Solution Tech" },
  { id: 3, name: "Opportunité E-commerce X" },
  { id: 4, name: "Lead Marketing Y" },
  { id: 5, name: "Opportunité Finance Z" },
];

export const mockProjets = [
  { id: 10, name: "Projet Digital XYZ" },
  { id: 11, name: "Projet Infrastructure A" },
  { id: 12, name: "Projet Mobile App B" },
  { id: 13, name: "Projet Web C" },
  { id: 14, name: "Projet IoT D" },
];

const TacheForm: React.FC<TacheFormProps> = ({
  show,
  onHide,
  onSubmit,
  leads = mockLeads,   // <-- par défaut on utilise les mockups
  projets = mockProjets, // <-- par défaut on utilise les mockups
  users = mockUsers,     // <-- par défaut on utilise les mockups
}) => {
  const [titre, setTitre] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [statut, setStatut] = useState<TacheStatus>("À faire");
  const [description, setDescription] = useState("");

  // Responsable
  const [responsableName, setResponsableName] = useState("");
  const [responsableId, setResponsableId] = useState<number | undefined>();
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  // Lead / Projet lié
  const [linkedName, setLinkedName] = useState("");
  const [linkedId, setLinkedId] = useState<number | undefined>();
  const [type, setType] = useState<"LEAD" | "PROJET" | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Suggestions pour lead/projet
  const suggestions = useMemo(() => {
    const allItems = [
      ...leads.map((l) => ({ ...l, type: "LEAD" as const })),
      ...projets.map((p) => ({ ...p, type: "PROJET" as const })),
    ];
    if (!linkedName) return [];
    return allItems.filter((item) =>
      item.name.toLowerCase().includes(linkedName.toLowerCase())
    );
  }, [linkedName, leads, projets]);

  const handleSelectSuggestion = (item: { id: number; name: string; type: "LEAD" | "PROJET" }) => {
    setLinkedId(item.id);
    setLinkedName(item.name);
    setType(item.type);
    setShowSuggestions(false);
  };

  // Suggestions pour responsable
  const userSuggestions = useMemo(() => {
    if (!responsableName) return [];
    return users.filter((u) =>
      u.name.toLowerCase().includes(responsableName.toLowerCase())
    );
  }, [responsableName, users]);

  const handleSelectUser = (user: { id: number; name: string }) => {
    setResponsableId(user.id);
    setResponsableName(user.name);
    setShowUserSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!titre.trim()) {
      setFormError("Le titre de la tâche est obligatoire.");
      return;
    }

    onSubmit({
      titre: titre.trim(),
      statut,
      description: description.trim() || undefined,
      responsable: responsableName || undefined,
      type,
      linkedId,
      linkedName: linkedName || undefined,
    });

    // Reset form
    setTitre("");
    setStatut("À faire");
    setDescription("");
    setResponsableName("");
    setResponsableId(undefined);
    setLinkedName("");
    setLinkedId(undefined);
    setType(undefined);
  };

  const handleClose = () => {
    setTitre("");
    setStatut("À faire");
    setDescription("");
    setFormError(null);
    setResponsableName("");
    setResponsableId(undefined);
    setLinkedName("");
    setLinkedId(undefined);
    setType(undefined);
    setShowSuggestions(false);
    setShowUserSuggestions(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton className="tache-modal-header">
        <Modal.Title>Créer une nouvelle tâche</Modal.Title>
      </Modal.Header>

      <Modal.Body className="tache-modal-body">
        <Form onSubmit={handleSubmit}>
          {formError && (
            <div style={{ padding: '8px 12px', marginBottom: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#C93C29', fontSize: '0.9rem' }}>
              {formError}
            </div>
          )}
          {/* Lead / Projet lié */}
          <Form.Group className="mb-4 position-relative">
            <Form.Label className="form-label-custom">Opportunité / Projet lié</Form.Label>
            <Form.Control
              type="text"
              placeholder="Recherchez un lead ou projet..."
              value={linkedName}
              onChange={(e) => {
                setLinkedName(e.target.value);
                setShowSuggestions(true);
                setLinkedId(undefined);
                setType(undefined);
              }}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ListGroup className="autocomplete-suggestions position-absolute w-100 zindex-tooltip">
                {suggestions.map((item) => (
                  <ListGroup.Item
                    key={`${item.type}-${item.id}`}
                    action
                    onClick={() => handleSelectSuggestion(item)}
                  >
                    {item.type === "LEAD" ? "Opportunité" : "Projet"}: {item.name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Form.Group>

          {/* Titre */}
          <Form.Group className="mb-4">
            <Form.Label className="form-label-custom">
              Titre de la tâche <span className="required">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Ex: Préparer le devis"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-4">
            <Form.Label className="form-label-custom">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>

          {/* Responsable */}
          <Form.Group className="mb-4 position-relative">
            <Form.Label className="form-label-custom">Responsable</Form.Label>
            <Form.Control
              type="text"
              placeholder="Recherchez une personne..."
              value={responsableName}
              onChange={(e) => {
                setResponsableName(e.target.value);
                setShowUserSuggestions(true);
                setResponsableId(undefined);
              }}
              autoComplete="off"
            />
            {showUserSuggestions && userSuggestions.length > 0 && (
              <ListGroup className="autocomplete-suggestions position-absolute w-100 zindex-tooltip">
                {userSuggestions.map((u) => (
                  <ListGroup.Item
                    key={u.id}
                    action
                    onClick={() => handleSelectUser(u)}
                  >
                    {u.name}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Form.Group>

          {/* Statut */}
          <Form.Group className="mb-4">
            <Form.Label className="form-label-custom">Statut initial</Form.Label>
            <div className="status-radio-group">
              {(["À faire", "En cours", "Terminé"] as TacheStatus[]).map((s) => (
                <Form.Check
                  key={s}
                  type="radio"
                  id={`status-${s}`}
                  label={s}
                  name="statut"
                  checked={statut === s}
                  onChange={() => setStatut(s)}
                />
              ))}
            </div>
          </Form.Group>

          {/* Boutons */}
          <div className="form-actions">
            <Button variant="secondary" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" className="btn-submit">
              Créer la tâche
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};
export default TacheForm;
