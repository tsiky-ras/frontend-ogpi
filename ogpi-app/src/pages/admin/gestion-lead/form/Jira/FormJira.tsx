import React, { useEffect, useState, useCallback, useRef } from "react";
import { Table, Form, Spinner } from "react-bootstrap";
import { FaTimes } from "react-icons/fa";

type Props = {
  lead: any;
  leadService: any;
  userService: any;
  onDataReady?: (data: any) => void;
};

/* ── Autocomplete utilisateur ─────────────────────────── */
type UserAutocompleteProps = {
  users: any[];
  value: any;
  onChange: (user: any) => void;
};

const UserAutocomplete: React.FC<UserAutocompleteProps> = ({ users, value, onChange }) => {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = value
    ? `${value.username} (${value.email || "Email inconnu"})`
    : "";

  const filtered = users.filter((u) => {
    const label = `${u.username} ${u.email || ""}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {value && !showDropdown ? (
        <div
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
            cursor: "pointer",
          }}
          onClick={() => setShowDropdown(true)}
        >
          {displayLabel}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-info)",
              padding: 0,
              lineHeight: 1,
              fontSize: 11,
            }}
            aria-label="Retirer l'utilisateur"
          >
            <FaTimes />
          </button>
        </div>
      ) : (
        <Form.Control
          type="text"
          placeholder="Rechercher un collaborateur..."
          value={search}
          autoFocus={showDropdown}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          style={{ fontSize: 13 }}
        />
      )}

      {showDropdown && (
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
            maxHeight: 180,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "8px 12px", fontSize: 13, color: "var(--color-text-secondary)" }}>
              Aucun résultat
            </div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                onMouseDown={() => {
                  onChange(u);
                  setSearch("");
                  setShowDropdown(false);
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--color-text-primary)",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--color-background-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span style={{ fontWeight: 500 }}>{u.username}</span>
                <span style={{ color: "var(--color-text-secondary)", marginLeft: 6, fontSize: 12 }}>
                  {u.email || "Email inconnu"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ── FormJira principal ───────────────────────────────── */
const FormJira: React.FC<Props> = ({ lead, leadService, userService, onDataReady }) => {
  const [jira, setJira] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchedRef = useRef(false);

  const statusId = lead?.currentLeadStatus?.leadStatus?.id;
  const canShow = statusId > 2;
  const leadId = lead?.leadId || lead?.id;

  const toDateTimeLocal = (isoString: string | null): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().substring(0, 16);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    fetchedRef.current = false;
    setJira(null);
  }, [leadId]);

  useEffect(() => {
    if (!canShow || !leadId || fetchedRef.current) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [jiraData, usersData] = await Promise.all([
          leadService.getJira(leadId),
          userService.getAll(),
        ]);

        if (jiraData?.leadTaskUsers) {
          jiraData.leadTaskUsers = jiraData.leadTaskUsers.map((t: any) => ({
            ...t,
            leadTaskUserDeadline: toDateTimeLocal(t.leadTaskUserDeadline),
          }));
        }

        setJira(jiraData);
        setUsers(usersData);
        fetchedRef.current = true;
        onDataReady?.(jiraData);
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
        alert("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      fetchedRef.current = false;
    };
  }, [leadId, canShow]);

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
    (index: number, user: any) => {
      setJira((prevJira: any) => {
        if (!prevJira) return prevJira;
        const copy = { ...prevJira };
        if (copy.leadTaskUsers?.[index]) {
          copy.leadTaskUsers = [...copy.leadTaskUsers];
          copy.leadTaskUsers[index] = {
            ...copy.leadTaskUsers[index],
            user,
          };
        }
        return copy;
      });
    },
    []
  );

  if (!canShow) return null;

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Chargement des étapes & validations...</p>
      </div>
    );
  }

  if (!jira) {
    return <div className="alert alert-warning">Aucune donnée disponible</div>;
  }

  return (
    <div className="p-3">
      <h5 className="mb-3">Affectation des tâches</h5>

      <Table bordered striped hover responsive>
        <thead className="table-light">
          <tr>
            <th style={{ width: "35%" }}>Tâche</th>
            <th style={{ width: "40%" }}>Collaborateur</th>
            <th style={{ width: "25%" }}>Deadline</th>
          </tr>
        </thead>
        <tbody>
          {jira.leadTaskUsers?.map((t: any, i: number) => (
            <tr key={t.leadTaskUserId || `task-${i}`}>
              <td style={{ verticalAlign: "middle", fontWeight: 500 }}>
                {t.leadTask?.leadTaskName || "Tâche inconnue"}
              </td>

              <td style={{ verticalAlign: "middle" }}>
                <UserAutocomplete
                  users={users}
                  value={t.user}
                  onChange={(user) => updateUser(i, user)}
                />
              </td>

              <td style={{ verticalAlign: "middle" }}>
                <Form.Control
                  type="datetime-local"
                  value={t.leadTaskUserDeadline || ""}
                  onChange={(e) => updateTask(i, "leadTaskUserDeadline", e.target.value)}
                  style={{ fontSize: 13 }}
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