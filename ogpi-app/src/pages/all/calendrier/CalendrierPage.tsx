import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaChevronLeft, FaChevronRight, FaCalendarAlt, FaPlus,
  FaCheckCircle, FaLayerGroup, FaMoneyBillWave,
  FaGift, FaBriefcase, FaSpinner, FaProjectDiagram,
  FaBoxes, FaLayerGroup as FaLot, FaCodeBranch, FaFlag,
} from "react-icons/fa";
import { Modal } from "react-bootstrap";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import {
  CalendrierService,
  CalendrierEvenement,
  TypeEvenement,
  TYPE_META,
  AddEvenementPayload,
} from "../../../services/projet/calendrier/CalendrierService.tsx";
import "./CalendrierPage.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  } catch { return iso; }
};

const fmtShort = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
  catch { return iso; }
};

const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const today = () => {
  const n = new Date();
  return isoDate(n.getFullYear(), n.getMonth(), n.getDate());
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const dayOfWeek = (y: number, m: number, d: number): number => {
  const dow = new Date(y, m, d).getDay();
  return dow === 0 ? 6 : dow - 1;
};

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

// ─── TypeIcon ─────────────────────────────────────────────────────────────────
const TypeIcon: React.FC<{ type: TypeEvenement; size?: number }> = ({ type, size = 11 }) => {
  switch (type) {
    case "DEADLINE_TACHE":    return <FaLayerGroup size={size} />;
    case "LIVRAISON":         return <FaGift size={size} />;
    case "PAIEMENT":          return <FaMoneyBillWave size={size} />;
    case "DEADLINE_OFFRE":    return <FaBriefcase size={size} />;
    case "DEADLINE_PROJET":   return <FaProjectDiagram size={size} />;
    case "DEADLINE_LOT":      return <FaBoxes size={size} />;
    case "DEADLINE_PHASE":    return <FaLot size={size} />;
    case "DEADLINE_SPRINT":   return <FaCodeBranch size={size} />;
    case "DEADLINE_LIVRABLE": return <FaFlag size={size} />;
    case "REUNION":           return <span style={{ fontSize: size }}>👥</span>;
  }
};

// ─── StatutBadge ──────────────────────────────────────────────────────────────
const STATUT_COLORS: Record<string, { color: string; bg: string }> = {
  "Validé":                 { color: "#2d8f47", bg: "#f0fdf4" },
  "En cours":               { color: "#7c3aed", bg: "#f5f3ff" },
  "En attente validation":  { color: "#f97316", bg: "#fff7ed" },
  "Affecté":                { color: "#3b82f6", bg: "#eff6ff" },
  "Réattribué":             { color: "#f59e0b", bg: "#fffbeb" },
  "PAYE":                   { color: "#2d8f47", bg: "#f0fdf4" },
  "EN_ATTENTE":             { color: "#f59e0b", bg: "#fffbeb" },
  "PARTIELLEMENT_PAYE":     { color: "#3b82f6", bg: "#eff6ff" },
};

const StatutBadge: React.FC<{ statut?: string | null }> = ({ statut }) => {
  if (!statut) return null;
  const m = STATUT_COLORS[statut] ?? { color: "#5F6F6E", bg: "#f1f5f9" };
  return (
    <span className="cal-agenda-event-badge" style={{ color: m.color, background: m.bg }}>
      {statut}
    </span>
  );
};

// ─── EventDetailModal ─────────────────────────────────────────────────────────
const EventDetailModal: React.FC<{
  event: CalendrierEvenement | null;
  onClose: () => void;
}> = ({ event, onClose }) => {
  if (!event) return null;
  const m = TYPE_META[event.type];

  return (
    <Modal show={!!event} onHide={onClose} centered size="sm">
      <Modal.Header closeButton style={{ background: "#223A46", color: "#fff", borderBottom: "2px solid " + m.color }}>
        <div className="cal-modal-header">
          <span className="cal-modal-type-dot" style={{ background: m.dot }} />
          <div>
            <div className="cal-modal-title" style={{ color: "#fff" }}>{event.titre}</div>
            <span className="cal-modal-badge" style={{ color: m.color, background: m.bg, marginTop: 4 }}>
              <TypeIcon type={event.type} /> {m.label}
            </span>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body style={{ background: "#fafaf9", padding: 0 }}>
        <div className="cal-modal-detail-grid">
          <div className="cal-modal-detail-item">
            <span className="cal-modal-detail-label">Date</span>
            <span className="cal-modal-detail-value">{fmt(event.date)}</span>
          </div>
          {event.projetNom && (
            <div className="cal-modal-detail-item">
              <span className="cal-modal-detail-label">Projet</span>
              <span className="cal-modal-detail-value">{event.projetNom}</span>
            </div>
          )}
          {event.statut && (
            <div className="cal-modal-detail-item">
              <span className="cal-modal-detail-label">Statut</span>
              <StatutBadge statut={event.statut} />
            </div>
          )}
          {event.meta1 && (
            <div className="cal-modal-detail-item">
              <span className="cal-modal-detail-label">
                {event.type === "DEADLINE_TACHE" ? "Profil" :
                 event.type === "PAIEMENT" ? "Référence" :
                 "Détail"}
              </span>
              <span className="cal-modal-detail-value">{event.meta1}</span>
            </div>
          )}
          {event.meta2 && (
            <div className="cal-modal-detail-item">
              <span className="cal-modal-detail-label">
                {event.type === "DEADLINE_TACHE" ? "Collaborateur" : "Montant"}
              </span>
              <span className="cal-modal-detail-value">
                {event.type === "PAIEMENT"
                  ? parseFloat(event.meta2).toLocaleString("fr-FR", { minimumFractionDigits: 2 })
                  : event.meta2}
              </span>
            </div>
          )}
          {event.description && (
            <div className="cal-modal-detail-item cal-modal-detail-full">
              <span className="cal-modal-detail-label">Description</span>
              <span className="cal-modal-detail-value">{event.description}</span>
            </div>
          )}
          <div className="cal-modal-detail-item">
            <span className="cal-modal-detail-label">Accompli</span>
            <span className="cal-modal-detail-value" style={{ color: event.accompli ? "#2d8f47" : "#C93C29", fontWeight: 700 }}>
              {event.accompli ? "✓ Oui" : "✗ Non"}
            </span>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer style={{ background: "#fafaf9", borderTop: "1px solid #e5e7eb" }}>
        <button
          style={{ padding: "6px 16px", borderRadius: 7, background: "#223A46", color: "#fff", border: "none", fontSize: ".82rem", fontWeight: 600, cursor: "pointer" }}
          onClick={onClose}>
          Fermer
        </button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── Groupes de types pour le sélecteur ──────────────────────────────────────
const TYPE_GROUPS: { label: string; types: TypeEvenement[] }[] = [
  {
    label: "Offres & tâches",
    types: ["DEADLINE_TACHE", "DEADLINE_OFFRE"],
  },
  {
    label: "Projet",
    types: ["DEADLINE_PROJET", "DEADLINE_LOT", "DEADLINE_PHASE", "DEADLINE_SPRINT", "DEADLINE_LIVRABLE"],
  },
  {
    label: "Financier",
    types: ["LIVRAISON", "PAIEMENT"],
  },
  {
    label: "Réunion",
    types: ["REUNION"],
  },
];

// ─── AddEventModal ────────────────────────────────────────────────────────────
const EMPTY_ADD: AddEvenementPayload = {
  type: "DEADLINE_TACHE",
  titre: "",
  date: today(),
  description: "",
  projetNom: "",
};

const AddEventModal: React.FC<{
  show: boolean;
  defaultDate?: string;
  onClose: () => void;
  onAdd: (ev: Omit<CalendrierEvenement, "id">) => Promise<void>;
}> = ({ show, defaultDate, onClose, onAdd }) => {
  const [form, setForm] = useState<AddEvenementPayload>({ ...EMPTY_ADD, date: defaultDate ?? today() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setForm({ ...EMPTY_ADD, date: defaultDate ?? today() });
      setError(null);
    }
  }, [show, defaultDate]);

  const setF = <K extends keyof AddEvenementPayload>(k: K, v: AddEvenementPayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.titre.trim() || !form.date) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        type: form.type,
        titre: form.titre,
        date: form.date,
        description: form.description || null,
        projetNom: form.projetNom || null,
        accompli: false,
      });
      onClose();
    } catch {
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="sm">
      <Modal.Header closeButton style={{ background: "#223A46", color: "#fff" }}>
        <Modal.Title style={{ fontSize: ".95rem", color: "#fff" }}>
          <FaPlus size={12} className="me-2" /> Nouvel événement
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: "#fafaf9" }}>
        <div className="cal-add-form">

          {/* Type — affichage groupé */}
          <div className="cal-add-field">
            <label className="cal-add-label">Type *</label>
            {TYPE_GROUPS.map(group => (
              <div key={group.label} className="cal-add-type-group">
                <div className="cal-add-type-group-label">{group.label}</div>
                <div className="cal-add-types">
                  {group.types.map(t => {
                    const meta = TYPE_META[t];
                    return (
                      <button key={t}
                        className="cal-add-type-btn"
                        style={{
                          background: form.type === t ? meta.bg : "#fff",
                          borderColor: form.type === t ? meta.color : "#e5e7eb",
                          color: form.type === t ? meta.color : "#5F6F6E",
                        }}
                        onClick={() => setF("type", t)}>
                        <TypeIcon type={t} size={10} />
                        <span style={{ marginLeft: 4 }}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Titre */}
          <div className="cal-add-field">
            <label className="cal-add-label">Titre *</label>
            <input className="cal-add-input" placeholder="Intitulé de l'événement"
              value={form.titre} onChange={e => setF("titre", e.target.value)} />
          </div>

          {/* Date + Projet sur la même ligne */}
          <div className="cal-add-row2">
            <div className="cal-add-field">
              <label className="cal-add-label">Date *</label>
              <input className="cal-add-input" type="date"
                value={form.date} onChange={e => setF("date", e.target.value)} />
            </div>
            <div className="cal-add-field">
              <label className="cal-add-label">Projet</label>
              <input className="cal-add-input" placeholder="Nom du projet"
                value={form.projetNom ?? ""} onChange={e => setF("projetNom", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div className="cal-add-field">
            <label className="cal-add-label">Description (optionnel)</label>
            <textarea className="cal-add-input" rows={2}
              placeholder="Détails…"
              value={form.description ?? ""} onChange={e => setF("description", e.target.value)}
              style={{ resize: "none" }} />
          </div>

          {error && (
            <div style={{ fontSize: ".78rem", color: "#C93C29", background: "#fff5f5", padding: "6px 10px", borderRadius: 6, border: "1px solid #f8d0cb" }}>
              {error}
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer style={{ background: "#fafaf9", borderTop: "1px solid #e5e7eb" }}>
        <button style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", fontSize: ".82rem" }}
          onClick={onClose} disabled={saving}>Annuler</button>
        <button style={{
          padding: "6px 16px", borderRadius: 7, background: "#C93C29", color: "#fff",
          border: "none", fontSize: ".82rem", fontWeight: 700,
          cursor: saving ? "wait" : "pointer", opacity: saving ? .7 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
          onClick={handleSave} disabled={saving || !form.titre.trim() || !form.date}>
          {saving && <FaSpinner size={10} style={{ animation: "spin 1s linear infinite" }} />}
          Ajouter
        </button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── Vue Mois ─────────────────────────────────────────────────────────────────
const MonthView: React.FC<{
  year: number; month: number;
  evByDate: Map<string, CalendrierEvenement[]>;
  onEventClick: (e: CalendrierEvenement) => void;
  onDayClick: (iso: string) => void;
}> = ({ year, month, evByDate, onEventClick, onDayClick }) => {
  const todayISO = today();
  const firstDow = dayOfWeek(year, month, 1);
  const daysInMonth = getDaysInMonth(year, month);
  const prevDays = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);

  const cells: Array<{ iso: string; day: number; current: boolean }> = [];
  for (let i = 0; i < firstDow; i++) {
    const d = prevDays - firstDow + 1 + i;
    const y = month === 0 ? year - 1 : year;
    const m = month === 0 ? 11 : month - 1;
    cells.push({ iso: isoDate(y, m, d), day: d, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: isoDate(year, month, d), day: d, current: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const y = month === 11 ? year + 1 : year;
    const m = month === 11 ? 0 : month + 1;
    cells.push({ iso: isoDate(y, m, d), day: d, current: false });
  }

  return (
    <div className="cal-month-grid">
      <div className="cal-month-head">
        {JOURS.map(j => <div key={j} className="cal-month-head-cell">{j}</div>)}
      </div>
      <div className="cal-month-body">
        {cells.map(({ iso, day, current }) => {
          const evs = evByDate.get(iso) ?? [];
          const isToday = iso === todayISO;
          const MAX = 3;
          return (
            <div key={iso}
              className={`cal-day-cell${!current ? " other-month" : ""}${isToday ? " today" : ""}`}
              onClick={() => onDayClick(iso)}>
              <div className="cal-day-num">{day}</div>
              <div className="cal-day-events">
                {evs.slice(0, MAX).map(ev => {
                  const m = TYPE_META[ev.type];
                  return (
                    <div key={ev.id + ev.type}
                      className={`cal-event-pill${ev.accompli ? " accompli" : ""}`}
                      style={{ color: m.color, background: m.bg, borderLeftColor: m.dot }}
                      onClick={e => { e.stopPropagation(); onEventClick(ev); }}>
                      {ev.titre}
                    </div>
                  );
                })}
                {evs.length > MAX && (
                  <button className="cal-more-btn" onClick={e => { e.stopPropagation(); onDayClick(iso); }}>
                    +{evs.length - MAX} de plus
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Vue Semaine ──────────────────────────────────────────────────────────────
const WeekView: React.FC<{
  weekStart: string;
  evByDate: Map<string, CalendrierEvenement[]>;
  onEventClick: (e: CalendrierEvenement) => void;
  onDayClick: (iso: string) => void;
}> = ({ weekStart, evByDate, onEventClick, onDayClick }) => {
  const todayISO = today();
  const days: Array<{ iso: string; label: string; num: number }> = [];
  const base = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
    days.push({ iso, label: JOURS[i], num: d.getDate() });
  }

  return (
    <div className="cal-week-grid">
      <div className="cal-week-head">
        {days.map(({ iso, label, num }) => (
          <div key={iso} className={`cal-week-head-cell${iso === todayISO ? " today" : ""}`}>
            <div className="cal-week-head-dayname">{label}</div>
            <div className="cal-week-head-daynum">{num}</div>
          </div>
        ))}
      </div>
      <div className="cal-week-body">
        {days.map(({ iso }) => {
          const evs = evByDate.get(iso) ?? [];
          return (
            <div key={iso}
              className={`cal-week-day-col${iso === todayISO ? " today" : ""}`}
              onClick={() => onDayClick(iso)}>
              {evs.length === 0 && <div style={{ fontSize: ".65rem", color: "#c0c8d0", textAlign: "center", marginTop: 8 }}>—</div>}
              {evs.map(ev => {
                const m = TYPE_META[ev.type];
                return (
                  <div key={ev.id + ev.type}
                    className={`cal-week-event${ev.accompli ? " accompli" : ""}`}
                    style={{ background: m.bg, borderLeftColor: m.dot }}
                    onClick={e => { e.stopPropagation(); onEventClick(ev); }}>
                    <div className="cal-week-event-title" style={{ color: m.color }}>
                      <TypeIcon type={ev.type} /> {ev.titre}
                    </div>
                    {ev.projetNom && <div className="cal-week-event-meta">{ev.projetNom}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Vue Agenda ───────────────────────────────────────────────────────────────
const AgendaView: React.FC<{
  events: CalendrierEvenement[];
  onEventClick: (e: CalendrierEvenement) => void;
}> = ({ events, onEventClick }) => {
  const todayISO = today();

  const grouped = useMemo(() => {
    const map = new Map<string, CalendrierEvenement[]>();
    events.forEach(ev => {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="cal-empty">
        <div className="cal-empty-icon"><FaCalendarAlt size={36} /></div>
        <p>Aucun événement sur cette période.</p>
      </div>
    );
  }

  return (
    <div className="cal-agenda">
      {grouped.map(([date, evs]) => (
        <React.Fragment key={date}>
          <div className="cal-agenda-day-header">
            <span className="cal-agenda-day-dot" style={{ background: date === todayISO ? "#C93C29" : "#E8E5D7" }} />
            <span className={`cal-agenda-day-label${date === todayISO ? " today-label" : ""}`}>
              {date === todayISO ? "Aujourd'hui — " : ""}{fmt(date)}
            </span>
            <span style={{ marginLeft: "auto", fontSize: ".7rem", color: "#94a3b8", fontWeight: 600 }}>
              {evs.length} événement{evs.length > 1 ? "s" : ""}
            </span>
          </div>
          {evs.map(ev => {
            const m = TYPE_META[ev.type];
            return (
              <div key={ev.id + ev.type}
                className={`cal-agenda-event${ev.accompli ? " accompli" : ""}`}
                onClick={() => onEventClick(ev)}>
                <span className="cal-agenda-event-dot" style={{ background: m.dot }} />
                <div className="cal-agenda-event-body">
                  <div className="cal-agenda-event-title">{ev.titre}</div>
                  <div className="cal-agenda-event-sub">
                    <span className="cal-agenda-event-badge" style={{ color: m.color, background: m.bg }}>
                      <TypeIcon type={ev.type} size={9} /> {m.label}
                    </span>
                    {ev.projetNom && <span>📁 {ev.projetNom}</span>}
                    {ev.meta1 && <span>{ev.meta1}</span>}
                    {ev.statut && <StatutBadge statut={ev.statut} />}
                  </div>
                </div>
                <div className="cal-agenda-event-right">
                  {ev.accompli
                    ? <FaCheckCircle size={13} style={{ color: "#2d8f47" }} />
                    : <FaCalendarAlt size={13} style={{ color: "#94a3b8" }} />
                  }
                  {ev.type === "PAIEMENT" && ev.meta2 && (
                    <div style={{ marginTop: 4, fontWeight: 700, color: "#223A46", fontSize: ".78rem" }}>
                      {parseFloat(ev.meta2).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── CalendrierPage ───────────────────────────────────────────────────────────
const CalendrierPage: React.FC = () => {
  const { api } = useAuth();
  const service = useMemo(() => new CalendrierService(api), [api]);

  const [events, setEvents] = useState<CalendrierEvenement[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"mois" | "semaine" | "agenda">("mois");

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const getMonday = (d: Date) => {
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const m = new Date(d);
    m.setDate(d.getDate() - day);
    return isoDate(m.getFullYear(), m.getMonth(), m.getDate());
  };
  const [weekStart, setWeekStart] = useState(getMonday(now));

  // Tous les types actifs par défaut
  const [activeTypes, setActiveTypes] = useState<Set<TypeEvenement>>(
    new Set(Object.keys(TYPE_META) as TypeEvenement[])
  );

  const [selectedEvent, setSelectedEvent] = useState<CalendrierEvenement | null>(null);
  const [showAdd, setShowAdd]             = useState(false);
  const [addDate, setAddDate]             = useState<string | undefined>();
  const [localEvents, setLocalEvents]     = useState<CalendrierEvenement[]>([]);

  // ── Chargement ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    service.getEvenements()
      .then(data => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [service]);

  // ── Données filtrées ────────────────────────────────────────────────────────
  const allEvents = useMemo(() => [...events, ...localEvents], [events, localEvents]);
  const filtered  = useMemo(() => allEvents.filter(e => activeTypes.has(e.type)), [allEvents, activeTypes]);

  const periodEvents = useMemo(() => {
    if (view === "mois") {
      return filtered.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
    }
    if (view === "semaine") {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      const endISO = isoDate(end.getFullYear(), end.getMonth(), end.getDate());
      return filtered.filter(e => e.date >= weekStart && e.date <= endISO);
    }
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const fromISO = isoDate(from.getFullYear(), from.getMonth(), from.getDate());
    const to = new Date();
    to.setDate(to.getDate() + 90);
    const toISO = isoDate(to.getFullYear(), to.getMonth(), to.getDate());
    return filtered.filter(e => e.date >= fromISO && e.date <= toISO);
  }, [filtered, view, year, month, weekStart]);

  const evByDate = useMemo(() => {
    const m = new Map<string, CalendrierEvenement[]>();
    periodEvents.forEach(ev => {
      if (!m.has(ev.date)) m.set(ev.date, []);
      m.get(ev.date)!.push(ev);
    });
    return m;
  }, [periodEvents]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth());
    setWeekStart(getMonday(n));
  };

  const goPrev = () => {
    if (view === "mois") {
      if (month === 0) { setYear(y => y - 1); setMonth(11); }
      else setMonth(m => m - 1);
    } else if (view === "semaine") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setWeekStart(isoDate(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  };

  const goNext = () => {
    if (view === "mois") {
      if (month === 11) { setYear(y => y + 1); setMonth(0); }
      else setMonth(m => m + 1);
    } else if (view === "semaine") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setWeekStart(isoDate(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  };

  const periodLabel = useMemo(() => {
    if (view === "mois") return `${MOIS_LABELS[month]} ${year}`;
    if (view === "semaine") {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      return `${fmtShort(weekStart)} → ${fmtShort(isoDate(end.getFullYear(), end.getMonth(), end.getDate()))} ${year}`;
    }
    return "Agenda — 90 prochains jours";
  }, [view, year, month, weekStart]);

  const toggleType = (t: TypeEvenement) => {
    setActiveTypes(prev => {
      const s = new Set(prev);
      s.has(t) ? s.delete(t) : s.add(t);
      return s;
    });
  };

  const handleDayClick = useCallback((iso: string) => {
    setAddDate(iso);
    setShowAdd(true);
  }, []);

  // Tente d'abord un POST, sinon stocke localement
  const handleAddEvent = useCallback(async (ev: Omit<CalendrierEvenement, "id">) => {
    try {
      const created = await service.addEvenement({
        type: ev.type,
        titre: ev.titre,
        date: ev.date,
        description: ev.description,
        projetNom: ev.projetNom,
      });
      setEvents(prev => [...prev, created]);
    } catch {
      // Fallback local si l'API échoue (ex. : pas encore implémenté côté serveur)
      setLocalEvents(prev => [...prev, { ...ev, id: -(prev.length + 1) }]);
    }
  }, [service]);

  const counters = useMemo(() => {
    const c = {} as Record<TypeEvenement, number>;
    (Object.keys(TYPE_META) as TypeEvenement[]).forEach(t => { c[t] = 0; });
    filtered.forEach(e => c[e.type]++);
    return c;
  }, [filtered]);

  return (
    <div className="cal-page">
      <Header />
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main className="cal-main">
          <div className="cal-content">

            {/* ── Titre ── */}
            <div className="cal-title-wrap">
              <Title
                title="Calendrier"
                subtitle="Deadlines tâches, paiements, livraisons et offres"
              />
            </div>

            {/* ── Filtres types — défilables horizontalement sur mobile ── */}
            <div className="cal-filters">
              {(Object.entries(TYPE_META) as [TypeEvenement, typeof TYPE_META[TypeEvenement]][]).map(([t, m]) => (
                <button key={t}
                  className={`cal-filter-chip${!activeTypes.has(t) ? " inactive" : ""}`}
                  style={{ color: m.color, background: m.bg, borderColor: m.dot }}
                  onClick={() => toggleType(t)}>
                  <TypeIcon type={t} />
                  {m.label}
                  <span className="cal-filter-count" style={{ background: m.dot }}>
                    {counters[t]}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Toolbar ── */}
            <div className="cal-toolbar">
              <div className="cal-nav">
                {view !== "agenda" && (
                  <>
                    <button className="cal-nav-btn" onClick={goPrev}><FaChevronLeft size={11} /></button>
                    <button className="cal-nav-today" onClick={goToday}>Aujourd'hui</button>
                    <button className="cal-nav-btn" onClick={goNext}><FaChevronRight size={11} /></button>
                  </>
                )}
                <span className="cal-period-label">{periodLabel}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="cal-btn-add"
                  onClick={() => { setAddDate(today()); setShowAdd(true); }}>
                  <FaPlus size={10} /> Ajouter
                </button>
                <div className="cal-view-btns">
                  {(["mois", "semaine", "agenda"] as const).map(v => (
                    <button key={v} className={`cal-view-btn${view === v ? " active" : ""}`}
                      onClick={() => setView(v)}>
                      {v === "mois" ? "Mois" : v === "semaine" ? "Semaine" : "Agenda"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Contenu ── */}
            {loading ? (
              <div className="cal-loading">
                <FaSpinner size={24} className="fa-spin" />
                <p>Chargement des événements…</p>
              </div>
            ) : (
              <>
                {view === "mois" && (
                  <MonthView year={year} month={month}
                    evByDate={evByDate}
                    onEventClick={setSelectedEvent}
                    onDayClick={handleDayClick} />
                )}
                {view === "semaine" && (
                  <WeekView weekStart={weekStart}
                    evByDate={evByDate}
                    onEventClick={setSelectedEvent}
                    onDayClick={handleDayClick} />
                )}
                {view === "agenda" && (
                  <AgendaView events={periodEvents} onEventClick={setSelectedEvent} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <AddEventModal
        show={showAdd}
        defaultDate={addDate}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddEvent}
      />
    </div>
  );
};

export default CalendrierPage;