import React, { useEffect, useState, useCallback, useRef } from "react";
import { Table, Form, Spinner } from "react-bootstrap";

type Props = {
  lead: any;
  leadService: any;
  userService: any;
  onDataReady?: (data: any) => void; // Remonte les données vers le parent
};

const FormJira: React.FC<Props> = ({ lead, leadService, userService, onDataReady }) => {
  const [jira, setJira] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchedRef = useRef(false);

  const statusId = lead?.currentLeadStatus?.leadStatus?.id;
  const canShow = statusId > 2;
  const leadId = lead?.leadId || lead?.id;

  // Convertit une date ISO en format compatible datetime-local (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (isoString: string | null): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      // Retirer les secondes et le timezone pour datetime-local
      return date.toISOString().substring(0, 16);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!canShow || !leadId || fetchedRef.current) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [jiraData, usersData] = await Promise.all([
          leadService.getJira(leadId),
          userService.getAll(),
        ]);

        // Normaliser les deadlines au format datetime-local dès le chargement
        if (jiraData?.leadTaskUsers) {
          jiraData.leadTaskUsers = jiraData.leadTaskUsers.map((t: any) => ({
            ...t,
            leadTaskUserDeadline: toDateTimeLocal(t.leadTaskUserDeadline),
          }));
        }

        setJira(jiraData);
        setUsers(usersData);
        fetchedRef.current = true;

        // Remonter les données initiales au parent
        onDataReady?.(jiraData);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        alert("Erreur lors du chargement des données JIRA");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      fetchedRef.current = false;
    };
  }, [leadId, canShow]);

  // À chaque modification du state jira, on remonte la donnée au parent
  useEffect(() => {
    if (jira) {
      onDataReady?.(jira);
    }
  }, [jira]);

  const updateTask = useCallback((index: number, field: string, value: any) => {
    setJira((prevJira: any) => {
      if (!prevJira) return prevJira;
      const copy = { ...prevJira };
      if (copy.leadTaskUsers?.[index]) {
        copy.leadTaskUsers = [...copy.leadTaskUsers];
        copy.leadTaskUsers[index] = {
          ...copy.leadTaskUsers[index],
          [field]: value,
        };
      }
      return copy;
    });
  }, []);

  const updateUser = useCallback(
    (index: number, userId: number) => {
      setJira((prevJira: any) => {
        if (!prevJira) return prevJira;
        const copy = { ...prevJira };
        const selected = users.find((u) => u.id === Number(userId));
        if (copy.leadTaskUsers?.[index]) {
          copy.leadTaskUsers = [...copy.leadTaskUsers];
          copy.leadTaskUsers[index] = {
            ...copy.leadTaskUsers[index],
            user: selected,
          };
        }
        return copy;
      });
    },
    [users]
  );

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
    return <div className="alert alert-warning">Aucune donnée JIRA disponible</div>;
  }

  return (
    <div className="p-3">
      <h5 className="mb-3">Informations JIRA</h5>

      <Form.Group className="mb-3">
        <Form.Label>Projet JIRA</Form.Label>
        <Form.Control
          value={jira.leadGoProjetJira || ""}
          onChange={(e) => {
            const updated = { ...jira, leadGoProjetJira: e.target.value };
            setJira(updated);
          }}
        />
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label>Ticket JIRA</Form.Label>
        <Form.Control
          value={jira.leadGoTicketJira || ""}
          onChange={(e) => {
            const updated = { ...jira, leadGoTicketJira: e.target.value };
            setJira(updated);
          }}
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
    </div>
  );
};

export default FormJira;