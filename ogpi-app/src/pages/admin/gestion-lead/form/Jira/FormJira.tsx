import React, { useEffect, useState, useCallback, useRef } from "react";
import { Spinner } from "react-bootstrap";
import { FaTimes, FaSearch } from "react-icons/fa";

type Props = {
  lead: any;
  leadService: any;
  userService: any;
  onDataReady?: (data: any) => void;
};

/* ─────────────────────────────────────────────
   Styles constants — tout inline, aucune dépendance CSS externe
───────────────────────────────────────────── */
const S = {
  /* Conteneur principal */
  root: {
    padding: "4px 0",
    fontFamily: "inherit",
  } as React.CSSProperties,

  /* Barre stats */
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: 24,
  } as React.CSSProperties,

  statCard: {
    background: "#f7f7f5",
    borderRadius: 10,
    padding: "12px 16px",
  } as React.CSSProperties,

  statValue: {
    fontSize: 22,
    fontWeight: 500,
    color: "#1a1a18",
    lineHeight: 1.2,
  } as React.CSSProperties,

  statLabel: {
    fontSize: 12,
    color: "#5f5e5a",
    marginTop: 2,
  } as React.CSSProperties,

  /* En-tête colonnes */
  colHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 210px",
    gap: 16,
    padding: "0 20px 8px",
    borderBottom: "1px solid rgba(0,0,0,0.1)",
    marginBottom: 8,
  } as React.CSSProperties,

  colHeaderText: {
    fontSize: 11,
    fontWeight: 600,
    color: "#888780",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },

  /* Liste tâches */
  taskList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },

  taskRow: {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 12,
    padding: "14px 20px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 210px",
    gap: 16,
    alignItems: "center",
  } as React.CSSProperties,

  taskDot: (assigned: boolean): React.CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    background: assigned ? "#1D9E75" : "#B4B2A9",
  }),

  taskName: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1a1a18",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,

  /* Input de base */
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid rgba(0,0,0,0.22)",
    borderRadius: 8,
    background: "#ffffff",
    color: "#1a1a18",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  } as React.CSSProperties,

  inputWithIcon: {
    width: "100%",
    padding: "8px 12px 8px 30px",
    fontSize: 13,
    border: "1px solid rgba(0,0,0,0.22)",
    borderRadius: 8,
    background: "#ffffff",
    color: "#1a1a18",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  } as React.CSSProperties,

  /* Pill utilisateur sélectionné */
  userPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.22)",
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,

  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#E6F1FB",
    color: "#0C447C",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 500,
    flexShrink: 0,
  } as React.CSSProperties,

  userInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,

  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1a1a18",
    lineHeight: 1.3,
  } as React.CSSProperties,

  userEmail: {
    fontSize: 11,
    color: "#5f5e5a",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888780",
    padding: 2,
    lineHeight: 1,
    fontSize: 11,
    flexShrink: 0,
  } as React.CSSProperties,

  /* Dropdown */
  dropdown: {
    position: "absolute" as const,
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.2)",
    borderRadius: 8,
    zIndex: 1050,
    maxHeight: 200,
    overflowY: "auto" as const,
  } as React.CSSProperties,

  dropdownItem: {
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: 13,
    color: "#1a1a18",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,

  dropdownEmpty: {
    padding: "10px 12px",
    fontSize: 13,
    color: "#888780",
    background: "#ffffff",
  } as React.CSSProperties,

  searchIcon: {
    position: "absolute" as const,
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#888780",
    fontSize: 12,
    pointerEvents: "none" as const,
  } as React.CSSProperties,

  /* États vides / loading */
  loadingWrap: {
    textAlign: "center" as const,
    padding: "3rem 1rem",
  },

  loadingText: {
    marginTop: 12,
    color: "#5f5e5a",
    fontSize: 14,
  } as React.CSSProperties,

  warning: {
    padding: "14px 18px",
    background: "#fff8e1",
    border: "1px solid rgba(186,117,23,0.35)",
    borderRadius: 8,
    color: "#633806",
    fontSize: 14,
  } as React.CSSProperties,
};

/* ─────────────────────────────────────────────
   UserAutocomplete
───────────────────────────────────────────── */
type UserAutocompleteProps = {
  users: any[];
  value: any;
  onChange: (user: any) => void;
};

const UserAutocomplete: React.FC<UserAutocompleteProps> = ({ users, value, onChange }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = users.filter((u) =>
    `${u.username} ${u.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 2);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {value && !open ? (
        /* ── Pill utilisateur sélectionné ── */
        <div style={S.userPill} onClick={() => setOpen(true)}>
          <div style={S.avatar}>{initials(value.username)}</div>
          <div style={S.userInfo}>
            <div style={S.userName}>{value.username}</div>
            <div style={S.userEmail}>{value.email || "Aucun email"}</div>
          </div>
          <button
            type="button"
            style={S.removeBtn}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            aria-label="Retirer"
          >
            <FaTimes />
          </button>
        </div>
      ) : (
        /* ── Champ de recherche ── */
        <div style={{ position: "relative" }}>
          <FaSearch style={S.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher un collaborateur..."
            value={search}
            autoFocus={open}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={S.inputWithIcon}
          />
        </div>
      )}

      {/* ── Dropdown ── */}
      {open && (
        <div style={S.dropdown}>
          {filtered.length === 0 ? (
            <div style={S.dropdownEmpty}>Aucun résultat</div>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                onMouseDown={() => { onChange(u); setSearch(""); setOpen(false); }}
                style={S.dropdownItem}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf1ef")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                <div style={{ ...S.avatar, width: 26, height: 26, fontSize: 10 }}>
                  {initials(u.username)}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: "#1a1a18" }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: "#5f5e5a" }}>{u.email || "Aucun email"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   FormJira
───────────────────────────────────────────── */
const FormJira: React.FC<Props> = ({ lead, leadService, userService, onDataReady }) => {
  const [jira, setJira] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const statusId = lead?.currentLeadStatus?.leadStatus?.id;
  const canShow = statusId > 2;
  const leadId = lead?.leadId || lead?.id;

  const toDateTimeLocal = (iso: string | null): string => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? "" : d.toISOString().substring(0, 16);
    } catch { return ""; }
  };

  useEffect(() => { fetchedRef.current = false; setJira(null); }, [leadId]);

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
      } catch (err) {
        console.error("Erreur chargement:", err);
        alert("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => { fetchedRef.current = false; };
  }, [leadId, canShow]);

  useEffect(() => { if (jira) onDataReady?.(jira); }, [jira]);

  const updateTask = useCallback((index: number, field: string, value: any) => {
    setJira((prev: any) => {
      if (!prev) return prev;
      const copy = { ...prev, leadTaskUsers: [...prev.leadTaskUsers] };
      copy.leadTaskUsers[index] = { ...copy.leadTaskUsers[index], [field]: value };
      return copy;
    });
  }, []);

  const updateUser = useCallback((index: number, user: any) => {
    setJira((prev: any) => {
      if (!prev) return prev;
      const copy = { ...prev, leadTaskUsers: [...prev.leadTaskUsers] };
      copy.leadTaskUsers[index] = { ...copy.leadTaskUsers[index], user };
      return copy;
    });
  }, []);

  if (!canShow) return null;

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <Spinner animation="border" variant="primary" />
        <p style={S.loadingText}>Chargement des étapes & validations...</p>
      </div>
    );
  }

  if (!jira) {
    return <div style={S.warning}>Aucune donnée disponible pour ce lead.</div>;
  }

  const tasks: any[] = jira.leadTaskUsers || [];
  const assigned = tasks.filter((t) => t.user).length;
  const withDeadline = tasks.filter((t) => t.leadTaskUserDeadline).length;

  return (
    <div style={S.root}>

      {/* ── Stats ── */}
      <div style={S.statGrid}>
        {[
          { label: "Tâches au total", value: tasks.length },
          { label: "Assignées", value: assigned },
          { label: "Avec deadline", value: withDeadline },
        ].map((s) => (
          <div key={s.label} style={S.statCard}>
            <div style={S.statValue}>{s.value}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── En-tête colonnes ── */}
      <div style={S.colHeader}>
        {["Tâche", "Collaborateur", "Deadline"].map((h) => (
          <div key={h} style={S.colHeaderText}>{h}</div>
        ))}
      </div>

      {/* ── Lignes tâches ── */}
      <div style={S.taskList}>
        {tasks.map((t, i) => (
          <div key={t.leadTaskUserId || `task-${i}`} style={S.taskRow}>

            {/* Nom tâche */}
            <div style={S.taskName}>
              <div style={S.taskDot(!!t.user)} />
              {t.leadTask?.leadTaskName || "Tâche inconnue"}
            </div>

            {/* Collaborateur */}
            <UserAutocomplete
              users={users}
              value={t.user}
              onChange={(user) => updateUser(i, user)}
            />

            {/* Deadline */}
            <input
              type="datetime-local"
              value={t.leadTaskUserDeadline || ""}
              onChange={(e) => updateTask(i, "leadTaskUserDeadline", e.target.value)}
              style={{
                ...S.input,
                color: t.leadTaskUserDeadline ? "#1a1a18" : "#888780",
              }}
            />
          </div>
        ))}
      </div>

    </div>
  );
};

export default FormJira;