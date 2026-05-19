import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  FaBell, FaCheckDouble, FaTimes, FaUser, FaArrowRight,
  FaClipboardList, FaSyncAlt, FaCheckCircle, FaTimesCircle,
  FaCalendarAlt, FaExclamationTriangle, FaExclamationCircle,
  FaUsers, FaTrophy, FaRocket, FaClock, FaProjectDiagram,
  FaBriefcase, FaExternalLinkAlt, FaHourglassHalf,
} from 'react-icons/fa';
import { useNotifications, NotifType, Notif } from '../../context/NotificationContext.tsx';

// ─── Métadonnées visuelles par type ──────────────────────────────────────────

interface TypeMeta {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
  border: string;
  label: string;
}

const TYPE_META: Record<NotifType, TypeMeta> = {
  TACHE_ASSIGNEE:     { Icon: FaClipboardList,        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Assignation'   },
  TACHE_REATTRIBUEE:  { Icon: FaSyncAlt,              color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', label: 'Réattribution' },
  TACHE_VALIDEE:      { Icon: FaCheckCircle,          color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Validée'       },
  TACHE_REJETEE:      { Icon: FaTimesCircle,          color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Rejetée'       },
  TACHE_A_VALIDER:    { Icon: FaHourglassHalf,        color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'À valider'     },
  DEADLINE_J7:        { Icon: FaCalendarAlt,          color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'J-7'           },
  DEADLINE_J3:        { Icon: FaExclamationTriangle,  color: '#f97316', bg: '#fff7ed', border: '#fed7aa', label: 'J-3'           },
  DEADLINE_J1:        { Icon: FaExclamationCircle,    color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', label: 'J-1'           },
  REUNION:            { Icon: FaUsers,                color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Réunion'       },
  LEAD_CO:            { Icon: FaTrophy,               color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Lead remporté' },
  LEAD_SOUMIS_PROJET: { Icon: FaRocket,               color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Nouveau projet'},
};

const fallbackMeta: TypeMeta = {
  Icon: FaBell, color: '#5F6F6E', bg: '#f8fafc', border: '#e2e8f0', label: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const fmtDateShort = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const fmtDateOnly = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
};

const resolveLien = (
  lienType: string | null,
  lienId: number | null,
  notifType?: NotifType,
  backlogLineProfilId?: number | null,
  leadTaskUserId?: number | null,
): { path: string; state?: Record<string, unknown>; label: string } | null => {
  if (!lienType || lienId == null) return null;

  switch (lienType) {
    case 'LEAD': {
      const taskId = leadTaskUserId ?? lienId;
      if (notifType === 'TACHE_A_VALIDER') {
        return {
          path: '/gestion-taches',
          state: { activeTab: 'avalider', openLeadTaskId: taskId },
          label: 'Valider la tâche',
        };
      }
      return {
        path: '/gestion-taches',
        state: { openLeadTaskId: taskId },
        label: 'Ouvrir la tâche',
      };
    }

    case 'TACHE_PROJET': {
      const taskId = backlogLineProfilId ?? lienId;
      if (notifType === 'TACHE_A_VALIDER') {
        return {
          path: '/gestion-taches-projet',
          state: { activeTab: 'avalider', openBacklogLineProfilId: taskId },
          label: 'Valider la tâche',
        };
      }
      return {
        path: '/gestion-taches-projet',
        state: { openBacklogLineProfilId: taskId },
        label: 'Ouvrir la tâche',
      };
    }

    case 'PROJET':
      return { path: '/gestion-projets', label: 'Voir le projet' };

    case 'CALENDRIER':
      return { path: '/calendrier/deadlines', label: 'Voir le calendrier' };

    default:
      return null;
  }
};

const parseMessage = (message: string | null) => {
  if (!message) return { tache: null, contexte: null, motif: null };

  const allMatches = [...message.matchAll(/«\s*([^»]+)\s*»/g)];
  const tache    = allMatches.length > 0 ? allMatches[0][1].trim() : null;
  const contexte = allMatches.length > 1 ? allMatches[1][1].trim() : null;

  const motifMatch = message.match(/—\s*Motif\s*:\s*(.+?)\.?\s*$/i);
  const motif = motifMatch ? motifMatch[1].trim() : null;

  return { tache, contexte, motif };
};

const getActorLabel = (type: NotifType): string => {
  switch (type) {
    case 'TACHE_ASSIGNEE':    return 'Assigné par';
    case 'TACHE_REATTRIBUEE': return 'Réattribué par';
    case 'TACHE_VALIDEE':     return 'Validé par';
    case 'TACHE_REJETEE':     return 'Rejeté par';
    case 'TACHE_A_VALIDER':   return 'Soumis par';
    default:                  return 'Par';
  }
};

const ContextChip: React.FC<{ lienType: string | null; label: string; color: string; bg: string }> = ({
  lienType, label, color, bg,
}) => {
  const Icon = lienType === 'TACHE_PROJET' || lienType === 'PROJET' ? FaProjectDiagram : FaBriefcase;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, color, background: bg,
      border: `1px solid ${color}33`, borderRadius: 20,
      padding: '2px 8px',
    }}>
      <Icon size={9} /> {label}
    </span>
  );
};

// ─── Modal de détail ──────────────────────────────────────────────────────────

interface NotifDetailModalProps {
  notif: Notif;
  onClose: () => void;
  onNavigate: (path: string, state?: Record<string, unknown>) => void;
}

const NotifDetailModal: React.FC<NotifDetailModalProps> = ({ notif, onClose, onNavigate }) => {
  const meta = TYPE_META[notif.type] ?? fallbackMeta;
  const { Icon } = meta;
  const lien = resolveLien(notif.lienType, notif.lienId, notif.type, notif.backlogLineProfilId, notif.leadTaskUserId);
  const { tache, contexte, motif } = parseMessage(notif.message);

  // Afficher projet OU lead, jamais les deux — strict sur taskType
  const epicAffiche   = notif.epicNom ?? tache;
  const projetAffiche = notif.taskType === 'PROJET'
    ? (notif.projetNomEnrichi ?? contexte)
    : null;
  const leadAffiche   = notif.taskType === 'LEAD'
    ? (notif.leadNomEnrichi ?? contexte)
    : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isTaskType = ['TACHE_ASSIGNEE', 'TACHE_REATTRIBUEE', 'TACHE_VALIDEE', 'TACHE_REJETEE', 'TACHE_A_VALIDER'].includes(notif.type);
  const isDeadline = ['DEADLINE_J7', 'DEADLINE_J3', 'DEADLINE_J1'].includes(notif.type);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, width: 440, maxWidth: '95vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* ── Bandeau header ─────────────────────────────────────────── */}
        <div style={{
          background: meta.bg,
          borderBottom: `1.5px solid ${meta.border}`,
          padding: '16px 18px 14px',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: `${meta.color}18`, border: `1.5px solid ${meta.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color={meta.color} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{
                display: 'inline-block', fontSize: 10, fontWeight: 700,
                color: meta.color, background: '#fff',
                border: `1px solid ${meta.border}`, borderRadius: 20,
                padding: '2px 8px', marginBottom: 4,
              }}>
                {meta.label}
              </span>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', lineHeight: 1.3 }}>
                {notif.titre}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, flexShrink: 0,
              display: 'flex', alignItems: 'center', borderRadius: 6,
            }}
            title="Fermer (Échap)"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* ── Corps ───────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 20px 20px' }}>

          {/* ── Bloc tâche ── */}
          {isTaskType && (
            <div style={{
              background: '#f8fafc', borderRadius: 10,
              border: '1px solid #e2e8f0',
              padding: '12px 14px', marginBottom: 14,
            }}>
              {epicAffiche && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Tâche (Épic)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <FaClipboardList size={12} color={meta.color} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{epicAffiche}</span>
                  </div>
                </div>
              )}

              {notif.taskType === 'PROJET' && projetAffiche && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Projet
                  </span>
                  <div style={{ marginTop: 4 }}>
                    <ContextChip lienType="PROJET" label={projetAffiche} color={meta.color} bg={meta.bg} />
                  </div>
                </div>
              )}

              {notif.taskType === 'LEAD' && leadAffiche && (
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Opportunité (Lead)
                  </span>
                  <div style={{ marginTop: 4 }}>
                    <ContextChip lienType="LEAD" label={leadAffiche} color={meta.color} bg={meta.bg} />
                  </div>
                </div>
              )}

              {notif.affectedBy && (
                <div style={{ marginBottom: motif ? 10 : 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {getActorLabel(notif.type)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: `${meta.color}18`, border: `1.5px solid ${meta.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <FaUser size={9} color={meta.color} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                      {notif.affectedBy}
                    </span>
                  </div>
                </div>
              )}

              {motif && (
                <div style={{ marginTop: motif ? 10 : 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Motif
                  </span>
                  <div style={{
                    marginTop: 4, padding: '6px 10px',
                    background: '#fef2f2', borderRadius: 6,
                    border: '1px solid #fecaca',
                    fontSize: 12, color: '#dc2626', fontWeight: 500,
                  }}>
                    {motif}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Bloc deadline ── */}
          {isDeadline && (
            <div style={{
              background: '#f8fafc', borderRadius: 10,
              border: '1px solid #e2e8f0',
              padding: '12px 14px', marginBottom: 14,
            }}>
              {tache && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Élément
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <FaClipboardList size={12} color={meta.color} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{tache}</span>
                  </div>
                </div>
              )}

              {contexte && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Contexte
                  </span>
                  <div style={{ marginTop: 4 }}>
                    <ContextChip lienType={notif.lienType} label={contexte} color={meta.color} bg={meta.bg} />
                  </div>
                </div>
              )}

              {notif.dateEcheance && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Date d'échéance
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <FaCalendarAlt size={12} color={meta.color} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                      {fmtDateOnly(notif.dateEcheance)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Message brut (réunion, lead co, lead→projet) ── */}
          {(!isTaskType && !isDeadline && notif.message) && (
            <div style={{
              fontSize: 13, color: '#374151', lineHeight: 1.6,
              marginBottom: 14, padding: '10px 12px',
              background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
            }}>
              {notif.message}
            </div>
          )}

          {/* ── Date de réception + badge non lu ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#94a3b8', marginBottom: 18,
          }}>
            <FaClock size={10} />
            <span>{fmtDate(notif.dateCreation)}</span>
            {!notif.lu && (
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 700, color: meta.color,
                background: meta.bg, borderRadius: 20, padding: '1px 8px',
                border: `1px solid ${meta.border}`,
              }}>
                Non lue
              </span>
            )}
          </div>

          {/* ── CTA : ouvrir/valider OU fermer si pas de lien ── */}
          {lien ? (
            <button
              onClick={() => { onNavigate(lien.path, lien.state); onClose(); }}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10,
                fontSize: 13, fontWeight: 700, color: '#fff',
                background: meta.color, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity .15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
            >
              <FaArrowRight size={11} /> {lien.label}
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 10,
                fontSize: 12, color: '#64748b', background: '#f1f5f9',
                border: 'none', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Ligne de notification dans le dropdown ───────────────────────────────────

interface NotifRowProps {
  notif: Notif;
  onRead: (id: number) => void;
  onOpenDetail: (notif: Notif) => void;
}

const NotifRow: React.FC<NotifRowProps> = ({ notif, onRead, onOpenDetail }) => {
  const meta = TYPE_META[notif.type] ?? fallbackMeta;
  const { Icon } = meta;
  const { tache, contexte } = parseMessage(notif.message);

  // Strict sur taskType — jamais les deux simultanément
  const epicAffiche     = notif.epicNom ?? tache;
  const projetAffiche   = notif.taskType === 'PROJET' ? (notif.projetNomEnrichi ?? contexte) : null;
  const leadAffiche     = notif.taskType === 'LEAD'   ? (notif.leadNomEnrichi   ?? contexte) : null;
  const contexteAffiche = projetAffiche ?? leadAffiche ?? contexte;

  const handleClick = () => {
    if (!notif.lu) onRead(notif.notificationId);
    onOpenDetail(notif);
  };

  const isDeadline = ['DEADLINE_J7', 'DEADLINE_J3', 'DEADLINE_J1'].includes(notif.type);

  return (
    <div
      onClick={handleClick}
      title="Cliquer pour voir les détails"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid #f1f5f9',
        background: notif.lu ? '#fff' : '#f0f9ff',
        cursor: 'pointer',
        display: 'flex', gap: 10, alignItems: 'flex-start',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = notif.lu ? '#f8fafc' : '#e0f2fe'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = notif.lu ? '#fff' : '#f0f9ff'; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: meta.bg, border: `1.5px solid ${meta.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
      }}>
        <Icon size={13} color={meta.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: meta.color,
            background: meta.bg, borderRadius: 20, padding: '1px 6px',
            border: `1px solid ${meta.border}`, flexShrink: 0,
          }}>
            {meta.label}
          </span>
          <span style={{
            fontSize: 11, fontWeight: notif.lu ? 500 : 700, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {notif.titre}
          </span>
        </div>

        {epicAffiche && (
          <div style={{
            fontSize: 11, color: '#374151', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 2,
          }}>
            <FaClipboardList size={9} color={meta.color} style={{ marginRight: 4 }} />
            {epicAffiche}
          </div>
        )}

        {contexteAffiche && (
          <div style={{ marginBottom: 3 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 600, color: meta.color,
              background: meta.bg, borderRadius: 20, padding: '1px 6px',
              border: `1px solid ${meta.color}22`,
            }}>
              {notif.taskType === 'PROJET' ? <FaProjectDiagram size={8} /> : <FaBriefcase size={8} />}
              {contexteAffiche}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
            <FaClock size={8} /> {fmtDateShort(notif.dateCreation)}
          </span>

          {notif.affectedBy && (
            <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
              <FaUser size={8} />
              <strong style={{ color: '#475569' }}>{notif.affectedBy}</strong>
            </span>
          )}

          {isDeadline && notif.dateEcheance && (
            <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
              <FaCalendarAlt size={8} /> {fmtDateOnly(notif.dateEcheance)}
            </span>
          )}

          <span style={{
            fontSize: 10, color: meta.color, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto',
          }}>
            <FaExternalLinkAlt size={8} /> Détails
          </span>
        </div>
      </div>

      {!notif.lu && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: meta.color, flexShrink: 0, marginTop: 6,
        }} />
      )}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const NotificationBell: React.FC = () => {
  const { nonLus, notifications, marquerLu, marquerTousLus } = useNotifications();
  const [open, setOpen]               = useState(false);
  const [detailNotif, setDetailNotif] = useState<Notif | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const ref     = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const handleOpenToggle = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNavigate = (path: string, state?: Record<string, unknown>) => {
    setOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  const handleOpenDetail = (notif: Notif) => {
    setOpen(false);
    setDetailNotif(notif);
  };

  const nonLues = notifications.filter(n => !n.lu);
  const lues    = notifications.filter(n =>  n.lu);

  const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
    <div style={{
      padding: '6px 14px 4px', fontSize: 10, fontWeight: 700,
      color: '#94a3b8', textTransform: 'uppercase' as const,
      letterSpacing: '0.05em', background: '#fafafa',
    }}>
      {text}
    </div>
  );

  return (
    <>
      <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>

        {/* ── Bouton cloche ── */}
        <button
          ref={bellRef}
          onClick={handleOpenToggle}
          title="Notifications"
          style={{
            position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
            width: 36, height: 36, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FaBell size={20} color={nonLus > 0 ? '#C93C29' : '#5F6F6E'} style={{ transition: 'color 0.2s' }} />
          {nonLus > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: 25,
              background: '#C93C29', color: '#fff',
              fontSize: 9, fontWeight: 800, borderRadius: 99,
              minWidth: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', boxShadow: '0 0 0 2px #fff',
            }}>
              {nonLus > 99 ? '99+' : nonLus}
            </span>
          )}
        </button>

        {/* ── Dropdown (position: fixed pour passer au-dessus de tout) ── */}
        {open && (
          <div style={{
            position: 'fixed', top: dropdownPos.top, right: dropdownPos.right,
            zIndex: 999998,
            width: 390, maxHeight: 540,
            display: 'flex', flexDirection: 'column',
            background: '#fff', borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0', overflow: 'hidden',
          }}>

            {/* En-tête */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fff', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaBell size={13} color="#0f172a" />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  Notifications
                </span>
                {nonLus > 0 && (
                  <span style={{
                    background: '#fef2f2', color: '#C93C29',
                    fontSize: 10, fontWeight: 800, borderRadius: 99,
                    padding: '1px 7px', border: '1px solid #fecaca',
                  }}>
                    {nonLus} non {nonLus === 1 ? 'lue' : 'lues'}
                  </span>
                )}
              </div>
              {nonLus > 0 && (
                <button
                  onClick={marquerTousLus}
                  style={{
                    fontSize: 11, color: '#2563eb', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    fontWeight: 600, padding: '3px 6px', borderRadius: 6,
                  }}
                >
                  <FaCheckDouble size={10} /> Tout lire
                </button>
              )}
            </div>

            {/* Corps scrollable */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '36px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <FaBell size={28} style={{ marginBottom: 10, opacity: 0.25 }} />
                  <div style={{ fontSize: 13 }}>Aucune notification</div>
                </div>
              ) : (
                <>
                  {nonLues.length > 0 && (
                    <>
                      <SectionLabel text="Non lues" />
                      {nonLues.map(n => (
                        <NotifRow key={n.notificationId} notif={n}
                          onRead={marquerLu} onOpenDetail={handleOpenDetail} />
                      ))}
                    </>
                  )}
                  {lues.length > 0 && (
                    <>
                      <SectionLabel text="Lues" />
                      {lues.map(n => (
                        <NotifRow key={n.notificationId} notif={n}
                          onRead={marquerLu} onOpenDetail={handleOpenDetail} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de détail (portal → échappe tout stacking context parent) ── */}
      {detailNotif && ReactDOM.createPortal(
        <NotifDetailModal
          notif={detailNotif}
          onClose={() => setDetailNotif(null)}
          onNavigate={handleNavigate}
        />,
        document.body,
      )}
    </>
  );
};

export default NotificationBell;