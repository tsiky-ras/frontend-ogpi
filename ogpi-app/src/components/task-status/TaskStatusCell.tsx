import React, { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaSpinner, FaHistory, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import "./TaskStatusCell.css";

// ─── IDs backend (ProjectTaskConstant.java) ───────────────────────────────────
// 1=Affecté  2=Réattribué  3=À modifier  4=En cours  5=En attente validation  6=Validé
export const TASK_STATUS = {
  AFFECTE:              1,
  REATTRIBUE:           2,
  A_MODIFIER:           3,
  EN_COURS:             4,
  EN_ATTENTE_VALIDATION:5,
  VALIDE:               6,
} as const;

const STATUS_META: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: "Affecté",               color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  2: { label: "Réattribué",            color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  3: { label: "À modifier",            color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  4: { label: "En cours",              color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  5: { label: "En attente validation", color: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  6: { label: "Validé ✓",              color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
};

const sm = (id: number) => STATUS_META[id] ?? { label: "Inconnu", color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" };

export interface TaskStatusEntry {
  id: number;
  dateChangement: string;
  commentaire: string;
  modifiedBy: { id: number; username: string } | null;
  status: { id: number; label: string };
  backlogLineProfilId?: number;
}
export interface StatusHistoryEntry extends TaskStatusEntry {}

const fmtDate = (iso: string) => {
  try {
    const d = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
    return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

export interface TaskStatusCellProps {
  taskId: number;
  currentStatusId: number;
  history: TaskStatusEntry[];
  isValidator: boolean;
  isCollaborator: boolean;
  collaborateurNom?: string | null;
  onChangeStatus: (taskId: number, statusId: number, comment: string) => Promise<TaskStatusEntry>;
}

const TaskStatusCell: React.FC<TaskStatusCellProps> = ({
  taskId, currentStatusId, history, isValidator, isCollaborator,
  collaborateurNom, onChangeStatus,
}) => {
  const [statusId, setStatusId]     = useState(currentStatusId);
  const [hist, setHist]             = useState(history);
  const [saving, setSaving]         = useState(false);
  const [ddOpen, setDdOpen]         = useState(false);
  const [showHist, setShowHist]     = useState(false);
  const [koForm, setKoForm]         = useState(false);
  const [koMotif, setKoMotif]       = useState("");
  const [koErr, setKoErr]           = useState<string | null>(null);
  const [savingKo, setSavingKo]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDdOpen(false); setShowHist(false); setKoForm(false); setKoErr(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const doChange = async (newId: number, comment: string) => {
    setSaving(true);
    try {
      const entry = await onChangeStatus(taskId, newId, comment);
      setStatusId(entry.status.id);
      setHist(prev => [...prev, entry]);
    } finally { setSaving(false); setDdOpen(false); }
  };

  const meta     = sm(statusId);
  const isValide = statusId === TASK_STATUS.VALIDE;
  const isEnAttenteValidation = statusId === TASK_STATUS.EN_ATTENTE_VALIDATION;

  // ── Options disponibles selon rôle et statut ──────────────────────────────
  // Collaborateur : progression normale
  const collabNext: Array<{ id: number; label: string }> = [];
  if (statusId === TASK_STATUS.AFFECTE || statusId === TASK_STATUS.REATTRIBUE || statusId === TASK_STATUS.A_MODIFIER) {
    collabNext.push({ id: TASK_STATUS.EN_COURS, label: "▶ Démarrer (En cours)" });
  }
  if (statusId === TASK_STATUS.EN_COURS) {
    collabNext.push({ id: TASK_STATUS.EN_ATTENTE_VALIDATION, label: "↑ Soumettre pour validation" });
  }

  // Validator : OK ou KO
  const canValidate = isValidator && isEnAttenteValidation;

  // Qui peut interagir
  const canAct = (isCollaborator && collabNext.length > 0) || canValidate;

  // Dernier KO pour afficher le motif au collab
  const lastKO = statusId === TASK_STATUS.A_MODIFIER
    ? [...hist].reverse().find(h => h.status.id === TASK_STATUS.A_MODIFIER)
    : null;

  return (
    <div className="tsc-cell" ref={ref}>

      {/* ── Badge statut cliquable ── */}
      <div className="tsc-badge-row">
        <button
          className={`tsc-badge${canAct ? " tsc-badge--active" : ""}`}
          style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
          onClick={() => canAct && setDdOpen(v => !v)}
          disabled={saving || !canAct}
          title={canAct ? "Changer le statut" : ""}
        >
          {saving
            ? <FaSpinner size={8} className="tsc-spin" />
            : <span className="tsc-dot" style={{ background: meta.color }} />
          }
          {meta.label}
          {canAct && <FaChevronDown size={8} className={`tsc-chevron${ddOpen ? " tsc-chevron--up" : ""}`} />}
        </button>

        {/* Bouton historique */}
        <button className="tsc-hist-btn" onClick={() => setShowHist(v => !v)} title="Historique">
          <FaHistory size={9} />
        </button>
      </div>

      {/* ── Dropdown ── */}
      {ddOpen && canAct && (
        <div className="tsc-dropdown">

          {/* Options collaborateur */}
          {isCollaborator && collabNext.map(opt => {
            const m = sm(opt.id);
            return (
              <button key={opt.id} className="tsc-dd-item"
                style={{ color: m.color, background: m.bg, borderColor: m.border }}
                onClick={() => doChange(opt.id, opt.id === TASK_STATUS.EN_COURS ? "Tâche démarrée" : "Soumis pour validation")}>
                <span className="tsc-dot" style={{ background: m.color }} />
                {opt.label}
              </button>
            );
          })}

          {/* OK / KO pour validateur */}
          {canValidate && (
            <>
              <button className="tsc-dd-item tsc-dd-item--ok"
                onClick={() => { doChange(TASK_STATUS.VALIDE, "Tâche validée — OK"); setDdOpen(false); }}>
                <FaCheckCircle size={11} /> OK — Valider (Terminé)
              </button>
              <button className="tsc-dd-item tsc-dd-item--ko"
                onClick={() => { setDdOpen(false); setKoForm(true); setKoErr(null); }}>
                <FaTimesCircle size={11} /> KO — Renvoyer (Réattribuer)
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Formulaire motif KO ── */}
      {koForm && (
        <div className="tsc-ko-form">
          {koErr && <div className="tsc-ko-form__err">{koErr}</div>}
          <textarea
            className="tsc-ko-form__ta"
            placeholder="Motif du refus (obligatoire)…"
            value={koMotif}
            onChange={e => { setKoMotif(e.target.value); setKoErr(null); }}
            rows={2} autoFocus
          />
          <div className="tsc-ko-form__actions">
            <button className="tsc-ko-cancel"
              onClick={() => { setKoForm(false); setKoMotif(""); setKoErr(null); }}
              disabled={savingKo}>Annuler</button>
            <button className="tsc-ko-confirm"
              onClick={async () => {
                if (!koMotif.trim()) { setKoErr("Motif obligatoire."); return; }
                setSavingKo(true); setKoErr(null);
                try {
                  // KO → Réattribué (id=2) pour que le collab le retrouve dans "Mes tâches"
                  await doChange(TASK_STATUS.REATTRIBUE, koMotif.trim());
                  setKoForm(false); setKoMotif("");
                } catch { setKoErr("Erreur."); }
                finally { setSavingKo(false); }
              }}
              disabled={savingKo || !koMotif.trim()}>
              {savingKo ? <FaSpinner size={10} className="tsc-spin" /> : null} Confirmer KO
            </button>
          </div>
        </div>
      )}

      {/* ── Bandeau motif KO (visible collab) ── */}
      {lastKO && (
        <div className="tsc-ko-banner">
          <FaTimesCircle size={9} style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="tsc-ko-motif">{lastKO.commentaire}</span>
          {lastKO.modifiedBy && <span className="tsc-ko-by">— {lastKO.modifiedBy.username}</span>}
        </div>
      )}

      {/* ── Historique ── */}
      {showHist && (
        <div className="tsc-hist">
          {hist.length === 0
            ? <p className="tsc-hist__empty">Aucun historique</p>
            : [...hist].reverse().map(h => {
                const m = sm(h.status.id);
                return (
                  <div key={h.id} className="tsc-hist__item">
                    <span className="tsc-dot" style={{ background: m.color, flexShrink: 0, marginTop: 2 }} />
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
