import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaSpinner, FaHistory } from "react-icons/fa";
import "./TaskStatusCell.css";

// ─── Statuts collaborateur (workflow tâche) ───────────────────────────────────
// 1=Affecté 2=Réattribué 3=À refaire(KO) 4=En cours 5=Validé(collab) 6=Terminé(CP OK)
export const TASK_STATUS = {
  AFFECTE:    1,  // Attribué (backend id=1)
  REATTRIBUE: 2,  // Réattribué (backend id=2)
  A_REFAIRE:  3,  // À modifier / KO → à refaire (backend id=3)
  EN_COURS:   4,  // En cours (backend id=4)
  VALIDE:     5,  // Soumis par collab → attend validation CP (backend id=5)
  TERMINE:    6,  // Validé par CP = terminé (backend id=6)
} as const;

const COLLAB_STATUS_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: "Attribué",   color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  2: { label: "Réattribué", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  3: { label: "À modifier", color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  4: { label: "En cours",   color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  5: { label: "Soumis",     color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  6: { label: "Validé ✓",   color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
};

const TEST_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  OK: { label: "OK",  color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  KO: { label: "KO",  color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
};

export interface StatusHistoryEntry {
  id: number;
  dateChangement: string;
  commentaire: string;
  modifiedBy: { id: number; username: string } | null;
  status: { id: number; label: string };
}

export interface TaskStatusEntry extends StatusHistoryEntry {}

const fmtDate = (iso: string) => {
  try {
    const d = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

// ─── Dropdown générique ───────────────────────────────────────────────────────
interface DropdownOption { label: string; color: string; bg: string; border: string; value: number | string; }
interface InlineDropdownProps {
  currentLabel: string; currentColor: string; currentBg: string; currentBorder: string;
  options: DropdownOption[];
  onSelect: (value: number | string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}
const InlineDropdown: React.FC<InlineDropdownProps> = ({
  currentLabel, currentColor, currentBg, currentBorder, options, onSelect, disabled, placeholder,
}) => {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSelect = async (v: number | string) => {
    setOpen(false); setSaving(true);
    try { await onSelect(v); } finally { setSaving(false); }
  };

  return (
    <div className="tsc-inline-dd" ref={ref}>
      <button
        className="tsc-inline-dd__badge"
        style={{ color: currentColor, background: currentBg, borderColor: currentBorder }}
        onClick={() => !disabled && !saving && setOpen(v => !v)}
        disabled={disabled || saving}
        title={disabled ? "" : "Changer le statut"}
      >
        {saving ? <FaSpinner size={8} className="tsc-spin" /> : <span className="tsc-dot" style={{ background: currentColor }} />}
        {currentLabel}
        {!disabled && <FaChevronDown size={8} className={`tsc-chevron${open ? " tsc-chevron--up" : ""}`} />}
      </button>
      {open && (
        <div className="tsc-inline-dd__menu">
          {options.map(opt => (
            <button key={opt.value} className="tsc-inline-dd__item"
              style={{ color: opt.color, background: opt.bg, borderColor: opt.border }}
              onClick={() => handleSelect(opt.value)}>
              <span className="tsc-dot" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Props principale ─────────────────────────────────────────────────────────
export interface TaskStatusCellProps {
  taskId: number;
  currentStatusId: number;
  history: TaskStatusEntry[];
  isValidator: boolean;
  isCollaborator: boolean;
  collaborateurNom?: string | null;
  onChangeStatus: (taskId: number, statusId: number, comment: string) => Promise<TaskStatusEntry>;
}

// ─── TaskStatusCell ───────────────────────────────────────────────────────────
const TaskStatusCell: React.FC<TaskStatusCellProps> = ({
  taskId, currentStatusId, history, isValidator, isCollaborator,
  collaborateurNom, onChangeStatus,
}) => {
  const [statusId, setStatusId] = useState(currentStatusId);
  const [hist, setHist]         = useState(history);
  const [showHist, setShowHist] = useState(false);
  const [koMotif, setKoMotif]   = useState("");
  const [showKoForm, setShowKoForm] = useState(false);
  const [savingKo, setSavingKo]     = useState(false);
  const [koErr, setKoErr]           = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowHist(false); setShowKoForm(false); setKoErr(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const doChange = async (newId: number, comment: string) => {
    const entry = await onChangeStatus(taskId, newId, comment);
    setStatusId(entry.status.id);
    setHist(prev => [...prev, entry]);
  };

  // ── Options dropdown Collab ───────────────────────────────────────────────
  const collabOptions = (): DropdownOption[] => {
    if (statusId === TASK_STATUS.AFFECTE || statusId === TASK_STATUS.REATTRIBUE || statusId === TASK_STATUS.A_REFAIRE) {
      return [{ value: TASK_STATUS.EN_COURS, label: "Démarrer", ...COLLAB_STATUS_META[TASK_STATUS.EN_COURS], border: COLLAB_STATUS_META[TASK_STATUS.EN_COURS].border }];
    }
    if (statusId === TASK_STATUS.EN_COURS) {
      return [{ value: TASK_STATUS.VALIDE, label: "Marquer Validé", ...COLLAB_STATUS_META[TASK_STATUS.VALIDE], border: COLLAB_STATUS_META[TASK_STATUS.VALIDE].border }];
    }
    return [];
  };

  // ── Test OK ───────────────────────────────────────────────────────────────
  const handleTestOK = async () => {
    await doChange(TASK_STATUS.TERMINE, "Tâche validée après test — OK");
  };

  // ── Test KO ───────────────────────────────────────────────────────────────
  const handleTestKO = async () => {
    if (!koMotif.trim()) { setKoErr("Un motif est obligatoire pour un refus KO."); return; }
    setSavingKo(true); setKoErr(null);
    try {
      await doChange(TASK_STATUS.A_REFAIRE, koMotif.trim());
      setShowKoForm(false); setKoMotif("");
    } catch { setKoErr("Erreur lors du changement de statut."); }
    finally { setSavingKo(false); }
  };

  const meta      = COLLAB_STATUS_META[statusId] ?? COLLAB_STATUS_META[1];
  const isTermine = statusId === TASK_STATUS.TERMINE;
  const isValide  = statusId === TASK_STATUS.VALIDE;     // soumis par collab, attend CP
  const isRefaire = statusId === TASK_STATUS.A_REFAIRE;
  const collabOpts = collabOptions();
  const lastKO  = isRefaire ? [...hist].reverse().find(h => h.status.id === TASK_STATUS.A_REFAIRE) : null;

  // ── Statut test courant (lecture de l'historique) ─────────────────────────
  const lastTest = [...hist].reverse().find(h => h.status.id === TASK_STATUS.TERMINE || h.status.id === TASK_STATUS.A_REFAIRE);
  const testMeta = isTermine ? TEST_META.OK : isRefaire ? TEST_META.KO : null;

  return (
    <div className="tsc-cell" ref={ref}>

      {/* ══ LIGNE 1 : Statut tâche (collab) + Statut test (CP) ══ */}
      <div className="tsc-row">

        {/* ── Statut tâche (dropdown collab) ── */}
        <div className="tsc-group">
          <span className="tsc-group__label">Statut tâche</span>
          {isTermine ? (
            // Terminé — statique
            <span className="tsc-inline-dd__badge tsc-badge--static"
              style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
              <span className="tsc-dot" style={{ background: meta.color }} />{meta.label}
            </span>
          ) : (isCollaborator || isValidator) && collabOpts.length > 0 ? (
            // Collab ou CP/BA peuvent changer le statut tâche
            <InlineDropdown
              currentLabel={meta.label} currentColor={meta.color}
              currentBg={meta.bg} currentBorder={meta.border}
              options={collabOpts}
              onSelect={(v) => doChange(v as number, v === TASK_STATUS.EN_COURS ? "Tâche démarrée" : "Tâche validée par le collaborateur")}
            />
          ) : (
            // Lecture seule (autre rôle ou plus d'action possible)
            <span className="tsc-inline-dd__badge tsc-badge--static"
              style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
              <span className="tsc-dot" style={{ background: meta.color }} />{meta.label}
            </span>
          )}
        </div>

        {/* ── Statut test (dropdown CP/BA — visible seulement si VALIDE ou déjà testé) ── */}
        {(isValide || isTermine || isRefaire) && (
          <div className="tsc-group">
            <span className="tsc-group__label">Statut test</span>
            {isValidator && isValide ? (
              // CP peut agir : dropdown OK / KO
              <div className="tsc-test-actions">
                <button className="tsc-test-btn tsc-test-btn--ok" onClick={handleTestOK} title="Valider — terminé">
                  ✓ OK
                </button>
                <button className="tsc-test-btn tsc-test-btn--ko" onClick={() => { setShowKoForm(v => !v); setKoErr(null); }} title="Refuser — à refaire">
                  ✕ KO
                </button>
              </div>
            ) : testMeta ? (
              // Résultat déjà posé
              <span className="tsc-inline-dd__badge tsc-badge--static"
                style={{ color: testMeta.color, background: testMeta.bg, borderColor: testMeta.border }}>
                <span className="tsc-dot" style={{ background: testMeta.color }} />{testMeta.label}
              </span>
            ) : (
              <span className="tsc-inline-dd__badge tsc-badge--static" style={{ color:"#94a3b8", background:"#f8fafc", borderColor:"#e2e8f0" }}>
                <span className="tsc-dot" style={{ background:"#cbd5e1" }} />En attente
              </span>
            )}
          </div>
        )}
      </div>

      {/* ══ Formulaire motif KO ══ */}
      {showKoForm && (
        <div className="tsc-ko-form">
          {koErr && <div className="tsc-ko-form__err">{koErr}</div>}
          <textarea
            className="tsc-ko-form__ta"
            placeholder="Motif du refus (obligatoire)…"
            value={koMotif}
            onChange={e => { setKoMotif(e.target.value); setKoErr(null); }}
            rows={2}
            autoFocus
          />
          <div className="tsc-ko-form__actions">
            <button className="tsc-ko-form__cancel" onClick={() => { setShowKoForm(false); setKoMotif(""); setKoErr(null); }} disabled={savingKo}>
              Annuler
            </button>
            <button className="tsc-ko-form__confirm" onClick={handleTestKO} disabled={savingKo || !koMotif.trim()}>
              {savingKo ? <FaSpinner size={10} className="tsc-spin" /> : null} Confirmer KO
            </button>
          </div>
        </div>
      )}

      {/* ══ Bandeau motif KO visible collab ══ */}
      {isRefaire && lastKO && (
        <div className="tsc-ko-banner">
          <span className="tsc-ko-banner__motif">⚠ {lastKO.commentaire}</span>
          {lastKO.modifiedBy && <span className="tsc-ko-banner__by">— {lastKO.modifiedBy.username}</span>}
        </div>
      )}

      {/* ══ Historique ══ */}
      <button className="tsc-hist-toggle" onClick={() => setShowHist(v => !v)}>
        <FaHistory size={8} /> {showHist ? "Masquer" : "Historique"}
      </button>
      {showHist && (
        <div className="tsc-hist">
          {hist.length === 0
            ? <p className="tsc-hist__empty">Aucun historique</p>
            : [...hist].reverse().map(h => {
                const m = COLLAB_STATUS_META[h.status.id] ?? { color: "#64748b", bg: "#f1f5f9" };
                return (
                  <div key={h.id} className="tsc-hist__item">
                    <span className="tsc-dot" style={{ background: m.color, flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 600, color: m.color }}>{h.status.label}</span>
                      {h.modifiedBy && <span style={{ fontSize: "0.65rem", color: "#64748b" }}> — {h.modifiedBy.username}</span>}
                      <span style={{ fontSize: "0.62rem", color: "#94a3b8" }}> {fmtDate(h.dateChangement)}</span>
                      {h.commentaire && <div style={{ fontSize: "0.65rem", color: "#64748b", fontStyle: "italic" }}>{h.commentaire}</div>}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
};

export default TaskStatusCell;
