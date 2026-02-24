import React, { useEffect, useState } from "react";
import { Button, Form, Row, Col, Alert } from "react-bootstrap";
import { Projet } from "../../../../types/projet/Projet.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { ProjetService } from "../../../../services/projet/ProjetService.tsx";
import { useTypeFacturationService } from "../../../../services/lead/tech-fin/TypeFacturationService.tsx";
import { useUserService } from "../../../../services/user/UserService.tsx";
import { useFullLead } from "../../../../services/lead/LeadFullLoader.tsx";

type FormProjetInlineProps = {
  lead: any;
  onSuccess: (projet: Projet) => void;
  onError: (message: string) => void;
  onLoading: (loading: boolean) => void;
};

const FormProjetInline: React.FC<FormProjetInlineProps> = ({
  lead,
  onSuccess,
  onError,
  onLoading,
}) => {
  const { api } = useAuth();
  const projetService = new ProjetService(api);
  const userService = useUserService();
  const typeFactService = useTypeFacturationService();

  const fullLead = useFullLead(lead?.leadId || lead?.id) || lead;

  const [form, setForm] = useState<Projet>({
    nomProjet: "",
    dateAttribution: "",
    dateDebutPrevu: "",
    dateFinPrevu: "",
    refBC: "",
    refCompte: "",
    statutProduction: "",
    userCp: null,
    userSuppleante: null,
    typeFacturation: { idTypeFacturation: 1, libelle: "Interne" },
    description: "",
  });

  const [users, setUsers] = useState<any[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<any[]>([]);
  const [existingProjets, setExistingProjets] = useState<any[]>([]);
  const [editingProjet, setEditingProjet] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Load users + fact + projets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userList, factList] = await Promise.all([
          userService.getAll(),
          typeFactService.getAll(),
        ]);
        setUsers(userList || []);
        setTypeFacturations(factList || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchExistingProjets = async () => {
      try {
        const leadId = fullLead?.leadId || fullLead?.id;
        if (!leadId) return;
        const allProjets = await projetService.getAll();
        const filtered = (allProjets || []).filter(
          (p: any) => p.lead?.leadId === leadId || p.lead?.id === leadId
        );
        setExistingProjets(filtered);
      } catch (err) {
        console.error("Erreur chargement projets", err);
      }
    };

    fetchData();
    fetchExistingProjets();
  }, [fullLead]);

  // Pré-remplissage
  const buildFormFromLead = (): Projet => ({
    nomProjet: fullLead?.leadName || "",
    dateAttribution: fullLead?.dateAttribution?.substring(0, 10) || "",
    dateDebutPrevu: "",
    dateFinPrevu: "",
    refBC: fullLead?.leadRef || "",
    refCompte: fullLead?.refCompte || "",
    statutProduction: "",
    userCp: fullLead?.responsable || null,
    userSuppleante: null,
    typeFacturation:
      fullLead?.typeFacturation || { idTypeFacturation: 1, libelle: "Interne" },
    description: fullLead?.leadDescription || "",
  });

  const handleNewProjet = () => {
    setEditingProjet(null);
    setForm(buildFormFromLead());
    setShowForm(true);
  };

  const handleEditProjet = (projet: any) => {
    setEditingProjet(projet);
    setForm({ ...projet });
    setShowForm(true);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // SAVE
  const handleSave = async () => {
    if (!form.nomProjet || !form.dateDebutPrevu) {
      onError("Nom projet et date début obligatoires");
      return;
    }

    onLoading(true);
    try {
      const leadId = fullLead?.leadId || fullLead?.id;
      const payload = { ...form, lead: { leadId } };

      let savedProjet;
      if (editingProjet?.idProjet) {
        savedProjet = await projetService.update(editingProjet.idProjet, payload);
        setExistingProjets((prev) =>
          prev.map((p) => (p.idProjet === editingProjet.idProjet ? savedProjet : p))
        );
      } else {
        savedProjet = await projetService.create(payload);
        setExistingProjets((prev) => [...prev, savedProjet]);
      }

      onSuccess(savedProjet);
      setShowForm(false);
      setEditingProjet(null);
    } catch (err: any) {
      onError(err.message || "Erreur projet");
    } finally {
      onLoading(false);
    }
  };

  return (
    <div>
      {/* Liste projets existants */}
      {existingProjets.length > 0 && (
        <div className="mb-4">
          <h6 className="text-muted">Projets liés</h6>
          <div className="list-group">
            {existingProjets.map((p) => (
              <div key={p.idProjet} className="list-group-item d-flex justify-content-between">
                <div>
                  <strong>{p.nomProjet}</strong>
                  <small className="ms-2 text-muted">
                    {p.dateDebutPrevu} → {p.dateFinPrevu || "—"}
                  </small>
                </div>
                <Button size="sm" variant="outline-primary" onClick={() => handleEditProjet(p)}>
                  Modifier
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showForm && (
        <Button variant="success" onClick={handleNewProjet}>
          + Créer un projet depuis le lead
        </Button>
      )}

      {showForm && (
        <>
          <Alert variant={editingProjet ? "info" : "success"}>
            {editingProjet
              ? `Modification : ${editingProjet.nomProjet}`
              : `Nouveau projet depuis ${fullLead?.leadRef} – ${fullLead?.leadName}`}
          </Alert>

          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom du projet *</Form.Label>
                  <Form.Control name="nomProjet" value={form.nomProjet} onChange={handleChange} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Date attribution</Form.Label>
                  <Form.Control type="date" name="dateAttribution" value={form.dateAttribution} onChange={handleChange} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Ref Compte</Form.Label>
                  <Form.Control name="refCompte" value={form.refCompte} onChange={handleChange} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Chef de projet</Form.Label>
                  <Form.Select
                    value={form.userCp?.userId || ""}
                    onChange={(e) => {
                      const user = users.find((u) => u.userId === Number(e.target.value));
                      setForm((p) => ({ ...p, userCp: user }));
                    }}
                  >
                    <option value="">Sélectionnez</option>
                    {users.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.nom} {u.username}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date début *</Form.Label>
                  <Form.Control type="date" name="dateDebutPrevu" value={form.dateDebutPrevu} onChange={handleChange} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Date fin</Form.Label>
                  <Form.Control type="date" name="dateFinPrevu" value={form.dateFinPrevu} onChange={handleChange} />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control as="textarea" rows={4} name="description" value={form.description} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
          </Form>

          <div className="d-flex gap-2 mt-2">
            <Button onClick={handleSave}>{editingProjet ? "Modifier" : "Créer"}</Button>
            <Button variant="outline-secondary" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default FormProjetInline;