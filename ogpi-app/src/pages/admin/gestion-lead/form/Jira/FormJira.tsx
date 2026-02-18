import React, { useEffect, useState, useCallback, useRef } from "react";
import { Table, Form, Button, Spinner } from "react-bootstrap";

type Props = {
  lead: any;
  leadService: any;
  userService: any;
};

const FormJira: React.FC<Props> = ({ lead, leadService, userService }) => {
  const [jira, setJira] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const fetchedRef = useRef(false); // Pour éviter les doubles appels en dev

  const statusId = lead?.currentLeadStatus?.leadStatus?.id;
  const canShow = statusId > 2;

  // Récupérer l'ID du lead une seule fois
  const leadId = lead?.leadId || lead?.id;

  useEffect(() => {
    // Ne pas exécuter si les conditions ne sont pas remplies
    if (!canShow || !leadId || fetchedRef.current) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("Chargement des données JIRA pour leadId:", leadId);
        
        const [jiraData, usersData] = await Promise.all([
          leadService.getJira(leadId),
          userService.getAll(),
        ]);
        
        console.log("Données JIRA reçues:", jiraData);
        console.log("Utilisateurs reçus:", usersData);
        
        setJira(jiraData);
        setUsers(usersData);
        fetchedRef.current = true; // Marquer comme déjà chargé
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        alert("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup si le composant est démonté
    return () => {
      fetchedRef.current = false;
    };
  }, [leadId, canShow]); // Dépendances simplifiées

  const updateTask = useCallback((index: number, field: string, value: any) => {
    setJira((prevJira: any) => {
      if (!prevJira) return prevJira;
      const copy = { ...prevJira };
      if (copy.leadTaskUsers?.[index]) {
        copy.leadTaskUsers[index] = {
          ...copy.leadTaskUsers[index],
          [field]: value
        };
      }
      return copy;
    });
  }, []);

  const updateUser = useCallback((index: number, userId: number) => {
    setJira((prevJira: any) => {
      if (!prevJira) return prevJira;
      const copy = { ...prevJira };
      const selected = users.find((u) => u.id === Number(userId));
      if (copy.leadTaskUsers?.[index]) {
        copy.leadTaskUsers[index] = {
          ...copy.leadTaskUsers[index],
          user: selected
        };
      }
      return copy;
    });
  }, [users]);

  const handleSave = async () => {
    console.log("=== DÉBUT handleSave ===");
    console.log("lead:", lead);
    console.log("leadId calculé:", lead.leadId || lead.id);
    console.log("jira data:", jira);
    
    const leadId = lead.leadId || lead.id;
    
    if (!leadId) {
      console.error("ID du lead manquant");
      alert("ID du lead manquant");
      return;
    }
  
    setSaving(true);
    try {
      console.log("Appel API updateJira avec:", { leadId, jira });
      const result = await leadService.updateJira(leadId, jira);
      console.log("Résultat API:", result);
      alert("JIRA mis à jour !");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la sauvegarde: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
    console.log("=== FIN handleSave ===");
  };

  // Affichage conditionnel
  if (!canShow) return null;
  
  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Chargement des données JIRA...</p>
      </div>
    );
  }

  if (!jira) {
    return (
      <div className="alert alert-warning">
        Aucune donnée JIRA disponible
      </div>
    );
  }

  return (
    <div className="p-3">
      <h5 className="mb-3">Informations JIRA</h5>

      <Form.Group className="mb-3">
        <Form.Label>Projet JIRA</Form.Label>
        <Form.Control
          value={jira.leadGoProjetJira || ""}
          onChange={(e) =>
            setJira({ ...jira, leadGoProjetJira: e.target.value })
          }
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label>Ticket JIRA</Form.Label>
        <Form.Control
          value={jira.leadGoTicketJira || ""}
          onChange={(e) =>
            setJira({ ...jira, leadGoTicketJira: e.target.value })
          }
        />
      </Form.Group>

      <Table bordered striped hover responsive>
        <thead className="table-light">
          <tr>
            <th>Tâche</th>
            <th>Utilisateur</th>
            <th>Deadline</th>
          </tr>
        </thead>
        <tbody>
          {jira.leadTaskUsers?.map((t: any, i: number) => (
            <tr key={t.leadTaskUserId || `task-${i}`}>
              <td>{t.leadTask?.leadTaskName || "Tâche inconnue"}</td>

              <td>
                <Form.Select
                  value={t.user?.id || ""}
                  onChange={(e) => updateUser(i, Number(e.target.value))}
                >
                  <option value="">-- Choisir --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email || "Email inconnu"})
                    </option>
                  ))}
                </Form.Select>
              </td>

              <td>
                <Form.Control
                  type="datetime-local"
                  value={t.leadTaskUserDeadline || ""}
                  onChange={(e) =>
                    updateTask(i, "leadTaskUserDeadline", e.target.value)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex justify-content-end mt-3">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          variant="primary"
        >
          {saving ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Sauvegarde...
            </>
          ) : (
            "Sauvegarder"
          )}
        </Button>
      </div>
    </div>
  );
};

export default FormJira;