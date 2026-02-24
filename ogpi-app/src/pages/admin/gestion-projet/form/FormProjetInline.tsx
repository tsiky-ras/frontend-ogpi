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

  const [form, setForm] = useState<Projet>(buildFormFromLead());
  const [users, setUsers] = useState<any[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<any[]>([]);
  const [existingProjets, setExistingProjets] = useState<any[]>([]);

  // ── Chargement des données
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
        // Récupérer les projets liés à ce lead
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

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildProjetPayload = (): any => ({
    ...form,
    lead: fullLead?.leadId ? { leadId: fullLead.leadId } : null,
    userCp: form.userCp || null,
    userSuppleante: form.userSuppleante || null,
    typeFacturation:
      form.typeFacturation || { idTypeFacturation: 1, libelle: "Interne" },
  });

  const handleSave = async () => {
    if (!form.nomProjet || !form.dateDebutPrevu) {
      onError("Nom projet et date début obligatoires");
      return;
    }

    onLoading(true);
    try {
      const payload = buildProjetPayload();
      const savedProjet = await projetService.create(payload);
      setExistingProjets([savedProjet]);
      onSuccess(savedProjet);
    } catch (err: any) {
      onError(err.message || "Erreur projet");
    } finally {
      onLoading(false);
    }
  };

  // ── Si un projet existe déjà pour ce lead, ne plus afficher dans la recherche
  if (existingProjets.length > 0) {
    const p = existingProjets[0];
    return (
      <div>
        <Alert variant="info">
          Un projet est déjà lié à cette opportunité :{" "}
          <strong className="ms-2">{p.nomProjet}</strong> ({p.refBC || "—"})
        </Alert>
      </div>
    );
  }

  // ── Formulaire de création si aucun projet lié
  return (
    <div>
      <Alert variant="success">
        Nouveau projet depuis {fullLead?.leadRef} – {fullLead?.leadName}
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
              <Form.Control
                type="date"
                name="dateAttribution"
                value={form.dateAttribution}
                onChange={handleChange}
              />
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
                  const user = users.find((u) => u.userId === Number(e.target.value)) || null;
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

            <Form.Group className="mb-3">
              <Form.Label>Type de facturation</Form.Label>
              <Form.Select
                value={form.typeFacturation?.idTypeFacturation || ""}
                onChange={(e) => {
                  const type = typeFacturations.find(
                    (t) => t.idTypeFacturation === Number(e.target.value)
                  );
                  setForm((p) => ({ ...p, typeFacturation: type }));
                }}
              >
                {typeFacturations.map((t) => (
                  <option key={t.idTypeFacturation} value={t.idTypeFacturation}>
                    {t.nomTypeFacturation}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Date début *</Form.Label>
              <Form.Control
                type="date"
                name="dateDebutPrevu"
                value={form.dateDebutPrevu}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Date fin</Form.Label>
              <Form.Control
                type="date"
                name="dateFinPrevu"
                value={form.dateFinPrevu}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ref BC</Form.Label>
              <Form.Control name="refBC" value={form.refBC} onChange={handleChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Suppléant(e)</Form.Label>
              <Form.Select
                name="userSuppleante"
                value={form.userSuppleante?.userId || ""}
                onChange={(e) => {
                  const user = users.find((u) => u.userId === Number(e.target.value)) || null;
                  setForm((prev) => ({ ...prev, userSuppleante: user }));
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

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </Form.Group>
          </Col>
        </Row>
      </Form>

      <div className="d-flex gap-2 mt-2">
        <Button onClick={handleSave}>Créer</Button>
      </div>
    </div>
  );
};

export default FormProjetInline;