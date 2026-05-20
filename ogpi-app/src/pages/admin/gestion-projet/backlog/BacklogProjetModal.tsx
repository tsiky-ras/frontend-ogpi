import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiError } from "../../../../utils/apiError.ts";
  import ExportBacklogBtn, { ExportTabDef } from "../../../../components/export/ExportBacklogBtn.tsx";
  import Sortable from "sortablejs";

  import Button from "../../../../components/button/Button.tsx";
  import {
    FaPlus, FaSpinner, FaEdit, FaTrash, FaCalendar,
    FaChevronDown, FaChevronRight, FaUsers, FaUser, FaEye, FaEyeSlash,
    FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle,
    FaSearch, FaTimes, FaCheck,
  } from "react-icons/fa";
  import "../../gestion-lead/backlog/BacklogModal.css";
  import { Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";

  import { BacklogProjetService }       from "../../../../services/projet/backlog/BacklogProjetService.tsx";
  import { BacklogProjetLotService }    from "../../../../services/projet/backlog/BacklogProjetLotService.tsx";
  import { BacklogProjetPhaseService }  from "../../../../services/projet/backlog/BacklogProjetPhaseService.tsx";
  import { BacklogProjetProfilService } from "../../../../services/projet/backlog/BacklogProjetProfilService.tsx";
  import {
    BacklogProjetLineService,
    BacklogProjetLineProfilService,
  } from "../../../../services/projet/backlog/BacklogProjetLineService.tsx";
  import { BacklogProjetColumnService } from "../../../../services/projet/backlog/BacklogProjetColumnService.tsx";
  import { BacklogPlanningService }     from "../../../../services/lead/backlog/BacklogPlanningService.tsx";
  import { useProfilService }           from "../../../../services/profil/ProfilService.tsx";
  import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
  
  import {
    Backlog,
    BacklogLot,
    BacklogPhase,
    BacklogLine,
  } from "../../../../types/lead/Backlog/Backlog.tsx";
  import {
    BacklogProjetProfil,
    BacklogProjetLineProfil,
    BacklogSprint,
    BacklogDelivrableProjet,
    BacklogColumn,
    BacklogLineColumnValue,
    BacklogColumnType,
    CreateBacklogForProjetRequest,
  } from "../../../../types/projet/backlog/BacklogProjet.tsx";

  import { useAuth }  from "../../../../context/AuthContext.tsx";
  import { useNotifications } from "../../../../context/NotificationContext.tsx";
  import BacklogFormProjet from "./BacklogFormProjet.tsx";
  import PlanningTab  from "../../gestion-lead/backlog/PlanningTab.tsx";
  import BudgetTab    from "../../gestion-lead/backlog/BudgetTab.tsx";
  import ChargesAnnexesTab from "../tabs/ChargesAnnexesTab.tsx";
  import { ChargesAnnexesService } from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";
  import { ProjetService } from "../../../../services/projet/ProjetService.tsx";
  import FacturableProfil from "../tabs/FacturableProfil.tsx";
  import { BacklogDateService } from "../../../../services/projet/backlog/BacklogDateService.tsx";
  import CalendrierPaiementTab from "../tabs/CalendrierPaiementTab.tsx";
  import { CalendrierPaiementService } from "../../../../services/projet/paiement/CalendrierPaiementService.tsx";
import { BurndownService } from "../../../../services/projet/backlog/BurndownService.tsx";
import BurndownTab from "../tabs/BurndownTab.tsx";

  interface BacklogProjetModalProps {
    show:             boolean;
    onClose:          () => void;
    projetId:         number;
    projetNom?:       string;
    leadId:           number | null;
    projectStartDate?: string | null;
    projectEndDate?:   string | null;
  }

  interface ProfilFull extends BacklogProjetProfil {
    collaborateurs: any[];
  }

  const STATUS_TASK_META: Record<number, { label: string; color: string; bg: string; dot: string }> = {
    1: { label: "Attribué",   color: "#3b82f6", bg: "#eff6ff", dot: "#3b82f6" },
    2: { label: "Réattribué", color: "#f59e0b", bg: "#fffbeb", dot: "#f59e0b" },
    3: { label: "À modifier", color: "#ef4444", bg: "#fef2f2", dot: "#ef4444" },
    4: { label: "En cours",   color: "#8b5cf6", bg: "#f5f3ff", dot: "#8b5cf6" },
    5: { label: "Soumis",     color: "#f97316", bg: "#fff7ed", dot: "#f97316" },
    6: { label: "Validé",     color: "#10b981", bg: "#ecfdf5", dot: "#10b981" },
  };

  const taskStatusMeta = (id?: number | null) =>
    id != null && STATUS_TASK_META[id] ? STATUS_TASK_META[id] : null;

  const TaskStatusBadge: React.FC<{ statusId?: number | null }> = ({ statusId }) => {
    const m = taskStatusMeta(statusId);
    if (!m) return null;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: "0.6rem", fontWeight: 600, color: m.color,
        background: m.bg, border: `1px solid ${m.color}33`,
        borderRadius: 10, padding: "1px 5px", whiteSpace: "nowrap", letterSpacing: "0.02em",
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: m.dot, flexShrink: 0 }} />
        {m.label}
      </span>
    );
  };

  // ── Helper : formate une date ISO en "jj mmm aaaa" ──────────────────────────
  const fmtDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  // ── Badge dates inline ───────────────────────────────────────────────────────
  const DateBadge: React.FC<{ debut?: string | null; fin?: string | null; style?: React.CSSProperties }> = ({ debut, fin, style }) => {
    if (!debut && !fin) return null;
    return (
      <span style={{
        fontSize: "0.7rem", color: "#555", background: "#e8f4fd",
        border: "1px solid #b8d9f0", borderRadius: 4, padding: "1px 6px",
        whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3,
        ...style,
      }}>
        {fmtDate(debut)}{fin && fin !== debut ? ` → ${fmtDate(fin)}` : ""}
      </span>
    );
  };

  // ── Couleur barre de progression ─────────────────────────────────────────────
  const progressColor = (pct: number): string => {
    if (pct > 100) return "#dc3545";
    if (pct >= 80)  return "#ffc107";
    return "#198754";
  };

  // ── Couleur écart (temps passé = planifié - réalisation) ─────────────────────
  const ecartColor = (ecart: number): string => {
    if (ecart < 0) return "#dc3545";
    if (ecart === 0) return "#6c757d";
    return "#198754";
  };

  // ── Mini barre de progression inline ─────────────────────────────────────────
  const MiniProgressBar: React.FC<{ spent: number; planned: number }> = ({ spent, planned }) => {
    if (planned <= 0 || spent == null) return null;
    const pct = Math.round((spent / planned) * 100);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
      </div>
    );
  };

  // ── Constantes statut tâche ────────
  const TASK_STATUS = {
    AFFECTE:               1,
    REATTRIBUE:            2,
    A_MODIFIER:            3,
    EN_COURS:              4,
    EN_ATTENTE_VALIDATION: 5,
    VALIDE:                6,
  } as const;

  // ── TestStatusPanel modifié : logique conditionnelle selon le statut ──────────
  // Bouton OK visible si statut = EN_COURS(4) ou SOUMIS(5)
  // Bouton KO visible si statut = VALIDE(6) (régression possible)
  // Aucun bouton si statut ne le permet pas
  interface TestStatusPanelProps {
    taskId: number;
    currentStatusId?: number | null;   // statut actuel de la tâche (depuis currentStatus)
    currentTestStatus?: "ok" | "ko" | null;
    onDone: (taskId: number, result: "ok" | "ko", comment: string) => Promise<void>;
  }

  const TestStatusPanel: React.FC<TestStatusPanelProps> = ({
    taskId,
    currentStatusId,
    currentTestStatus,
    onDone,
  }) => {
    const [mode, setMode]       = React.useState<"ok" | "ko" | null>(null);
    const [comment, setComment] = React.useState("");
    const [saving, setSaving]   = React.useState(false);
    const [error, setError]     = React.useState<string | null>(null);

    // Logique d'affichage conditionnelle :
    // OK disponible si EN_COURS(4) ou SOUMIS(5)
    // KO disponible si VALIDE(6)
    const canOK = currentStatusId === TASK_STATUS.EN_COURS || currentStatusId === TASK_STATUS.EN_ATTENTE_VALIDATION;
    const canKO = currentStatusId === TASK_STATUS.VALIDE;

    const handleSubmit = async () => {
      if (!mode) return;
      setSaving(true); setError(null);
      try {
        await onDone(
          taskId,
          mode,
          comment.trim() || (mode === "ok" ? "Test OK" : "Test KO — à retravailler")
        );
        setMode(null); setComment("");
      } catch { setError("Erreur lors de l'enregistrement."); }
      finally { setSaving(false); }
    };

    // Si ni OK ni KO n'est disponible (statut ne le permet pas)
    if (!canOK && !canKO && !currentTestStatus) {
      return <span style={{ fontSize: "0.62rem", color: "#94a3b8" }}>—</span>;
    }

    // Si un statut de test existe déjà et qu'on n'est pas en mode saisie
    if (!mode && currentTestStatus) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: "0.68rem", fontWeight: 700,
            color: currentTestStatus === "ok" ? "#16a34a" : "#dc2626",
            background: currentTestStatus === "ok" ? "#f0fdf4" : "#fff5f5",
            border: `1.5px solid ${currentTestStatus === "ok" ? "#86efac" : "#fca5a5"}`,
            borderRadius: 10, padding: "2px 8px",
          }}>
            {currentTestStatus === "ok" ? <FaCheckCircle size={9} /> : <FaTimesCircle size={9} />}
            Test {currentTestStatus.toUpperCase()}
          </span>
          {/* Boutons conditionnels pour changer */}
          <div style={{ display: "flex", gap: 3 }}>
            {canOK && (
              <button
                style={{
                  fontSize: "0.58rem", padding: "1px 6px", borderRadius: 5,
                  background: "transparent", border: "1px solid #86efac",
                  color: "#16a34a", cursor: "pointer",
                }}
                onClick={() => { setMode("ok"); setComment(""); setError(null); }}>
                OK
              </button>
            )}
            {canKO && (
              <button
                style={{
                  fontSize: "0.58rem", padding: "1px 6px", borderRadius: 5,
                  background: "transparent", border: "1px solid #fca5a5",
                  color: "#dc2626", cursor: "pointer",
                }}
                onClick={() => { setMode("ko"); setComment(""); setError(null); }}>
                KO
              </button>
            )}
          </div>
        </div>
      );
    }

    // Boutons principaux — affichés selon statut
    if (!mode) return (
      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
        {canOK && (
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
              color: "#16a34a", background: "#f0fdf4", border: "1.5px solid #86efac",
              cursor: "pointer", transition: "all .1s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#16a34a"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf4"; (e.currentTarget as HTMLButtonElement).style.color = "#16a34a"; }}
            onClick={() => { setMode("ok"); setComment(""); setError(null); }}
            title="Test passé — OK">
            <FaCheckCircle size={10} /> OK
          </button>
        )}
        {canKO && (
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
              color: "#dc2626", background: "#fff5f5", border: "1.5px solid #fca5a5",
              cursor: "pointer", transition: "all .1s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5"; (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
            onClick={() => { setMode("ko"); setComment(""); setError(null); }}
            title="Test échoué — KO, ré-affectation">
            <FaTimesCircle size={10} /> KO
          </button>
        )}
        {/* Si aucun bouton disponible mais pas de statut test non plus */}
        {!canOK && !canKO && (
          <span style={{ fontSize: "0.62rem", color: "#94a3b8" }}>—</span>
        )}
      </div>
    );

    // Mode saisie commentaire
    return (
      <div style={{
        background: mode === "ok" ? "#f0fdf4" : "#fff5f5",
        border: `1px solid ${mode === "ok" ? "#86efac" : "#fca5a5"}`,
        borderRadius: 7, padding: "7px 8px", width: "100%",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: "0.7rem", fontWeight: 700,
          color: mode === "ok" ? "#16a34a" : "#dc2626",
          marginBottom: 5,
        }}>
          {mode === "ok" ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
          {mode === "ok" ? "Confirmer Test OK" : "Test KO — motif de ré-affectation"}
        </div>
        {error && <div style={{ fontSize: "0.67rem", color: "#dc2626", marginBottom: 4 }}>{error}</div>}
        <textarea
          style={{
            width: "100%", padding: "4px 6px",
            border: `1px solid ${mode === "ok" ? "#86efac" : "#fca5a5"}`,
            borderRadius: 5, fontSize: "0.71rem", resize: "vertical",
            minHeight: 44, fontFamily: "inherit",
            boxSizing: "border-box" as const, outline: "none",
          }}
          placeholder={mode === "ok" ? "Commentaire (optionnel)…" : "Motif du KO (recommandé)…"}
          value={comment}
          onChange={e => { setComment(e.target.value); setError(null); }}
          rows={2}
          autoFocus
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, marginTop: 5 }}>
          <button
            style={{ padding: "2px 8px", fontSize: "0.68rem", borderRadius: 5, background: "transparent", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer" }}
            onClick={() => { setMode(null); setComment(""); setError(null); }}
            disabled={saving}>
            Annuler
          </button>
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700, borderRadius: 5,
              background: mode === "ok" ? "#16a34a" : "#dc2626",
              color: "#fff", border: "none",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
            onClick={handleSubmit}
            disabled={saving}>
            {saving ? <FaSpinner size={9} className="fa-spin" /> : mode === "ok" ? <FaCheckCircle size={9} /> : <FaTimesCircle size={9} />}
            {mode === "ok" ? "Valider OK" : "Confirmer KO"}
          </button>
        </div>
      </div>
    );
  };

  const BacklogProjetModal: React.FC<BacklogProjetModalProps> = ({
    show, onClose, projetId, projetNom, leadId, projectStartDate, projectEndDate,
  }) => {
    const { api, user } = useAuth();
    const { refresh: refreshNotifications } = useNotifications();
    const collaborateurService = useProfilService();

    // ── Rôle utilisateur : CP / BA / Suppléant peuvent valider ───────────────
    const isValidator = React.useMemo(() => {
      const role = (user?.role?.roleLabel ?? "").toLowerCase();
      return role.includes("chef") || role.includes("cp") ||
             role.includes("suppl") || role.includes("ba") ||
             role.includes("business analyst");
    }, [user]);

    const projetService = useMemo(() => new ProjetService(api), [api]);
    const svc = useRef({
      backlog        : new BacklogProjetService(api),
      lot            : new BacklogProjetLotService(api),
      phase          : new BacklogProjetPhaseService(api),
      profil         : new BacklogProjetProfilService(api),
      line           : new BacklogProjetLineService(api),
      lineProfil     : new BacklogProjetLineProfilService(api),
      column         : new BacklogProjetColumnService(api),
      planning       : new BacklogPlanningService(api),
      date           : new BacklogDateService(api),
      paiement       : new CalendrierPaiementService(api),
      burndown       : new BurndownService(api),
      chargesAnnexes : new ChargesAnnexesService(api),
    }).current;

    // ── Appel API changeStatus OK/KO ──────────────────────────────────────────
    const handleTestStatus = React.useCallback(async (
      taskId: number, result: "ok" | "ko", comment: string
    ) => {
      const newStatusId = result === "ok" ? TASK_STATUS.VALIDE : TASK_STATUS.REATTRIBUE;
      await svc.lineProfil.changeStatus(taskId, newStatusId, comment);
      // ── Rafraîchir les notifications du chef de projet ────────────────────
      refreshNotifications();
      setLineProfils(prev => prev.map(lp =>
        lp.id === taskId
          ? { ...lp, currentStatus: { status: { id: newStatusId, label: STATUS_TASK_META[newStatusId]?.label ?? "" } } } as any
          : lp
      ));
      setTestStatuses(prev => {
        const m = new Map(prev);
        m.set(taskId, result);
        return m;
      });
    }, [svc]);

    const [backlog,     setBacklog]     = useState<Backlog | null>(null);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState<string | null>(null);
    const [saving,      setSaving]      = useState(false);

    const [loadingBacklogs,   setLoadingBacklogs]   = useState(false);
    const [selectedBacklogId, setSelectedBacklogId] = useState<number | null>(null);
    const [showBacklogForm,   setShowBacklogForm]   = useState(false);
    const [backlogHeader,     setBacklogHeader]     = useState<Backlog | null>(null);

    const [lots,        setLots]        = useState<BacklogLot[]>([]);
    const [profils,     setProfils]     = useState<ProfilFull[]>([]);
    const [lines,       setLines]       = useState<BacklogLine[]>([]);
    const [lineProfils, setLineProfils] = useState<BacklogProjetLineProfil[]>([]);

    const [sprints,      setSprints]      = useState<Map<number, BacklogSprint[]>>(new Map());
    const [deliverables, setDeliverables] = useState<Map<number, BacklogDelivrableProjet[]>>(new Map());
    const [columns,      setColumns]      = useState<Map<number, BacklogColumn[]>>(new Map());
    const [colValues,    setColValues]    = useState<Map<number, BacklogLineColumnValue[]>>(new Map());
    const [allCollabs,   setAllCollabs]   = useState<any[]>([]);
    const [fCollabId,    setFCollabId]    = useState<number | null>(null);

    // ── Statuts de test par lineProfil id : "ok" | "ko" ─────────────────────
    const [testStatuses, setTestStatuses] = useState<Map<number, "ok" | "ko">>(new Map());

    const [activeTab,       setActiveTab]       = useState("backlog");
    const [expandedPhases,  setExpandedPhases]  = useState<Set<number>>(new Set());
    const [expandedSprints, setExpandedSprints] = useState<Map<number, Set<number>>>(new Map());
    const [expandedLines,   setExpandedLines]   = useState<Set<number>>(new Set());
    const leadTechFinService = useLeadTechFinDetailsService();
    const [deviseAbr, setDeviseAbr] = useState<string>("€");
    const [budgetRH, setBudgetRH]   = useState<number>(0);
    const [montantOffre, setMontantOffre] = useState<number>(0);

    const [showProfilCols, setShowProfilCols] = useState(true);

    const [expandedRecapLots,   setExpandedRecapLots]   = useState<Set<number>>(new Set());
    const [expandedRecapPhases, setExpandedRecapPhases] = useState<Set<number>>(new Set());
    const [expandedProfilRecap, setExpandedProfilRecap] = useState<Set<number>>(new Set());
    const [expandedProfilLots,  setExpandedProfilLots]  = useState<Map<number, Set<number>>>(new Map());

    const [showLotModal,    setShowLotModal]    = useState(false);
    const [showPhaseModal,  setShowPhaseModal]  = useState(false);
    const [showSprintModal, setShowSprintModal] = useState(false);
    const [showDelivModal,  setShowDelivModal]  = useState(false);
    const [showProfilModal, setShowProfilModal] = useState(false);
    const [showCollabModal, setShowCollabModal] = useState(false);
    const [showLineModal,   setShowLineModal]   = useState(false);
    const [showVolModal,    setShowVolModal]    = useState(false);
    const [showColModal,    setShowColModal]    = useState(false);
    const [showCellModal,   setShowCellModal]   = useState(false);
    const [collabSearch,     setCollabSearch]     = useState("");
    const [collabSearchType, setCollabSearchType] = useState<"name" | "poste">("name");

    const [editLot,        setEditLot]        = useState<BacklogLot | null>(null);
    const [editPhase,      setEditPhase]      = useState<BacklogPhase | null>(null);
    const [editSprint,     setEditSprint]     = useState<BacklogSprint | null>(null);
    const [editDeliv,      setEditDeliv]      = useState<BacklogDelivrableProjet | null>(null);
    const [editProfil,     setEditProfil]     = useState<ProfilFull | null>(null);
    const [collabProfil,   setCollabProfil]   = useState<ProfilFull | null>(null);
    const [editLine,       setEditLine]       = useState<BacklogLine | null>(null);
    const [editLineProfil, setEditLineProfil] = useState<BacklogProjetLineProfil | null>(null);
    const [editCol,        setEditCol]        = useState<BacklogColumn | null>(null);
    const [editCell,       setEditCell]       = useState<{ lineId: number; columnId: number } | null>(null);

    const [ctxLotId,    setCtxLotId]    = useState<number | null>(null);
    const [ctxPhaseId,  setCtxPhaseId]  = useState<number | null>(null);
    const [ctxSprintId, setCtxSprintId] = useState<number | null>(null);
    const [ctxLineId,   setCtxLineId]   = useState<number | null>(null);
    const [ctxProfilId, setCtxProfilId] = useState<number | null>(null);
    const currentProfil = profils.find(p => p.id === ctxProfilId) ?? null;

    const [fLot,       setFLot]       = useState({ name: "", desc: "" });
    const [fPhase,     setFPhase]     = useState({ name: "" });
    const [fSprint,    setFSprint]    = useState({ name: "", startDate: "", endDate: "" });
    const [fDeliv,     setFDeliv]     = useState({ name: "", description: "", deliveryDate: "", sprintId: null as number | null });
    const [fProfil,    setFProfil]    = useState({ name: "", desc: "", tjm: 0, order: 0 });
    const [fCollabIds, setFCollabIds] = useState<number[]>([]);
    const [fLine,      setFLine]      = useState({
      epic: "", userStory: "", description: "", resultat: "",
      lotId: null as number | null, phaseId: null as number | null, sprintId: null as number | null,
      facturable: true,
    });
    const [fVolume,    setFVolume]    = useState(0);
    const [fDeadline,  setFDeadline]  = useState<string>("");
    const [fTimeSpent, setFTimeSpent] = useState<number | null>(null);
    const [fCol,       setFCol]       = useState({ name: "", type: "TEXT" as BacklogColumnType });
    const [fCellVal,   setFCellVal]   = useState("");

    // ── État sélection ressource dans le modal volume ─────────────────────────
    // "profilId-collaborateurId" ou "profilId-null"
    const [fSelectedRessource, setFSelectedRessource] = useState<string>("");

    const [linePage,     setLinePage]     = useState(1);
    const LINE_PAGE_SIZE = 20;

    const exportCaptureRef = useRef<HTMLDivElement | null>(null);
    const lineBodyRef    = useRef<HTMLTableSectionElement | null>(null);
    const lotsRef        = useRef<HTMLDivElement | null>(null);
    const profilsRef     = useRef<HTMLDivElement | null>(null);
    const lineSortable   = useRef<Sortable | null>(null);
    const lotSortable    = useRef<Sortable | null>(null);
    const profilSortable = useRef<Sortable | null>(null);
    const phaseSortableRefs  = useRef<Map<number, Sortable>>(new Map());
    const sprintSortableRefs = useRef<Map<number, Sortable>>(new Map());

    // ══════════════════════════════════════════════════════════════════════
    // CHARGEMENT
    // ══════════════════════════════════════════════════════════════════════

    const hydrateFromFull = useCallback((full: any) => {
      setBacklog(full);
      const sortedLots: BacklogLot[] = (full.lots ?? []).sort((a: any, b: any) => a.order - b.order);
      setLots(sortedLots);
      const spMap  = new Map<number, BacklogSprint[]>();
      const dlvMap = new Map<number, BacklogDelivrableProjet[]>();
      for (const lot of sortedLots) {
        for (const phase of (lot.phases ?? []) as any[]) {
          const phaseSprints = (phase.sprints ?? []).sort((a: any, b: any) => a.order - b.order);
          spMap.set(phase.id, phaseSprints);
          const phaseDelivs: any[] = phase.deliverables ?? [];
          const sprintDelivs: any[] = phaseSprints.flatMap((s: any) =>
            (s.deliverables ?? []).map((d: any) => ({ ...d, sprintId: d.sprintId ?? s.id }))
          );
          const allDelivs = [...phaseDelivs, ...sprintDelivs].filter(
            (d, i, arr) => arr.findIndex(x => x.id === d.id) === i
          );
          dlvMap.set(phase.id, allDelivs.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
        }
      }
      setSprints(spMap);
      setDeliverables(dlvMap);
      const rawProfils: any[] = full.profilsProjet ?? full.profils ?? [];
      setProfils(rawProfils.sort((a: any, b: any) => a.order - b.order).map((p: any) => ({ ...p, collaborateurs: p.collaborateurs ?? [] })));
      setLines(
      (full.lines ?? [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((l: any) => ({
          ...l,
          facturable: l.facturable ?? l.isFacturable ?? true,
        }))
    );
    }, []);

    const loadColumnsAndValues = useCallback(async (full: any) => {
      const allSprints: any[] = (full.lots ?? []).flatMap((l: any) => l.phases ?? []).flatMap((p: any) => p.sprints ?? []);
      const allLines: any[] = full.lines ?? [];
      const colMap = new Map<number, BacklogColumn[]>();
      const valMap = new Map<number, BacklogLineColumnValue[]>();
      await Promise.all([
        ...allSprints.map(async (s: any) => {
          if (s.columns && Array.isArray(s.columns)) { colMap.set(s.id, s.columns); }
          else { try { colMap.set(s.id, await svc.column.getColumnsBySprintId(s.id)); } catch { colMap.set(s.id, []); } }
        }),
        ...allLines.map(async (l: any) => {
          try { valMap.set(l.id, await svc.column.getValuesByLineId(l.id)); } catch { valMap.set(l.id, []); }
        }),
      ]);
      setColumns(colMap);
      setColValues(valMap);
    }, []);

    const loadLineProfils = useCallback(async (backlogId: number) => {
      try { setLineProfils(await svc.lineProfil.getAllLineProfilsByBacklogId(backlogId)); }
      catch { setLineProfils([]); }
    }, []);

    const loadAllCollabs = useCallback(async () => {
      try { const data = await collaborateurService.getAll(); setAllCollabs(Array.isArray(data) ? data : []); }
      catch { setAllCollabs([]); }
    }, [collaborateurService]);

    const fetchBacklogHeader = useCallback(async () => {
      setLoadingBacklogs(true); setError(null);
      try {
        const existingHeader = await svc.backlog.getHeaderByProjetId(projetId);
        if (existingHeader?.id) { setBacklogHeader(existingHeader); setSelectedBacklogId(existingHeader.id); return; }
        setBacklogHeader(null);
      } catch { setError("Impossible de charger le backlog."); }
      finally { setLoadingBacklogs(false); }
    }, [projetId]);

    const loadFull = useCallback(async () => {
      if (!selectedBacklogId) return;
      setLoading(true); setError(null);
      try {
        const full = await svc.backlog.getFullById(selectedBacklogId);
        console.log(full);
        if (!full) return;
        hydrateFromFull(full);
        await Promise.all([loadLineProfils(full.id), loadColumnsAndValues(full), loadAllCollabs()]);
      } catch { setError("Impossible de charger le backlog."); }
      finally { setLoading(false); }
    }, [selectedBacklogId]);

    const reload = useCallback(async () => {
      if (!selectedBacklogId) return;
      setLoading(true);
      try {
        const full = await svc.backlog.getFullById(selectedBacklogId);
        if (full) { hydrateFromFull(full); await Promise.all([loadLineProfils(full.id), loadColumnsAndValues(full)]); }
      } catch { setError("Impossible de recharger les données."); }
      finally { setLoading(false); }
    }, [selectedBacklogId]);

    const reloadLots = useCallback(async () => {
      if (!selectedBacklogId) return;
      try {
        const full = await svc.backlog.getFullById(selectedBacklogId);
        if (!full) return;
        const sortedLots: BacklogLot[] = (full.lots ?? []).sort((a: any, b: any) => a.order - b.order);
        setLots(sortedLots);
        const spMap  = new Map<number, BacklogSprint[]>();
        const dlvMap = new Map<number, BacklogDelivrableProjet[]>();
        for (const lot of sortedLots) {
          for (const phase of (lot.phases ?? []) as any[]) {
            const phaseSprints = (phase.sprints ?? []).sort((a: any, b: any) => a.order - b.order);
            spMap.set(phase.id, phaseSprints);
            const phaseDelivs: any[] = phase.deliverables ?? [];
            const sprintDelivs: any[] = phaseSprints.flatMap((s: any) =>
              (s.deliverables ?? []).map((d: any) => ({ ...d, sprintId: d.sprintId ?? s.id }))
            );
            const allDelivs = [...phaseDelivs, ...sprintDelivs].filter(
              (d, i, arr) => arr.findIndex(x => x.id === d.id) === i
            );
            dlvMap.set(phase.id, allDelivs.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
          }
        }
        setSprints(spMap);
        setDeliverables(dlvMap);
        // ── Met aussi à jour le backlog header pour avoir la bonne date de début ──
        setBacklog(full);
      } catch (err) {
        console.warn("reloadLots échoué (non bloquant):", err);
      }
    }, [selectedBacklogId]);

    useEffect(() => {
      if (!leadId) { setDeviseAbr("€"); setMontantOffre(0); return; }
      (async () => {
        try {
          const techFin = await leadTechFinService.getByLeadId(leadId);
          setDeviseAbr((techFin && techFin.devise?.abrDevise) || "€");
          setMontantOffre(techFin?.montantOffre || techFin?.budget || 0);
        }
        catch { setDeviseAbr("€"); setMontantOffre(0); }
      })();
    }, [leadId]);

    useEffect(() => {
      if (!show || !projetId) return;
      setBacklog(null); setBacklogHeader(null); setLots([]); setProfils([]); setLines([]);
      setLineProfils([]); setSprints(new Map()); setDeliverables(new Map());
      setColumns(new Map()); setColValues(new Map()); setAllCollabs([]);
      setError(null); setShowBacklogForm(false); setActiveTab("backlog");
      setSelectedBacklogId(null);
      setExpandedPhases(new Set()); setExpandedSprints(new Map()); setExpandedLines(new Set());
      setTestStatuses(new Map());
      setMontantOffre(0);
      fetchBacklogHeader();
    }, [show, projetId]);

    useEffect(() => { if (selectedBacklogId) loadFull(); }, [selectedBacklogId]);

    const handleBackToList = () => {
      setSelectedBacklogId(null);
      setBacklog(null); setLots([]); setProfils([]); setLines([]);
      setLineProfils([]); setSprints(new Map()); setDeliverables(new Map());
      setColumns(new Map()); setColValues(new Map());
      setExpandedPhases(new Set()); setExpandedSprints(new Map()); setExpandedLines(new Set());
    };

    // ══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════

    const getAllPhases = (): BacklogPhase[] => lots.flatMap(l => (l.phases ?? []) as BacklogPhase[]);
    const getLotByPhaseId = (phaseId: number | null): BacklogLot | undefined =>
      lots.find(l => (l.phases ?? []).some((p: any) => p.id === phaseId));
    const getPhaseNameById = (id: number | null): string =>
      id ? getAllPhases().find(p => p.id === id)?.name ?? "—" : "—";
    const getLineProfil = (lineId: number, profilId: number) =>
      lineProfils.find(lp => lp.lineId === lineId && (lp.profil as any)?.id === profilId) ?? null;
    const getLineJH = (lineId: number) =>
      lineProfils.filter(lp => lp.lineId === lineId).reduce((s, lp) => s + lp.volume, 0);

    const getLotDates = (lot: BacklogLot): { debut: string | null; fin: string | null } => {
      const phases = (lot.phases ?? []) as any[];
      return phases.reduce<{ debut: string | null; fin: string | null }>(
        (acc, p) => ({
          debut: !acc.debut ? (p.dateDebut ?? null) : !p.dateDebut ? acc.debut : p.dateDebut < acc.debut ? p.dateDebut : acc.debut,
          fin: !acc.fin ? (p.dateFin ?? null) : !p.dateFin ? acc.fin : p.dateFin > acc.fin ? p.dateFin : acc.fin,
        }),
        { debut: null, fin: null }
      );
    };

    const fmtJH = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fmtMnt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

    const fmtEcart = (ecart: number): string => {
      const abs = Math.abs(ecart).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return ecart > 0 ? `+${abs}` : ecart < 0 ? `-${abs}` : abs;
    };

    const toggleLine   = (id: number) => setExpandedLines(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const togglePhase  = (id: number) => setExpandedPhases(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleSprint = (phaseId: number, sprintId: number) =>
      setExpandedSprints(prev => {
        const m = new Map(prev); const s = new Set(m.get(phaseId) ?? []);
        s.has(sprintId) ? s.delete(sprintId) : s.add(sprintId);
        s.size ? m.set(phaseId, s) : m.delete(phaseId); return m;
      });

    const toggleRecapLot    = (id: number) => setExpandedRecapLots(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleRecapPhase  = (id: number) => setExpandedRecapPhases(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleProfilRecap = (pid: number) => setExpandedProfilRecap(prev => { const s = new Set(prev); s.has(pid) ? s.delete(pid) : s.add(pid); return s; });
    const toggleProfilLot   = (profilId: number, lotId: number) =>
      setExpandedProfilLots(prev => {
        const m = new Map(prev); const s = new Set(m.get(profilId) ?? []);
        s.has(lotId) ? s.delete(lotId) : s.add(lotId);
        s.size ? m.set(profilId, s) : m.delete(profilId); return m;
      });

    // ══════════════════════════════════════════════════════════════════════
    // CALCULS RÉCAPITULATIFS
    // ══════════════════════════════════════════════════════════════════════

    const getJhForIds = (lineIds: Set<number>, profilId?: number) =>
      lineProfils
        .filter(lp => lineIds.has(lp.lineId) && (profilId == null || (lp.profil as any)?.id === profilId))
        .reduce((s, lp) => s + lp.volume, 0);

    const getTsForIds = (lineIds: Set<number>, profilId?: number) =>
      lineProfils
        .filter(lp => lineIds.has(lp.lineId) && (profilId == null || (lp.profil as any)?.id === profilId))
        .reduce((s, lp) => s + (lp.timeSpent ?? 0), 0);

    const lotRecap = lots.map(lot => {
      const phaseIds = new Set((lot.phases ?? []).map((p: any) => p.id));
      const lotLineIds = new Set(lines.filter(l => phaseIds.has((l as any).phaseId)).map(l => l.id));
      const lotVol = getJhForIds(lotLineIds);
      const lotTs  = getTsForIds(lotLineIds);
      const byProfil = profils.map(p => ({
        profil: p,
        vol: getJhForIds(lotLineIds, p.id),
        ts:  getTsForIds(lotLineIds, p.id),
      }));
      const phasesData = ((lot.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(phase => {
        const phLineIds = new Set(lines.filter(l => (l as any).phaseId === phase.id).map(l => l.id));
        const phVol = getJhForIds(phLineIds);
        const phTs  = getTsForIds(phLineIds);
        const phByProfil = profils.map(p => ({
          profil: p,
          vol: getJhForIds(phLineIds, p.id),
          ts:  getTsForIds(phLineIds, p.id),
        }));
        const phaseSpr = sprints.get(phase.id) ?? [];
        const sprintsData = phaseSpr.map(sp => {
          const spLineIds = new Set(lines.filter(l => (l as any).sprintId === sp.id).map(l => l.id));
          const spVol = getJhForIds(spLineIds);
          const spTs  = getTsForIds(spLineIds);
          const spByProfil = profils.map(p => ({
            profil: p,
            vol: getJhForIds(spLineIds, p.id),
            ts:  getTsForIds(spLineIds, p.id),
          }));
          return { sprint: sp, vol: spVol, ts: spTs, byProfil: spByProfil };
        });
        return { phase, vol: phVol, ts: phTs, byProfil: phByProfil, sprints: sprintsData };
      });
      return { lot, vol: lotVol, ts: lotTs, byProfil, phases: phasesData };
    });

    const tableGrandJH = lineProfils.reduce((s, lp) => s + lp.volume, 0);
    const tableGrandTs = lineProfils.reduce((s, lp) => s + (lp.timeSpent ?? 0), 0);
    const tableGrandEcart = tableGrandTs > 0 ? tableGrandJH - tableGrandTs : null;

    const leadIdRef = useRef(leadId);
    useEffect(() => { leadIdRef.current = leadId; }, [leadId]);

    // ══════════════════════════════════════════════════════════════════════
    // CRÉATION BACKLOG
    // ══════════════════════════════════════════════════════════════════════

    const handleCreateBacklog = async (item: CreateBacklogForProjetRequest) => {
      setSaving(true);
      try {
        const created = await svc.backlog.createForProjet({ name: item.name, desc: item.desc, projetId, leadId: leadIdRef.current, type: item.type });
        setBacklogHeader(created); setSelectedBacklogId(created.id); setShowBacklogForm(false);
      } catch { setError("Impossible de créer le backlog."); }
      finally { setSaving(false); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // LOTS
    // ══════════════════════════════════════════════════════════════════════

    const openAddLot  = () => { setEditLot(null); setFLot({ name: "", desc: "" }); setShowLotModal(true); };
    const openEditLot = (lot: BacklogLot) => { setEditLot(lot); setFLot({ name: lot.name, desc: lot.desc ?? "" }); setShowLotModal(true); };

    const saveLot = async () => {
      if (!fLot.name.trim() || !backlog?.id) return;
      setSaving(true);
      try {
        if (editLot) {
          const updated = await svc.lot.update(editLot.id, {
            name: fLot.name,
            desc: fLot.desc,
            order: editLot.order,
            backlogId: backlog!.id,
          });
          setLots(prev => prev.map(l => l.id === editLot.id ? { ...l, ...updated } : l));
          await reloadLots();
        } else {
          const order = Math.max(0, ...lots.map(l => l.order)) + 1;
          const created = await svc.lot.create({ ...fLot, order, backlogId: backlog.id });
          setLots(prev => [...prev, { ...created, phases: [] }]);
        }
        setShowLotModal(false);
      } catch (err) { setError(apiError(err, "Impossible de sauvegarder le lot")); }
      finally { setSaving(false); }
    };

    const deleteLot = async (id: number) => {
      if (!window.confirm("Supprimer ce lot et tout son contenu ?")) return;
      try {
        await svc.lot.delete(id);
        const updated = lots.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
        setLots(updated);
        if (updated.length) await svc.lot.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
      } catch (err) { setError(apiError(err, "Impossible de supprimer le lot")); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // PHASES
    // ══════════════════════════════════════════════════════════════════════

    const openAddPhase  = (lotId: number) => { setCtxLotId(lotId); setEditPhase(null); setFPhase({ name: "" }); setShowPhaseModal(true); };
    const openEditPhase = (p: BacklogPhase, lotId: number) => { setCtxLotId(lotId); setEditPhase(p); setFPhase({ name: p.name }); setShowPhaseModal(true); };

    const savePhase = async () => {
      if (!fPhase.name.trim() || ctxLotId === null) return;
      setSaving(true);
      try {
        if (editPhase) {
        const updated = await svc.phase.update(editPhase.id, { name: fPhase.name, order: editPhase.order });
        setLots(prev => prev.map(l => l.id !== ctxLotId ? l : { ...l, phases: (l.phases ?? []).map((p: any) => p.id === editPhase.id ? { ...p, ...updated } : p) }));
        } else {
          const lot = lots.find(l => l.id === ctxLotId);
          const order = Math.max(0, ...((lot?.phases ?? []) as any[]).map(p => p.order)) + 1;
          const created = await svc.phase.create({ name: fPhase.name, order, lotId: ctxLotId });
          setLots(prev => prev.map(l => l.id !== ctxLotId ? l : { ...l, phases: [...(l.phases ?? []), { ...created, sprints: [], deliverables: [] }] }));
          setSprints(prev => new Map(prev).set(created.id, []));
          setDeliverables(prev => new Map(prev).set(created.id, []));
        }
        setShowPhaseModal(false);
      } catch (err) { setError(apiError(err, "Impossible de sauvegarder la phase")); }
      finally { setSaving(false); setCtxLotId(null); }
    };

    const deletePhase = async (phaseId: number, lotId: number) => {
      if (!window.confirm("Supprimer cette phase et tout son contenu ?")) return;
      try {
        await svc.phase.delete(phaseId);
        setLots(prev => prev.map(l => l.id !== lotId ? l : {
          ...l, phases: (l.phases ?? []).filter((p: any) => p.id !== phaseId).map((p: any, i: number) => ({ ...p, order: i + 1 })),
        }));
        setSprints(prev => { const m = new Map(prev); m.delete(phaseId); return m; });
        setDeliverables(prev => { const m = new Map(prev); m.delete(phaseId); return m; });
        try {
          await svc.date.propagateFromLot(lotId);
          await reloadLots();
        } catch(e) { console.warn("Propagation dates échouée (non bloquant):", e); }
      } catch (err) { setError(apiError(err, "Impossible de supprimer la phase")); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // SPRINTS
    // ══════════════════════════════════════════════════════════════════════

    const openAddSprint  = (phaseId: number) => { setCtxPhaseId(phaseId); setEditSprint(null); setFSprint({ name: "", startDate: "", endDate: "" }); setShowSprintModal(true); };
    const openEditSprint = (s: BacklogSprint, phaseId: number) => { setCtxPhaseId(phaseId); setEditSprint(s); setFSprint({ name: s.name, startDate: s.dateDebut ?? "", endDate: s.dateFin ?? "" }); setShowSprintModal(true); };

    const saveSprint = async () => {
      if (!fSprint.name.trim() || ctxPhaseId === null) return;
      setSaving(true);
      let savedSprintId: number | null = null;

      try {
        const existing = sprints.get(ctxPhaseId) ?? [];

        if (editSprint) {
          const updated = await svc.phase.updateSprint(editSprint.id, {
            name:      fSprint.name,
            order:     editSprint.order,
            startDate: fSprint.startDate,
            endDate:   fSprint.endDate,
          });
          const updatedSprints = existing.map(s =>
            s.id === editSprint.id
              ? { ...s, ...updated, dateDebut: fSprint.startDate || updated.dateDebut || null, dateFin: fSprint.endDate || updated.dateFin || null }
              : s
          );
          setSprints(prev => new Map(prev).set(ctxPhaseId, updatedSprints));
          savedSprintId = editSprint.id;

        } else {
          const order = Math.max(0, ...existing.map(s => s.order)) + 1;
          const created = await svc.phase.createSprint({
            name:      fSprint.name,
            order,
            phaseId:   ctxPhaseId,
            dateDebut: fSprint.startDate,
            dateFin:   fSprint.endDate,
          });
          const createdWithDates: BacklogSprint = {
            ...created,
            dateDebut: created.dateDebut ?? (fSprint.startDate || null),
            dateFin:   created.dateFin   ?? (fSprint.endDate   || null),
          };
          setSprints(prev => new Map(prev).set(ctxPhaseId, [...existing, createdWithDates]));
          setColumns(prev => new Map(prev).set(createdWithDates.id, []));
          savedSprintId = createdWithDates.id;
        }

        setShowSprintModal(false);

      } catch (err) {
        console.error("Erreur sauvegarde sprint:", err);
        setError(apiError(err, "Impossible de sauvegarder le sprint"));
        setSaving(false);
        setCtxPhaseId(null);
        return;
      }

      if (savedSprintId && (fSprint.startDate || fSprint.endDate)) {
        try {
          await svc.date.propagateFromSprint(savedSprintId);
          await reloadLots();
        } catch (err) {
          console.warn("Propagation dates échouée (non bloquant):", err);
        }
      }

      setSaving(false);
      setCtxPhaseId(null);
    };

    const deleteSprint = async (sprintId: number, phaseId: number) => {
      if (!window.confirm("Supprimer ce sprint ?")) return;
      try {
        await svc.phase.deleteSprint(sprintId);
        const updated = (sprints.get(phaseId) ?? []).filter(s => s.id !== sprintId).map((s, i) => ({ ...s, order: i + 1 }));
        setSprints(prev => new Map(prev).set(phaseId, updated));
        setDeliverables(prev => { const m = new Map(prev); m.set(phaseId, (m.get(phaseId) ?? []).map(d => (d as any).sprintId === sprintId ? { ...d, sprintId: null } : d)); return m; });
        try {
          await svc.date.propagateFromPhase(phaseId);
          await reloadLots();
        } catch(e) { console.warn("Propagation dates échouée (non bloquant):", e); }
      } catch (err) { setError(apiError(err, "Impossible de supprimer le sprint")); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // LIVRABLES
    // ══════════════════════════════════════════════════════════════════════

    const openAddDeliv  = (phaseId: number) => { setCtxPhaseId(phaseId); setEditDeliv(null); setFDeliv({ name: "", description: "", deliveryDate: "", sprintId: null }); setShowDelivModal(true); };
    const openEditDeliv = (d: BacklogDelivrableProjet, phaseId: number) => {
      setCtxPhaseId(phaseId); setEditDeliv(d);
      setFDeliv({ name: d.name, description: (d as any).description ?? "", deliveryDate: (d as any).deliveryDate ?? "", sprintId: (d as any).sprintId ?? null });
      setShowDelivModal(true);
    };

    const saveDeliv = async () => {
      if (!fDeliv.name.trim() || ctxPhaseId === null) return;
      setSaving(true);
      try {
        const existing = deliverables.get(ctxPhaseId) ?? [];
        if (editDeliv) {
          const updated = await svc.phase.updateDeliverable(editDeliv.id!, { ...fDeliv, phaseId: ctxPhaseId });
          setDeliverables(prev => new Map(prev).set(ctxPhaseId, existing.map(d => d.id === editDeliv.id ? { ...d, ...updated } : d)));
        } else {
          const order = Math.max(0, ...existing.map((d: any) => d.order ?? 0)) + 1;
          const created = await svc.phase.createDeliverable({ ...fDeliv, phaseId: ctxPhaseId, order });
          setDeliverables(prev => new Map(prev).set(ctxPhaseId, [...existing, created]));
        }
        setShowDelivModal(false);
      } catch (err) { setError(apiError(err, "Impossible de sauvegarder le livrable")); }
      finally { setSaving(false); setCtxPhaseId(null); }
    };

    const deleteDeliv = async (delivId: number, phaseId: number) => {
      if (!window.confirm("Supprimer ce livrable ?")) return;
      try {
        await svc.phase.deleteDeliverable(delivId);
        setDeliverables(prev => new Map(prev).set(phaseId, (deliverables.get(phaseId) ?? []).filter(d => d.id !== delivId)));
      } catch (err) { setError(apiError(err, "Impossible de supprimer le livrable")); }
    };

    const deliverLivrable = async (delivId: number, phaseId: number) => {
      try {
        await svc.phase.deliverDeliverable(delivId);
        setDeliverables(prev => new Map(prev).set(phaseId, (prev.get(phaseId) ?? []).map(d => d.id === delivId ? { ...d, isDelivered: true } : d)));
      } catch (err) { setError(apiError(err, "Impossible de marquer le livrable comme livré")); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // PROFILS
    // ══════════════════════════════════════════════════════════════════════

    const openAddProfil  = () => { setEditProfil(null); setFProfil({ name: "", desc: "", tjm: 0, order: 0 }); setFCollabIds([]); setShowProfilModal(true); };
    const openEditProfil = (p: ProfilFull) => { setEditProfil(p); setFProfil({ name: p.name, desc: p.desc ?? "", tjm: p.tjm, order: p.order }); setFCollabIds(p.collaborateurs.map((c: any) => c.id)); setShowProfilModal(true); };
    const openCollabModal = (p: ProfilFull) => { setCollabProfil(p); setFCollabIds(p.collaborateurs.map((c: any) => c.id)); setCollabSearch(""); setShowCollabModal(true); };

    const saveProfil = async () => {
      if (!fProfil.name.trim() || !backlog?.id) return;
      setSaving(true);
      try {
        if (editProfil) {
          await svc.profil.update(editProfil.id, { name: fProfil.name, desc: fProfil.desc, tjm: fProfil.tjm, order: editProfil.order });
          setProfils(prev => prev.map(p => p.id !== editProfil.id ? p : { ...p, name: fProfil.name, desc: fProfil.desc, tjm: fProfil.tjm }));
        } else {
          const order = Math.max(0, ...profils.map(p => p.order)) + 1;
          const created = await svc.profil.create({ ...fProfil, order, backlogId: backlog.id });
          if (fCollabIds.length) await svc.profil.replaceCollaborateurs(created.id, fCollabIds);
          await reload();
        }
        setShowProfilModal(false);
      } catch (err) { setError(apiError(err, "Impossible de sauvegarder le profil")); }
      finally { setSaving(false); }
    };

    const saveCollabs = async () => {
      if (!collabProfil) return;
      setSaving(true);
      try {
        await svc.profil.replaceCollaborateurs(collabProfil.id, fCollabIds);
        setProfils(prev => prev.map(p => p.id !== collabProfil.id ? p : { ...p, collaborateurs: allCollabs.filter(c => fCollabIds.includes(c.id)) }));
        setShowCollabModal(false);
      } catch (err) { setError(apiError(err, "Impossible de mettre à jour les collaborateurs")); }
      finally { setSaving(false); setCollabProfil(null); }
    };

    const deleteProfil = async (id: number) => {
      if (!window.confirm("Supprimer ce profil ?")) return;
      try {
        await svc.profil.delete(id);
        const updated = profils.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
        setProfils(updated);
        if (updated.length) await svc.profil.updateOrder(updated.map(p => ({ id: p.id, order: p.order })));
      } catch (err) { setError(apiError(err, "Impossible de supprimer le profil")); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // LIGNES
    // ══════════════════════════════════════════════════════════════════════

    const openAddLine = () => { setEditLine(null); setFLine({ epic: "", userStory: "", description: "", resultat: "", lotId: null, phaseId: null, sprintId: null, facturable: true }); setShowLineModal(true); };

    const openEditLine = (l: BacklogLine) => {
      setEditLine(l);
      const phaseId = (l as any).phaseId ?? null;
      const lot = getLotByPhaseId(phaseId);
      setFLine({
        epic: l.epic ?? "", userStory: l.userStory ?? "",
        description: l.description ?? "", resultat: l.resultat ?? "",
        lotId: lot?.id ?? null, phaseId, sprintId: (l as any).sprintId ?? null,
        facturable: l.facturable ?? true,
      });
      setShowLineModal(true);
    };

    const saveLine = async () => {
      if (!fLine.phaseId) { setError("Veuillez sélectionner une phase avant de sauvegarder la ligne."); return; }
      setSaving(true);
      try {
        const payload = { epic: fLine.epic, userStory: fLine.userStory, description: fLine.description, resultat: fLine.resultat, phaseId: fLine.phaseId, sprintId: fLine.sprintId, facturable: fLine.facturable, };
        if (editLine) {
          const updated = await svc.line.update(editLine.id, { ...payload, order: editLine.order });
          setLines(prev => prev.map(l => l.id === editLine.id
            ? { ...l, ...updated, facturable: updated.facturable ?? (updated as any).isFacturable ?? payload.facturable }
            : l
          ));
        } else {
          const order = Math.max(0, ...lines.map(l => l.order)) + 1;
          const created = await svc.line.create({ ...payload, order });
          const createdNorm = { ...created, facturable: created.facturable ?? (created as any).isFacturable ?? payload.facturable };
          setLines(prev => [...prev, createdNorm]);
        }
        setShowLineModal(false);
      } catch (err) { setError(apiError(err, "Impossible de sauvegarder la ligne du backlog")); }
      finally { setSaving(false); }
    };

    const deleteLine = async (id: number) => {
      if (!window.confirm("Supprimer cette ligne ?")) return;
      try {
        await svc.line.delete(id);
        const updated = lines.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
        setLines(updated);
        setLineProfils(prev => prev.filter(lp => lp.lineId !== id));
        setColValues(prev => { const m = new Map(prev); m.delete(id); return m; });
        if (updated.length) await svc.line.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
      } catch (err) { setError(apiError(err, "Impossible de supprimer la ligne du backlog")); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // VOLUMES — modal amélioré avec sélecteur de ressource
    // ══════════════════════════════════════════════════════════════════════

    // ── Construit la liste des ressources disponibles pour une ligne ──────────
    // Format de la valeur du select : "profilId|collaborateurId" ou "profilId|"
    const buildRessourceOptions = () => {
      const opts: { value: string; label: string; profilId: number; collabId: number | null }[] = [];
      for (const profil of profils) {
        if (profil.collaborateurs.length === 0) {
          opts.push({
            value: `${profil.id}|`,
            label: `${profil.name}${profil.desc ? ` (${profil.desc})` : ""}`,
            profilId: profil.id,
            collabId: null,
          });
        } else {
          for (const c of profil.collaborateurs) {
            const collabLabel = c.appellation ?? `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
            opts.push({
              value: `${profil.id}|${c.id}`,
              label: `${profil.name} — ${collabLabel}`,
              profilId: profil.id,
              collabId: c.id,
            });
          }
        }
      }
      return opts;
    };

    const openVolModal = (lineId: number, profilId: number) => {
      setCtxLineId(lineId); setCtxProfilId(profilId);
      const existing = lineProfils.find(lp => lp.lineId === lineId && (lp.profil as any)?.id === profilId);
      setEditLineProfil(existing ?? null);
      setFVolume(existing?.volume ?? 0);

      // Initialiser le sélecteur de ressource
      const collabId = existing?.collaborateur?.id ?? null;
      setFCollabId(collabId);
      setFSelectedRessource(collabId ? `${profilId}|${collabId}` : `${profilId}|`);

      if (existing?.deadLine) {
        const date = new Date(existing.deadLine);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setFDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setFDeadline("");
      }
      setFTimeSpent(existing?.timeSpent ?? null);
      setShowVolModal(true);
    };

    // ── Ouvre le modal volume sans profil pré-sélectionné (depuis colonne Ressources) ──
    const openVolModalForLine = (lineId: number) => {
      setCtxLineId(lineId);
      setCtxProfilId(null);
      setEditLineProfil(null);
      setFVolume(0);
      setFCollabId(null);
      setFSelectedRessource("");
      setFDeadline("");
      setFTimeSpent(null);
      setShowVolModal(true);
    };

    // ── Handler changement de ressource dans le select ────────────────────────
    const handleRessourceChange = (value: string) => {
      setFSelectedRessource(value);
      if (!value) {
        setCtxProfilId(null);
        setFCollabId(null);
        return;
      }
      const [profilIdStr, collabIdStr] = value.split("|");
      const profilId = parseInt(profilIdStr, 10);
      const collabId = collabIdStr ? parseInt(collabIdStr, 10) : null;
      setCtxProfilId(profilId);
      setFCollabId(collabId);

      // Si une affectation existe déjà pour ce profil/collab sur cette ligne, la charger
      if (ctxLineId !== null) {
        const existing = lineProfils.find(
          lp => lp.lineId === ctxLineId && (lp.profil as any)?.id === profilId
        );
        if (existing) {
          setEditLineProfil(existing);
          setFVolume(existing.volume ?? 0);
          setFTimeSpent(existing.timeSpent ?? null);
          if (existing.deadLine) {
            const date = new Date(existing.deadLine);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setFDeadline(`${year}-${month}-${day}T${hours}:${minutes}`);
          } else {
            setFDeadline("");
          }
        } else {
          setEditLineProfil(null);
          setFVolume(0);
          setFTimeSpent(null);
          setFDeadline("");
        }
      }
    };

  const saveVolume = async () => {
    if (ctxLineId === null || ctxProfilId === null) return;
    setSaving(true);
    try {
      const payload = {
        volume: fVolume,
        lineId: ctxLineId,
        profilId: ctxProfilId,
        collaborateurId: fCollabId,
        deadLine: fDeadline ? new Date(fDeadline).toISOString() : null,
        timeSpent: fTimeSpent,
      };

      let saved: BacklogProjetLineProfil;
      if (editLineProfil) {
        saved = await svc.lineProfil.update(editLineProfil.id, payload);
        // ── Mise à jour optimiste immédiate ──────────────────────────────
        setLineProfils(prev =>
          prev.map(lp =>
            lp.id === editLineProfil.id
              ? {
                  ...lp,
                  volume: fVolume,
                  timeSpent: fTimeSpent,
                  deadLine: fDeadline ? new Date(fDeadline).toISOString() : null,
                  collaborateur: fCollabId
                    ? allCollabs.find((c: any) => c.id === fCollabId) ?? lp.collaborateur
                    : null,
                }
              : lp
          )
        );
      } else {
        saved = await svc.lineProfil.create(payload);
        // ── Ajout optimiste immédiat ─────────────────────────────────────
        const profilObj = profils.find(p => p.id === ctxProfilId);
        const collabObj = fCollabId
          ? allCollabs.find((c: any) => c.id === fCollabId) ?? null
          : null;
        setLineProfils(prev => [
          ...prev,
          {
            ...saved,
            lineId: ctxLineId,
            volume: fVolume,
            timeSpent: fTimeSpent,
            deadLine: fDeadline ? new Date(fDeadline).toISOString() : null,
            profil: profilObj ?? { id: ctxProfilId, name: "", tjm: 0, order: 0 },
            collaborateur: collabObj,
          } as BacklogProjetLineProfil,
        ]);
      }

      setShowVolModal(false);
      // ── Rafraîchir les notifications (le collaborateur vient d'être affecté) ─
      refreshNotifications();
      if (selectedBacklogId) {
        loadLineProfils(selectedBacklogId).catch(console.warn);
      }
    } catch (err) {
      setError(apiError(err, "Impossible de sauvegarder le volume JH"));
    } finally {
      setSaving(false);
      setCtxLineId(null);
      setCtxProfilId(null);
    }
  };
    const deleteVolume = async () => {
      if (!editLineProfil || !window.confirm("Supprimer ce volume ?")) return;
      try {
        await svc.lineProfil.delete(editLineProfil.id);
        setLineProfils(prev => prev.filter(lp => lp.id !== editLineProfil.id));
        setShowVolModal(false);
      } catch (err) { setError(apiError(err, "Impossible de supprimer le volume JH")); }
      finally { setCtxLineId(null); setCtxProfilId(null); }
    };

    const fmtDateTime = (iso: string | null | undefined): string => {
      if (!iso) return "";
      try {
        const date = new Date(iso);
        return date.toLocaleString("fr-FR", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      } catch { return iso; }
    };

    // ══════════════════════════════════════════════════════════════════════
    // COLONNES
    // ══════════════════════════════════════════════════════════════════════

    const openAddCol  = (sprintId: number) => { setCtxSprintId(sprintId); setEditCol(null); setFCol({ name: "", type: "TEXT" }); setShowColModal(true); };
    const openEditCol = (col: BacklogColumn) => { setCtxSprintId(col.sprintId); setEditCol(col); setFCol({ name: col.name, type: col.type }); setShowColModal(true); };

    const deleteColumn = async (col: BacklogColumn) => {
      if (!window.confirm("Supprimer cette colonne ?")) return;
      try { await svc.column.deleteColumn(col.id); setColumns(prev => new Map(prev).set(col.sprintId, (prev.get(col.sprintId) ?? []).filter(c => c.id !== col.id))); }
      catch (err) { setError(apiError(err, "Impossible de supprimer la colonne")); }
    };

    const openCellEdit = (lineId: number, col: BacklogColumn) => {
      setEditCell({ lineId, columnId: col.id });
      setFCellVal(colValues.get(lineId)?.find(v => (v.column as any)?.id === col.id)?.value ?? "");
      setShowCellModal(true);
    };

    const saveCellValue = async () => {
      if (!editCell) return;
      setSaving(true);
      try {
        const saved = await svc.column.upsertValue({ value: fCellVal, lineId: editCell.lineId, columnId: editCell.columnId });
        setColValues(prev => { const m = new Map(prev); const vals = (m.get(editCell.lineId) ?? []).filter(v => (v.column as any)?.id !== editCell.columnId); m.set(editCell.lineId, [...vals, saved]); return m; });
        setShowCellModal(false);
      } catch (err) { setError(apiError(err, "Impossible de sauvegarder la valeur")); }
      finally { setSaving(false); }
    };

    // ── SortableJS ────────────────────────────────────────────────────────
    const safeDestroy = (s: Sortable | null) => { if (!s) return; try { s.destroy(); } catch {} };

    useEffect(() => {
      if (!show || !lines.length || !lineBodyRef.current) return;
      lineSortable.current = Sortable.create(lineBodyRef.current, {
        animation: 150, handle: ".drag-line", ghostClass: "sortable-ghost", filter: ".empty-row",
        onEnd: async ({ oldIndex, newIndex }) => {
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const next = [...lines]; const [m] = next.splice(oldIndex, 1); next.splice(newIndex, 0, m);
          const reordered = next.map((l, i) => ({ ...l, order: i + 1 }));
          setLines(reordered);
          try { await svc.line.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); } catch {}
        },
      });
      return () => { safeDestroy(lineSortable.current); lineSortable.current = null; };
    }, [lines, show]);

    useEffect(() => {
      if (!show || !lots.length || !lotsRef.current) return;
      lotSortable.current = Sortable.create(lotsRef.current, {
        animation: 150, handle: ".drag-lot", ghostClass: "sortable-ghost",
        onEnd: async ({ oldIndex, newIndex }) => {
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const next = [...lots]; const [m] = next.splice(oldIndex, 1); next.splice(newIndex, 0, m);
          const reordered = next.map((l, i) => ({ ...l, order: i + 1 }));
          setLots(reordered);
          try { await svc.lot.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); } catch {}
        },
      });
      return () => { safeDestroy(lotSortable.current); lotSortable.current = null; };
    }, [lots, show, activeTab]);

    useEffect(() => {
      if (!show) return;
      phaseSortableRefs.current.forEach(s => safeDestroy(s));
      phaseSortableRefs.current.clear();
      lots.forEach(lot => {
        if (!lot.phases?.length) return;
        const el = document.querySelector(`[data-phases-lot-id="${lot.id}"]`) as HTMLElement | null;
        if (!el) return;
        const sortable = Sortable.create(el, {
          animation: 150, handle: ".drag-phase", ghostClass: "sortable-ghost",
          onEnd: async ({ oldIndex, newIndex }) => {
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
            setLots(prevLots => {
              const lotData = prevLots.find(l => l.id === lot.id);
              if (!lotData?.phases) return prevLots;
              const sorted = [...lotData.phases].sort((a: any, b: any) => a.order - b.order);
              const [moved] = sorted.splice(oldIndex, 1); sorted.splice(newIndex, 0, moved);
              const reordered = sorted.map((p: any, i: number) => ({ ...p, order: i + 1 }));
              Promise.all(reordered.map((p: any) => svc.phase.updatePhaseOrder(p.id, p.order).catch(() => {})));
              return prevLots.map(l => l.id !== lot.id ? l : { ...l, phases: reordered });
            });
          },
        });
        phaseSortableRefs.current.set(lot.id, sortable);
      });
      return () => { phaseSortableRefs.current.forEach(safeDestroy); phaseSortableRefs.current.clear(); };
    }, [lots, show, activeTab]);

    useEffect(() => {
      if (!show) return;
      sprintSortableRefs.current.forEach((s, phaseId) => {
        if (!expandedPhases.has(phaseId)) { safeDestroy(s); sprintSortableRefs.current.delete(phaseId); }
      });
      expandedPhases.forEach(phaseId => {
        if (sprintSortableRefs.current.has(phaseId)) return;
        const phaseSprints = sprints.get(phaseId);
        if (!phaseSprints?.length) return;
        const el = document.querySelector(`[data-sprints-phase-id="${phaseId}"]`) as HTMLElement | null;
        if (!el) return;
        const sortable = Sortable.create(el, {
          animation: 150, handle: ".drag-sprint", ghostClass: "sortable-ghost",
          onEnd: async ({ oldIndex, newIndex }) => {
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
            setSprints(prevSprints => {
              const current = [...(prevSprints.get(phaseId) ?? [])].sort((a, b) => a.order - b.order);
              const [moved] = current.splice(oldIndex, 1); current.splice(newIndex, 0, moved);
              const reordered = current.map((s, i) => ({ ...s, order: i + 1 }));
              Promise.all(reordered.map(s => svc.phase.updateSprintOrder(s.id, s.order).catch(() => {})));
              const newMap = new Map(prevSprints); newMap.set(phaseId, reordered); return newMap;
            });
          },
        });
        sprintSortableRefs.current.set(phaseId, sortable);
      });
      return () => { sprintSortableRefs.current.forEach(safeDestroy); sprintSortableRefs.current.clear(); };
    }, [sprints, expandedPhases, show]);

    useEffect(() => {
      if (!show || !profils.length || !profilsRef.current) return;
      profilSortable.current = Sortable.create(profilsRef.current, {
        animation: 150, handle: ".drag-profil", ghostClass: "sortable-ghost",
        onEnd: async ({ oldIndex, newIndex }) => {
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const next = [...profils]; const [m] = next.splice(oldIndex, 1); next.splice(newIndex, 0, m);
          const reordered = next.map((p, i) => ({ ...p, order: i + 1 }));
          setProfils(reordered);
          try { await svc.profil.updateOrder(reordered.map(p => ({ id: p.id, order: p.order }))); } catch {}
        },
      });
      return () => { safeDestroy(profilSortable.current); profilSortable.current = null; };
    }, [profils, show]);

    // ══════════════════════════════════════════════════════════════════════
    // TOTAUX PAR PROFIL
    // ══════════════════════════════════════════════════════════════════════

    const profilTotals = profils.map(p => {
      const vol = lineProfils
        .filter(lp => (lp.profil as any)?.id === p.id)
        .reduce((s, lp) => s + lp.volume, 0);
      const ts = lineProfils
        .filter(lp => (lp.profil as any)?.id === p.id)
        .reduce((s, lp) => s + (lp.timeSpent ?? 0), 0);
      const amount = lineProfils
        .filter(lp => {
          if ((lp.profil as any)?.id !== p.id) return false;
          const line = lines.find(l => l.id === lp.lineId);
          return line?.facturable !== false;
        })
        .reduce((s, lp) => s + lp.volume * p.tjm, 0);
      return { profil: p, vol, ts, amount };
    });
    const grandTotalVol = profilTotals.reduce((s, t) => s + t.vol, 0);
    const grandTotalTs  = profilTotals.reduce((s, t) => s + t.ts, 0);
    const grandTotalAmt = profilTotals.reduce((s, t) => s + t.amount, 0);

    // ── Ressource options memoized ────────────────────────────────────────
    const ressourceOptions = React.useMemo(() => buildRessourceOptions(), [profils]);

    // ══════════════════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════════════════

    if (loadingBacklogs) {
      return (
        <Modal show={show} onHide={onClose} size="xl" fullscreen>
          <Modal.Header closeButton><Modal.Title>Backlog — {projetNom ?? `Projet #${projetId}`}</Modal.Title></Modal.Header>
          <Modal.Body>
            <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
              <FaSpinner className="fa-spin me-2" size={24} /><span>Chargement…</span>
            </div>
          </Modal.Body>
        </Modal>
      );
    }

    const EXPORT_TABS_PROJET: ExportTabDef[] = [
      { key: 'lots',            label: 'Lots & Phases'          },
      { key: 'planning',        label: 'Planning'               },
      { key: 'profils',         label: 'Profils'                },
      { key: 'backlog',         label: 'Backlog'                },
      { key: 'budget',          label: 'Budget'                 },
      { key: 'charges_annexes', label: 'Charges annexes'        },
      { key: 'facturation',     label: 'Facturation ressources' },
      { key: 'paiements',       label: 'Paiements clients'      },
    ];

    return (
      <>
        <Modal show={show} onHide={onClose} size="xl" fullscreen>
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2 flex-wrap">
              Workload — {projetNom ?? `Projet #${projetId}`}
            </Modal.Title>
            {selectedBacklogId && (
              <div className="ms-auto me-3">
                <ExportBacklogBtn
                  tabs={EXPORT_TABS_PROJET}
                  activeTab={activeTab}
                  onSwitchTab={k => setActiveTab(k)}
                  captureRef={exportCaptureRef}
                  fileName={`recap-projet-${projetNom ?? projetId}`}
                  contextName={projetNom ?? `Projet #${projetId}`}
                />
              </div>
            )}
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#f8f9fa" }}>
            <div ref={exportCaptureRef} className="container-fluid">
              {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

              {!selectedBacklogId && (
                <div className="py-4">
                  {backlogHeader ? (
                    <div className="row justify-content-center">
                      <div className="col-md-6 col-lg-4">
                        <div className="card shadow-sm h-100" style={{ cursor: "pointer" }} onClick={() => setSelectedBacklogId(backlogHeader.id)}>
                          <div className="card-body">
                            <h5 className="card-title">{backlogHeader.name}</h5>
                            {(backlogHeader as any).desc && <p className="card-text text-muted small">{(backlogHeader as any).desc}</p>}
                            <div className="mt-2">{leadId ? <span className="badge bg-info text-dark">Issu du lead</span> : <span className="badge bg-secondary">Projet indépendant</span>}</div>
                            <div className="d-flex justify-content-end mt-3"><small className="text-primary">Cliquez pour ouvrir →</small></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <BacklogFormProjet show={showBacklogForm} onClose={() => setShowBacklogForm(false)} onSubmit={handleCreateBacklog} projetId={projetId} leadId={leadId} />
                      <Button label="Créer un workload" icon={<FaPlus />} onClick={() => setShowBacklogForm(true)} className="mb-3" />
                      <div className="text-center text-muted py-5">
                        <p>Aucun workload pour ce projet.</p>
                        <p className="small">Cliquez sur "Créer un workload" pour commencer.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedBacklogId && (
                <>
                  {loading && <div className="text-center py-5"><FaSpinner className="fa-spin me-2" size={24} /><span>Chargement…</span></div>}

                  {!loading && (
                    <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k ?? "backlog")} className="mb-4">
                    {/* ══════════ TAB LOTS & PHASES ════════════════════ */}
                      <Tab eventKey="lots" title="Lots & Phases">
                        <div className="d-flex justify-content-end mb-3">
                          <Button label="Ajouter un lot" icon={<FaPlus />} onClick={openAddLot} />
                        </div>
                        <div ref={lotsRef}>
                          {lots.length === 0
                            ? <div className="text-center text-muted py-4 fst-italic">Aucun lot. Cliquez sur « Ajouter un lot ».</div>
                            : lots.map(lot => (
                              <div key={lot.id} className="card mb-3 shadow-sm">
                                <div className="card-header d-flex align-items-center gap-2 flex-wrap">
                                  <span className="drag-lot text-muted" style={{ cursor: "grab", userSelect: "none", fontSize: "1.1rem" }}>⋮⋮</span>
                                  <strong className="flex-grow-1">{lot.order}. {lot.name}</strong>
                                  {lot.desc && <small className="text-muted me-1">{lot.desc}</small>}
                                  {(() => { const d = getLotDates(lot); return <DateBadge debut={d.debut} fin={d.fin} />; })()}
                                  <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLot(lot)}><FaEdit /></button>
                                  <button className="btn btn-sm btn-outline-danger ms-1" onClick={() => deleteLot(lot.id)}><FaTrash /></button>
                                </div>
                                <div className="card-body pt-2 pb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted small fw-semibold">Phases</span>
                                    <Button label="+ Phase" variant="secondary" onClick={() => openAddPhase(lot.id)} />
                                  </div>
                                  <div data-phases-lot-id={lot.id}>
                                    {((lot.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(phase => {
                                      const phaseSprints = sprints.get(phase.id) ?? [];
                                      const phaseDeliv   = deliverables.get(phase.id) ?? [];
                                      const expanded     = expandedPhases.has(phase.id);
                                      return (
                                        <div key={phase.id} className="border rounded mb-2 p-0" style={{ backgroundColor: "#f5f7fa" }}>
                                          <div className="d-flex align-items-center gap-2 p-2 flex-wrap">
                                            <span className="drag-phase text-muted" style={{ cursor: "grab", userSelect: "none", fontSize: "1rem" }}>⋮⋮</span>
                                            <span style={{ cursor: "pointer" }} onClick={() => togglePhase(phase.id)}>{expanded ? <FaChevronDown /> : <FaChevronRight />}</span>
                                            <span className="fw-semibold flex-grow-1" style={{ cursor: "pointer" }} onClick={() => togglePhase(phase.id)}>{phase.order}. {phase.name}</span>
                                            <DateBadge debut={(phase as any).dateDebut} fin={(phase as any).dateFin} />
                                            <span className="badge bg-primary">{phaseSprints.length} sprint{phaseSprints.length !== 1 ? "s" : ""}</span>
                                            <span className="badge bg-success">{phaseDeliv.length} livrable{phaseDeliv.length !== 1 ? "s" : ""}</span>
                                            <button className="btn btn-sm btn-warning"                onClick={() => openAddSprint(phase.id)}><FaCalendar className="me-1" />Sprint</button>
                                            <button className="btn btn-sm btn-success ms-1"           onClick={() => openAddDeliv(phase.id)}><FaCalendar className="me-1" />Livrable</button>
                                            <button className="btn btn-sm btn-outline-secondary ms-1" onClick={() => openEditPhase(phase, lot.id)}><FaEdit /></button>
                                            <button className="btn btn-sm btn-outline-danger ms-1"    onClick={() => deletePhase(phase.id, lot.id)}><FaTrash /></button>
                                          </div>
                                          {expanded && (
                                            <div className="px-3 pb-2">
                                              <div data-sprints-phase-id={phase.id}>
                                                {phaseSprints.map(sprint => {
                                                  const sprintCols  = columns.get(sprint.id) ?? [];
                                                  const sprintDeliv = phaseDeliv.filter(d => (d as any).sprintId === sprint.id);
                                                  const spExpanded  = expandedSprints.get(phase.id)?.has(sprint.id) ?? false;
                                                  return (
                                                    <div key={sprint.id} className="border rounded p-2 mb-2" style={{ backgroundColor: "#fffbea" }}>
                                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                                        <span className="drag-sprint text-muted" style={{ cursor: "grab", userSelect: "none" }}>⋮⋮</span>
                                                        <strong className="flex-grow-1">Sprint {sprint.order} : {sprint.name}</strong>
                                                        {(sprint.dateDebut || sprint.dateFin) && <DateBadge debut={sprint.dateDebut} fin={sprint.dateFin} style={{ background: "#fff3cd", borderColor: "#ffc107" }} />}
                                                        <button className="btn btn-sm btn-outline-secondary ms-1" onClick={() => toggleSprint(phase.id, sprint.id)}>{spExpanded ? <FaChevronDown /> : <FaChevronRight />}</button>
                                                        <button className="btn btn-sm btn-outline-primary ms-1" onClick={() => openEditSprint(sprint, phase.id)}><FaEdit /></button>
                                                        <button className="btn btn-sm btn-outline-danger ms-1"  onClick={() => deleteSprint(sprint.id, phase.id)}><FaTrash /></button>
                                                      </div>
                                                      {spExpanded && (
                                                        <div className="mt-2 ms-3">
                                                          {sprintCols.length > 0 && (
                                                            <div className="mb-2">
                                                              <strong className="small text-secondary">Colonnes :</strong>
                                                              <div className="d-flex flex-wrap gap-1 mt-1">
                                                                {sprintCols.map(col => (
                                                                  <span key={col.id} className="badge bg-secondary d-inline-flex align-items-center gap-1">
                                                                    {col.name} <em className="text-light opacity-75 small">({col.type})</em>
                                                                    <button className="btn btn-link btn-sm p-0 text-white" onClick={() => openEditCol(col)}><FaEdit size={9} /></button>
                                                                    <button className="btn btn-link btn-sm p-0 text-white" onClick={() => deleteColumn(col)}><FaTrash size={9} /></button>
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                          {sprintDeliv.length > 0
                                                            ? sprintDeliv.map(d => (
                                                              <div key={d.id} className={`d-flex justify-content-between align-items-center border-bottom py-1 small${(d as any).isDelivered ? " opacity-75" : ""}`} style={(d as any).isDelivered ? { background: "#f0fff4" } : {}}>
                                                                <span className="d-flex align-items-center gap-2">
                                                                  {(d as any).isDelivered && <FaCheckCircle className="text-success" style={{ flexShrink: 0 }} />}
                                                                  <span>
                                                                    <strong style={(d as any).isDelivered ? { textDecoration: "line-through", color: "#6c757d" } : {}}>{d.name}</strong>
                                                                    {(d as any).deliveryDate && <span className="text-muted ms-1">{` — ${new Date((d as any).deliveryDate).toLocaleDateString("fr-FR")}`}</span>}
                                                                    {(d as any).isDelivered && <span className="badge bg-success ms-2" style={{ fontSize: "0.6rem" }}>Livré</span>}
                                                                  </span>
                                                                </span>
                                                                <div className="d-flex gap-1 align-items-center">
                                                                  {!(d as any).isDelivered && <button className="btn btn-sm btn-success py-0 px-1 d-flex align-items-center gap-1" style={{ fontSize: "0.7rem" }} onClick={() => deliverLivrable(d.id!, phase.id)}><FaCheckCircle size={10} /> Livrer</button>}
                                                                  <button className="btn btn-link btn-sm p-0" onClick={() => openEditDeliv(d, phase.id)}><FaEdit /></button>
                                                                  <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteDeliv(d.id!, phase.id)}><FaTrash /></button>
                                                                </div>
                                                              </div>
                                                            ))
                                                            : <div className="text-muted small fst-italic">Aucun livrable dans ce sprint.</div>}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                              {phaseDeliv.filter(d => !(d as any).sprintId).map(d => (
                                                <div key={d.id} className={`d-flex justify-content-between align-items-center border-bottom py-1 small ps-1${(d as any).isDelivered ? " opacity-75" : ""}`} style={(d as any).isDelivered ? { background: "#f0fff4" } : {}}>
                                                  <span className="d-flex align-items-center gap-2">
                                                    {(d as any).isDelivered && <FaCheckCircle className="text-success" style={{ flexShrink: 0 }} />}
                                                    <span>
                                                      <strong style={(d as any).isDelivered ? { textDecoration: "line-through", color: "#6c757d" } : {}}>{d.name}</strong>
                                                      {(d as any).deliveryDate && <span className="text-muted ms-1">{` — ${new Date((d as any).deliveryDate).toLocaleDateString("fr-FR")}`}</span>}
                                                      {(d as any).isDelivered && <span className="badge bg-success ms-2" style={{ fontSize: "0.6rem" }}>Livré</span>}
                                                    </span>
                                                  </span>
                                                  <div className="d-flex gap-1 align-items-center">
                                                    {!(d as any).isDelivered && <button className="btn btn-sm btn-success py-0 px-1 d-flex align-items-center gap-1" style={{ fontSize: "0.7rem" }} onClick={() => deliverLivrable(d.id!, phase.id)}><FaCheckCircle size={10} /> Livrer</button>}
                                                    <button className="btn btn-link btn-sm p-0" onClick={() => openEditDeliv(d, phase.id)}><FaEdit /></button>
                                                    <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteDeliv(d.id!, phase.id)}><FaTrash /></button>
                                                  </div>
                                                </div>
                                              ))}
                                              {phaseSprints.length === 0 && phaseDeliv.length === 0 && <div className="text-muted small fst-italic py-1">Aucun sprint ni livrable.</div>}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Tab>
                      <Tab eventKey="planning" title="Planning Gantt">
                        <PlanningTab
                          lots={lots.map(lot => ({
                            ...lot,
                            phases: ((lot.phases ?? []) as any[]).map((phase: any) => ({
                              ...phase,
                              sprints: sprints.get(phase.id) ?? phase.sprints ?? [],
                            })),
                          }))}
                          lines={lines}
                          lineProfils={lineProfils}
                          deliverables={deliverables}
                          datedebutPlanning={
                            (backlog as any)?.datedeButPlanning   
                            ?? (backlog as any)?.dateDebutPlanning
                            ?? null
                          }
                          selectedBacklogId={selectedBacklogId}
                          planningService={svc.planning}
                          onPlanningUpdated={reloadLots}
                          api={api}
                        />
                      </Tab>
                      {/* ══════════ TAB PROFILS ══════════════════════════ */}
                      <Tab eventKey="profils" title="Profils">
                        <div className="d-flex justify-content-end mb-3">
                          <Button label="Ajouter un profil" icon={<FaPlus />} onClick={openAddProfil} />
                        </div>
                        <div ref={profilsRef}>
                          {profils.length === 0
                            ? <div className="text-center text-muted py-4 fst-italic">Aucun profil.</div>
                            : profils.map(profil => (
                              <div key={profil.id} className="card mb-2 shadow-sm">
                                <div className="card-body d-flex align-items-start gap-3 py-2">
                                  <span className="drag-profil text-muted mt-1" style={{ cursor: "grab", userSelect: "none" }}>⋮⋮</span>
                                  <div className="flex-grow-1">
                                    <div className="fw-bold">{profil.order}. {profil.name}</div>
                                    {profil.desc && <small className="text-muted">{profil.desc}</small>}
                                    <div className="mt-1"><span className="badge bg-warning text-dark">TJM : {fmtMnt(profil.tjm)} {deviseAbr}/j</span></div>
                                    <div className="profil-collab-section mt-2">
                                      {profil.collaborateurs.length > 0 ? (
                                        <div className="d-flex flex-wrap gap-2">
                                          {profil.collaborateurs.map((c: any) => {
                                            const fullName = `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
                                            const activePoste = c.profilPostes?.find((pp: any) => !pp.endDate);
                                            const posteLabel = activePoste?.poste?.label ?? "";
                                            const buName     = activePoste?.bu?.name ?? "";
                                            const meta = [posteLabel, buName].filter(Boolean).join(" · ");
                                            return (
                                              <div key={c.id} className="profil-collab-badge">
                                                <FaUser size={11} />
                                                <span>{fullName || c.appelation || "—"}</span>
                                                {meta && <span className="profil-collab-poste">{meta}</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <button
                                          className="profil-assign-btn"
                                          onClick={() => openCollabModal(profil)}
                                        >
                                          <FaUser className="me-1" size={12} />
                                          Affecter des collaborateurs
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="d-flex gap-2 align-items-center">
                                    <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1" onClick={() => openCollabModal(profil)}><FaUsers /><span className="d-none d-md-inline">Collaborateurs</span></button>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditProfil(profil)}><FaEdit /></button>
                                    <button className="btn btn-sm btn-outline-danger"    onClick={() => deleteProfil(profil.id)}><FaTrash /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Tab>

                      {/* ══════════ TAB BACKLOG ══════════════════════════ */}
                      <Tab eventKey="backlog" title="Backlog">
                        {/* ── Récap par profil ── */}
                        <div className="card shadow-sm mb-3">
                          <div className="card-header fw-bold">Récapitulatif par profil</div>
                          <div className="card-body p-0">
                            <table className="table table-sm table-bordered mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>Profil</th>
                                  <th className="text-end">Planifié (JH)</th>
                                  <th className="text-end">Tps de réalisation (JH)</th>
                                  <th className="text-end">Tps passé (JH)</th>
                                  <th className="text-end">TJM</th>
                                  <th className="text-end">Montant</th>
                                </tr>
                              </thead>
                              <tbody>
                                {profilTotals.map(({ profil, vol, ts, amount }) => {
                                  const pct   = vol > 0 ? Math.round((ts / vol) * 100) : null;
                                  const ecart = ts > 0 ? vol - ts : null;
                                  return (
                                    <tr key={profil.id}>
                                      <td><strong>{profil.name}</strong>{profil.desc && <small className="text-muted ms-2">{profil.desc}</small>}</td>
                                      <td className="text-end">{fmtJH(vol)}</td>
                                      <td className="text-end">
                                        {ts > 0 ? (
                                          <span style={{ color: progressColor(pct ?? 0), fontWeight: 600 }}>{fmtJH(ts)}</span>
                                        ) : <span className="text-muted">—</span>}
                                      </td>
                                      <td className="text-end">
                                        {ecart !== null ? (
                                          <span style={{ color: ecartColor(ecart), fontWeight: 600 }}
                                            title={ecart >= 0 ? `${fmtJH(ecart)} JH restants` : `Dépassement de ${fmtJH(Math.abs(ecart))} JH`}>
                                            {fmtEcart(ecart)} JH
                                          </span>
                                        ) : <span className="text-muted">—</span>}
                                      </td>
                                      <td className="text-end">{fmtMnt(profil.tjm)} {deviseAbr}</td>
                                      <td className="text-end fw-bold">{amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="table-active">
                                <tr>
                                  <td><strong>TOTAL</strong></td>
                                  <td className="text-end fw-bold">{fmtJH(grandTotalVol)}</td>
                                  <td className="text-end fw-bold" style={{ color: progressColor(grandTotalVol > 0 ? Math.round((grandTotalTs / grandTotalVol) * 100) : 0) }}>
                                    {grandTotalTs > 0 ? fmtJH(grandTotalTs) : "—"}
                                  </td>
                                  <td className="text-end fw-bold">
                                    {grandTotalTs > 0 ? (
                                      <span style={{ color: ecartColor(grandTotalVol - grandTotalTs), fontWeight: 600 }}>
                                        {fmtEcart(grandTotalVol - grandTotalTs)} JH
                                      </span>
                                    ) : "—"}
                                  </td>
                                  <td />
                                  <td className="text-end fw-bold text-primary">{grandTotalAmt.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* ── Récap JH par Lot / Phase / Sprint ── */}
                        <div className="card shadow-sm mb-3">
                          <div className="card-header fw-bold d-flex justify-content-between align-items-center">
                            <span>Récapitulatif JH par Lot / Phase / Sprint</span>
                            <div className="d-flex gap-2">
                              <span className="badge bg-dark">{fmtJH(tableGrandJH)} JH planifiés</span>
                              {tableGrandTs > 0 && (
                                <span className="badge" style={{ backgroundColor: progressColor(tableGrandJH > 0 ? Math.round((tableGrandTs / tableGrandJH) * 100) : 0) }}>
                                  {fmtJH(tableGrandTs)} JH réalisés
                                </span>
                              )}
                              {tableGrandEcart !== null && (
                                <span className="badge" style={{ backgroundColor: ecartColor(tableGrandEcart) }}>
                                  {fmtEcart(tableGrandEcart)} JH passés
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="card-body p-0">
                            <table className="table table-sm table-bordered mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>Niveau</th>
                                  <th className="text-end" style={{ width: 90 }}>Planifié</th>
                                  <th className="text-end" style={{ width: 100 }}>Tps de réalisation</th>
                                  <th className="text-end" style={{ width: 90 }}>Tps passé</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lotRecap.map(({ lot, vol: lotVol, ts: lotTs, phases }) => {
                                  const lotPct   = lotVol > 0 && lotTs > 0 ? Math.round((lotTs / lotVol) * 100) : null;
                                  const lotEcart = lotTs > 0 ? lotVol - lotTs : null;
                                  return (
                                    <React.Fragment key={lot.id}>
                                      <tr style={{ cursor: "pointer", backgroundColor: "#e8eaf6" }} onClick={() => toggleRecapLot(lot.id)}>
                                        <td>
                                          <span className="me-2 text-muted" style={{ fontSize: "0.75rem" }}>{expandedRecapLots.has(lot.id) ? <FaChevronDown /> : <FaChevronRight />}</span>
                                          <strong>{lot.name}</strong>
                                          {(() => { const d = getLotDates(lot); return (d.debut || d.fin) ? <DateBadge debut={d.debut} fin={d.fin} style={{ marginLeft: 6 }} /> : null; })()}
                                        </td>
                                        <td className="text-end fw-bold">{fmtJH(lotVol)}</td>
                                        <td className="text-end" style={{ color: lotTs > 0 ? progressColor(lotPct ?? 0) : "#adb5bd", fontWeight: lotTs > 0 ? 600 : "normal" }}>
                                          {lotTs > 0 ? fmtJH(lotTs) : "—"}
                                        </td>
                                        <td className="text-end">
                                          {lotEcart !== null ? (
                                            <span style={{ color: ecartColor(lotEcart), fontSize: "0.75rem", fontWeight: 600 }}>
                                              {fmtEcart(lotEcart)}
                                            </span>
                                          ) : <span className="text-muted small">—</span>}
                                        </td>
                                      </tr>
                                      {expandedRecapLots.has(lot.id) && phases.map(({ phase, vol: phVol, ts: phTs, sprints: spData }) => {
                                        const phPct   = phVol > 0 && phTs > 0 ? Math.round((phTs / phVol) * 100) : null;
                                        const phEcart = phTs > 0 ? phVol - phTs : null;
                                        return (
                                          <React.Fragment key={phase.id}>
                                            <tr style={{ cursor: "pointer", backgroundColor: "#f3f4fb" }} onClick={() => toggleRecapPhase(phase.id)}>
                                              <td className="ps-4">
                                                <span className="me-2 text-muted" style={{ fontSize: "0.75rem" }}>{expandedRecapPhases.has(phase.id) ? <FaChevronDown /> : <FaChevronRight />}</span>
                                                {phase.name}
                                                {((phase as any).dateDebut || (phase as any).dateFin) && <DateBadge debut={(phase as any).dateDebut} fin={(phase as any).dateFin} style={{ marginLeft: 6 }} />}
                                              </td>
                                              <td className="text-end">{fmtJH(phVol)}</td>
                                              <td className="text-end" style={{ color: phTs > 0 ? progressColor(phPct ?? 0) : "#adb5bd", fontWeight: phTs > 0 ? 600 : "normal" }}>
                                                {phTs > 0 ? fmtJH(phTs) : "—"}
                                              </td>
                                              <td className="text-end">
                                                {phEcart !== null ? (
                                                  <span style={{ color: ecartColor(phEcart), fontSize: "0.75rem", fontWeight: 600 }}>
                                                    {fmtEcart(phEcart)}
                                                  </span>
                                                ) : <span className="text-muted small">—</span>}
                                              </td>
                                            </tr>
                                            {expandedRecapPhases.has(phase.id) && spData.map(({ sprint, vol: spVol, ts: spTs }) => spVol > 0 && (
                                              <tr key={sprint.id} style={{ backgroundColor: "#fafbff" }}>
                                                <td className="ps-5 text-muted small">Sprint {sprint.order} : {sprint.name}</td>
                                                <td className="text-end small">{fmtJH(spVol)}</td>
                                                <td className="text-end small" style={{ color: spTs > 0 ? progressColor(Math.round((spTs / spVol) * 100)) : "#adb5bd" }}>
                                                  {spTs > 0 ? fmtJH(spTs) : "—"}
                                                </td>
                                                <td className="text-end small">
                                                  {spTs > 0 && spVol > 0 ? (() => {
                                                    const spEcart = spVol - spTs;
                                                    return <span style={{ color: ecartColor(spEcart), fontWeight: 600 }}>{fmtEcart(spEcart)}</span>;
                                                  })() : <span className="text-muted">—</span>}
                                                </td>
                                              </tr>
                                            ))}
                                          </React.Fragment>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* ── Récap par profil → Lot / Phase / Sprint ── */}
                        {profils.length > 0 && (
                          <div className="card shadow-sm mb-4">
                            <div className="card-header fw-bold">Récapitulatif JH par profil — détail Lot / Phase / Sprint</div>
                            <div className="card-body p-0">
                              {profils.map(profil => {
                                const profilTot = profilTotals.find(t => t.profil.id === profil.id);
                                const profilVol = profilTot?.vol ?? 0;
                                const profilTs  = profilTot?.ts ?? 0;
                                const profilAmt = profilTot?.amount ?? 0;
                                const profilPct = profilVol > 0 && profilTs > 0 ? Math.round((profilTs / profilVol) * 100) : null;
                                const profilEcart = profilTs > 0 ? profilVol - profilTs : null;
                                const isOpen = expandedProfilRecap.has(profil.id);
                                return (
                                  <div key={profil.id} className="border-bottom">
                                    <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ cursor: "pointer", backgroundColor: isOpen ? "#fff8e1" : "white" }} onClick={() => toggleProfilRecap(profil.id)}>
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>{isOpen ? <FaChevronDown /> : <FaChevronRight />}</span>
                                        <strong>{profil.name}</strong>
                                        {profil.desc && <small className="text-muted">— {profil.desc}</small>}
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-warning text-dark">{fmtMnt(profil.tjm)} {deviseAbr}/j</span>
                                        <span className="badge bg-primary">{fmtJH(profilVol)} JH planifiés</span>
                                        {profilTs > 0 && (
                                          <span className="badge" style={{ backgroundColor: progressColor(profilPct ?? 0) }}>
                                            {fmtJH(profilTs)} JH réalisés
                                          </span>
                                        )}
                                        {profilEcart !== null && (
                                          <span className="badge" style={{ backgroundColor: ecartColor(profilEcart) }}
                                            title={profilEcart >= 0 ? "Temps restant" : "Dépassement"}>
                                            {fmtEcart(profilEcart)} JH Tps passés
                                          </span>
                                        )}
                                        <span className="badge bg-success">{profilAmt.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</span>
                                      </div>
                                    </div>
                                    {isOpen && (
                                      <div className="px-3 pb-2 pt-1" style={{ backgroundColor: "#fffde7" }}>
                                        <table className="table table-sm table-bordered mb-0 bg-white">
                                          <thead className="table-light">
                                            <tr>
                                              <th>Niveau</th>
                                              <th className="text-end" style={{ width: 75 }}>Planifié</th>
                                              <th className="text-end" style={{ width: 85 }}>Réalisation</th>
                                              <th className="text-end" style={{ width: 75 }}>Tps passé</th>
                                              <th className="text-end" style={{ width: 110 }}>Montant</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {lotRecap.map(({ lot, phases, byProfil: lotByProfil }) => {
                                              const lEntry = lotByProfil.find(bp => bp.profil.id === profil.id);
                                              const lVol = lEntry?.vol ?? 0;
                                              const lTs  = lEntry?.ts ?? 0;
                                              if (lVol === 0 && !expandedProfilLots.get(profil.id)?.has(lot.id)) return null;
                                              const isLotOpen = expandedProfilLots.get(profil.id)?.has(lot.id) ?? false;
                                              const lPct   = lVol > 0 && lTs > 0 ? Math.round((lTs / lVol) * 100) : null;
                                              const lEcart = lTs > 0 ? lVol - lTs : null;
                                              return (
                                                <React.Fragment key={lot.id}>
                                                  <tr style={{ cursor: "pointer", backgroundColor: "#f0f2ff" }} onClick={() => toggleProfilLot(profil.id, lot.id)}>
                                                    <td><span className="me-2 text-muted" style={{ fontSize: "0.75rem" }}>{isLotOpen ? <FaChevronDown /> : <FaChevronRight />}</span><strong>{lot.name}</strong></td>
                                                    <td className="text-end fw-bold">{fmtJH(lVol)}</td>
                                                    <td className="text-end" style={{ color: lTs > 0 ? progressColor(lPct ?? 0) : "#adb5bd", fontWeight: lTs > 0 ? 600 : "normal" }}>{lTs > 0 ? fmtJH(lTs) : "—"}</td>
                                                    <td className="text-end">
                                                      {lEcart !== null ? <span style={{ color: ecartColor(lEcart), fontSize: "0.75rem", fontWeight: 600 }}>{fmtEcart(lEcart)}</span> : "—"}
                                                    </td>
                                                    <td className="text-end">{(lVol * profil.tjm).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                                  </tr>
                                                  {isLotOpen && phases.map(({ phase, byProfil: phByProfil, sprints: phSprints }) => {
                                                    const phEntry = phByProfil.find(bp => bp.profil.id === profil.id);
                                                    const phVol = phEntry?.vol ?? 0;
                                                    const phTs  = phEntry?.ts ?? 0;
                                                    const phPct   = phVol > 0 && phTs > 0 ? Math.round((phTs / phVol) * 100) : null;
                                                    const phEcart = phTs > 0 ? phVol - phTs : null;
                                                    return (
                                                      <React.Fragment key={phase.id}>
                                                        <tr style={{ backgroundColor: "#f8f9ff" }}>
                                                          <td className="ps-4 text-muted">{phase.name}</td>
                                                          <td className="text-end small">{fmtJH(phVol)}</td>
                                                          <td className="text-end small" style={{ color: phTs > 0 ? progressColor(phPct ?? 0) : "#adb5bd" }}>{phTs > 0 ? fmtJH(phTs) : "—"}</td>
                                                          <td className="text-end small">
                                                            {phEcart !== null ? <span style={{ color: ecartColor(phEcart) }}>{fmtEcart(phEcart)}</span> : "—"}
                                                          </td>
                                                          <td className="text-end small">{(phVol * profil.tjm).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                                        </tr>
                                                        {phSprints.map(({ sprint, byProfil: spByProfil }) => {
                                                          const spEntry = spByProfil.find(bp => bp.profil.id === profil.id);
                                                          const spVol = spEntry?.vol ?? 0;
                                                          const spTs  = spEntry?.ts ?? 0;
                                                          if (spVol === 0) return null;
                                                          const spPct   = spVol > 0 && spTs > 0 ? Math.round((spTs / spVol) * 100) : null;
                                                          const spEcart = spTs > 0 ? spVol - spTs : null;
                                                          return (
                                                            <tr key={sprint.id} style={{ backgroundColor: "#fcfcff" }}>
                                                              <td className="ps-5 text-muted small">Sprint {sprint.order} : {sprint.name}</td>
                                                              <td className="text-end small text-muted">{fmtJH(spVol)}</td>
                                                              <td className="text-end small" style={{ color: spTs > 0 ? progressColor(spPct ?? 0) : "#adb5bd" }}>{spTs > 0 ? fmtJH(spTs) : "—"}</td>
                                                              <td className="text-end small">
                                                                {spEcart !== null ? <span style={{ color: ecartColor(spEcart) }}>{fmtEcart(spEcart)}</span> : "—"}
                                                              </td>
                                                              <td className="text-end small text-muted">{(spVol * profil.tjm).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                                            </tr>
                                                          );
                                                        })}
                                                      </React.Fragment>
                                                    );
                                                  })}
                                                </React.Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── Tableau lignes ── */}
                        <div className="d-flex justify-content-end mb-3">
                          <Button label="Ajouter une ligne" icon={<FaPlus />} onClick={openAddLine} />
                        </div>
                        <div className="table-responsive shadow-sm rounded">
                          <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-dark">
                              <tr>
                                <th style={{ width: 32 }} /><th style={{ width: 40 }}>#</th>
                                <th style={{ minWidth: 180 }}>Lot / Phase / Sprint</th>
                                <th>Epic</th><th>User Story</th><th>Description</th><th>Détails</th>
                                {/* ── Colonne Ressources unique (remplace N colonnes profil) ── */}
                                <th style={{ minWidth: 220, backgroundColor: "#1e3a5f", color: "#fff" }}>
                                  <div className="fw-bold">Ressources</div>
                                  <div style={{ fontSize: "0.62rem", opacity: 0.8, fontWeight: 400, marginTop: 2 }}>
                                    Profil · JH · Réalisation · Tps passé · Statut
                                  </div>
                                </th>
                                {/* ── Colonne OK/KO unique ── */}
                                <th className="text-center" style={{ minWidth: 130, backgroundColor: "#0f766e", color: "#fff" }}>
                                  <div className="fw-bold" style={{ fontSize: "0.8rem" }}>Statut test</div>
                                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 3 }}>
                                    <span style={{ fontSize: "0.6rem", background: "#f0fdf4", color: "#16a34a", borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>OK</span>
                                    <span style={{ fontSize: "0.6rem", background: "#fff5f5", color: "#dc2626", borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>KO</span>
                                  </div>
                                </th>
                                <th className="text-center" style={{ minWidth: 75, backgroundColor: "#495057" }}>
                                  <div className="fw-bold text-warning">Total JH</div>
                                </th>
                                <th style={{ width: 90 }} />
                              </tr>
                            </thead>
                            <tbody ref={lineBodyRef}>
                              {lines.length === 0 ? (
                                <tr className="empty-row">
                                  <td colSpan={11} className="text-center text-muted fst-italic py-4">
                                    Aucune ligne — cliquez sur « Ajouter une ligne »
                                  </td>
                                </tr>
                              ) : lines.slice((linePage - 1) * LINE_PAGE_SIZE, linePage * LINE_PAGE_SIZE).map(line => {
                                const lot = getLotByPhaseId((line as any).phaseId);
                                const phaseName = getPhaseNameById((line as any).phaseId);
                                const sprintId = (line as any).sprintId;
                                const sprintName = sprintId ? (sprints.get((line as any).phaseId) ?? []).find(s => s.id === sprintId)?.name ?? null : null;
                                const lineJH = getLineJH(line.id);
                                // Toutes les affectations pour cette ligne (ayant un volume > 0)
                                const lpsForLine = lineProfils.filter(lp => lp.lineId === line.id && lp.volume > 0);

                                return (
                                  <tr key={line.id}>
                                    <td className="drag-line text-center text-muted" style={{ cursor: "grab", userSelect: "none" }}>⋮⋮</td>
                                    <td className="text-center text-muted">{line.order}</td>
                                    <td className="text-nowrap">
                                      <div className="d-flex align-items-center gap-1" style={{ cursor: "pointer" }} onClick={() => toggleLine(line.id)}>
                                        <span className="text-muted" style={{ fontSize: "0.7rem" }}>{expandedLines.has(line.id) ? <FaChevronDown /> : <FaChevronRight />}</span>
                                        <span className="fw-semibold small text-truncate" style={{ maxWidth: 160 }}>{lot?.name ?? "—"}</span>
                                      </div>
                                      {expandedLines.has(line.id) && (
                                        <div className="ms-3 mt-1" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
                                          <div><span className="text-muted">Phase :</span> <span className="fw-semibold">{phaseName}</span></div>
                                          {sprintName && <div><span className="text-muted">Sprint :</span> <span className="fw-semibold">{sprintName}</span></div>}
                                        </div>
                                      )}
                                    </td>
                                    <td>{line.epic ?? "—"}</td>
                                    <td>{line.userStory ?? "—"}</td>
                                    <td>{line.description ?? "—"}</td>
                                    <td>{line.resultat ?? "—"}</td>

                                    {/* ══ Colonne Ressources — groupée ══════════════════════════════════ */}
                                    <td style={{ verticalAlign: "top", padding: "6px 8px", backgroundColor: "#f8faff" }}>
                                      {lpsForLine.length === 0 ? (
                                        <button
                                          className="btn btn-sm btn-outline-primary w-100"
                                          style={{ fontSize: "0.7rem" }}
                                          onClick={() => openVolModalForLine(line.id)}>
                                          <FaPlus size={9} className="me-1" />Affecter une ressource
                                        </button>
                                      ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          {lpsForLine.map(lp => {
                                            const profilObj = profils.find(p => p.id === (lp.profil as any)?.id);
                                            const profilName = profilObj?.name ?? (lp.profil as any)?.name ?? "—";
                                            const collab = lp.collaborateur;
                                            const collabNom = collab
                                              ? (() => {
                                                  const fullName = `${(collab as any).prenom ?? ""} ${(collab as any).nom ?? ""}`.trim();
                                                  const appellation = (collab as any).appellation;
                                                  if (fullName && appellation) return `${fullName} (${appellation})`;
                                                  return fullName || appellation || null;
                                                })()
                                              : null;
                                            const vol = lp.volume;
                                            const timeSpent = lp.timeSpent ?? null;
                                            const deadline = lp.deadLine ?? null;
                                            const lpStatusId: number | null = (lp as any)?.currentStatus?.status?.id ?? (lp as any)?.statusId ?? null;
                                            const statusMeta = taskStatusMeta(lpStatusId);
                                            const ecart = vol > 0 && timeSpent != null ? vol - timeSpent : null;
                                            const pct = vol > 0 && timeSpent != null ? Math.round((timeSpent / vol) * 100) : null;
                                            const isOverdue = deadline && new Date(deadline) < new Date() && lpStatusId !== TASK_STATUS.VALIDE;

                                            return (
                                              <div
                                                key={lp.id}
                                                style={{
                                                  background: "#fff",
                                                  border: "1px solid #dbeafe",
                                                  borderRadius: 7,
                                                  padding: "5px 8px",
                                                  cursor: "pointer",
                                                  transition: "box-shadow 0.15s",
                                                }}
                                                onClick={() => openVolModal(line.id, (lp.profil as any)?.id)}
                                                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.15)")}
                                                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                                                title="Cliquer pour modifier"
                                              >
                                                {/* Profil + Collaborateur */}
                                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                                                  <span style={{
                                                    fontSize: "0.68rem", fontWeight: 700, color: "#1e40af",
                                                    background: "#eff6ff", border: "1px solid #bfdbfe",
                                                    borderRadius: 4, padding: "1px 5px",
                                                  }}>
                                                    {profilName}
                                                  </span>
                                                  {collabNom && (
                                                    <span style={{ fontSize: "0.62rem", color: "#64748b", fontStyle: "italic" }}>
                                                      {collabNom}
                                                    </span>
                                                  )}
                                                  {statusMeta && (
                                                    <span style={{
                                                      display: "inline-flex", alignItems: "center", gap: 3,
                                                      fontSize: "0.6rem", fontWeight: 600, color: statusMeta.color,
                                                      background: statusMeta.bg, border: `1px solid ${statusMeta.color}33`,
                                                      borderRadius: 10, padding: "1px 5px", whiteSpace: "nowrap",
                                                    }}>
                                                      <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: statusMeta.dot, flexShrink: 0 }} />
                                                      {statusMeta.label}
                                                    </span>
                                                  )}
                                                </div>

                                                {/* JH / Réalisation / Écart */}
                                                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                                  <span className="badge bg-primary" style={{ fontSize: "0.65rem" }}>{vol} JH</span>
                                                  {timeSpent != null && (
                                                    <span className={`badge ${pct! > 100 ? "bg-danger" : pct! >= 80 ? "bg-warning text-dark" : "bg-success"}`}
                                                      style={{ fontSize: "0.6rem" }}>
                                                      {timeSpent} réal.
                                                    </span>
                                                  )}
                                                  {ecart !== null && (
                                                    <span style={{
                                                      fontSize: "0.58rem", fontWeight: 700,
                                                      color: ecartColor(ecart),
                                                      background: ecart < 0 ? "#fef2f2" : ecart === 0 ? "#f3f4f6" : "#ecfdf5",
                                                      border: `1px solid ${ecartColor(ecart)}44`,
                                                      borderRadius: 10, padding: "1px 4px",
                                                    }}>
                                                      {fmtEcart(ecart)} passé
                                                    </span>
                                                  )}
                                                </div>

                                                {/* Deadline */}
                                                {deadline && (
                                                  <div style={{
                                                    fontSize: "0.58rem", marginTop: 2,
                                                    color: lpStatusId === TASK_STATUS.VALIDE ? "#10b981" : isOverdue ? "#dc3545" : "#6c757d",
                                                    fontWeight: (isOverdue || lpStatusId === TASK_STATUS.VALIDE) ? "bold" : "normal",
                                                  }}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                                      {isOverdue
                                                        ? <FaExclamationTriangle size={9} style={{ flexShrink: 0 }} />
                                                        : <FaClock size={9} style={{ flexShrink: 0 }} />
                                                      }
                                                      {fmtDateTime(deadline)}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                          {/* Bouton pour ajouter une autre ressource */}
                                          <button
                                            className="btn btn-sm btn-outline-secondary"
                                            style={{ fontSize: "0.65rem", padding: "2px 6px" }}
                                            onClick={() => openVolModalForLine(line.id)}>
                                            <FaPlus size={8} className="me-1" />Ajouter
                                          </button>
                                        </div>
                                      )}
                                    </td>

                                    {/* ══ Colonne Statut OK/KO — groupée pour toutes les ressources de la ligne ══ */}
                                    <td className="text-center" style={{ verticalAlign: "top", padding: "6px 6px", minWidth: 130, backgroundColor: "#f0fdfa" }}>
                                      {lpsForLine.length === 0 ? (
                                        <span className="text-muted" style={{ fontSize: "0.62rem" }}>—</span>
                                      ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          {lpsForLine.map(lp => {
                                            const profilObj = profils.find(p => p.id === (lp.profil as any)?.id);
                                            const profilName = profilObj?.name ?? "—";
                                            const lpStatusId: number | null = (lp as any)?.currentStatus?.status?.id ?? (lp as any)?.statusId ?? null;
                                            const currentTest = testStatuses.get(lp.id) ?? null;
                                            return (
                                              <div key={lp.id} style={{
                                                background: "#fff",
                                                border: "1px solid #ccfbf1",
                                                borderRadius: 7,
                                                padding: "4px 6px",
                                              }}>
                                                <div style={{ fontSize: "0.6rem", color: "#64748b", marginBottom: 3, fontWeight: 600 }}>
                                                  {profilName}
                                                </div>
                                                <TestStatusPanel
                                                  taskId={lp.id}
                                                  currentStatusId={lpStatusId}
                                                  currentTestStatus={currentTest}
                                                  onDone={handleTestStatus}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>

                                    {/* ── Total JH ligne ── */}
                                    <td className="text-center" style={{ backgroundColor: lineJH > 0 && !line.facturable ? "#f8f9fa" : "#fffbea" }}>
                                      <div className="d-flex flex-column align-items-center gap-1">
                                        {lineJH > 0
                                          ? <span className="badge bg-warning text-dark fw-bold">{fmtJH(lineJH)}</span>
                                          : <span className="text-muted small">—</span>}
                                        {!line.facturable && (
                                          <span
                                            className="badge bg-secondary"
                                            style={{ fontSize: "0.58rem", letterSpacing: "0.02em" }}
                                            title="Cette tâche n'est pas facturée"
                                          >
                                            Non facturable
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex gap-1 justify-content-center">
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLine(line)}><FaEdit /></button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteLine(line.id)}><FaTrash /></button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {lines.length > 0 && (
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td colSpan={7} className="text-end pe-3 text-muted" style={{ fontSize: "0.85rem" }}>TOTAL ↓</td>
                                  {/* Footer Ressources */}
                                  <td style={{ verticalAlign: "middle", padding: "6px 8px" }}>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                      {profilTotals.filter(t => t.vol > 0).map(({ profil, vol, ts }) => {
                                        const pct = vol > 0 && ts > 0 ? Math.round((ts / vol) * 100) : null;
                                        const ecart = ts > 0 ? vol - ts : null;
                                        return (
                                          <div key={profil.id} style={{
                                            background: "#eff6ff", border: "1px solid #bfdbfe",
                                            borderRadius: 6, padding: "3px 7px", fontSize: "0.68rem",
                                          }}>
                                            <span style={{ fontWeight: 700, color: "#1e40af" }}>{profil.name}</span>
                                            <span className="ms-1 badge bg-primary" style={{ fontSize: "0.6rem" }}>{fmtJH(vol)} JH</span>
                                            {ts > 0 && <span className="ms-1 badge" style={{ fontSize: "0.6rem", backgroundColor: progressColor(pct ?? 0) }}>{fmtJH(ts)} réal.</span>}
                                            {ecart !== null && <span className="ms-1" style={{ color: ecartColor(ecart), fontWeight: 700, fontSize: "0.6rem" }}>{fmtEcart(ecart)}</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  {/* Footer OK/KO — compteur global */}
                                  <td className="text-center" style={{ fontSize: "0.72rem", backgroundColor: "#f0fdfa" }}>
                                    {(() => {
                                      let okCount = 0;
                                      let koCount = 0;
                                      lineProfils.forEach(lp => {
                                        const ts = testStatuses.get(lp.id);
                                        if (ts === "ok") okCount++;
                                        else if (ts === "ko") koCount++;
                                      });
                                      return (okCount > 0 || koCount > 0) ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                          {okCount > 0 && <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ {okCount} OK</span>}
                                          {koCount > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}>✗ {koCount} KO</span>}
                                        </div>
                                      ) : <span className="text-muted">—</span>;
                                    })()}
                                  </td>
                                  <td className="text-center">
                                    <div className="d-flex flex-column align-items-center gap-1">
                                      <span className="badge bg-dark">{fmtJH(tableGrandJH)} JH</span>
                                      {tableGrandTs > 0 && <span className="badge" style={{ backgroundColor: progressColor(tableGrandJH > 0 ? Math.round((tableGrandTs / tableGrandJH) * 100) : 0) }}>{fmtJH(tableGrandTs)} réal.</span>}
                                      {tableGrandEcart !== null && <span className="badge" style={{ backgroundColor: ecartColor(tableGrandEcart) }}>{fmtEcart(tableGrandEcart)} passé</span>}
                                    </div>
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>

                        {/* ── Pagination ── */}
                        {lines.length > LINE_PAGE_SIZE && (() => {
                          const totalPages = Math.ceil(lines.length / LINE_PAGE_SIZE);
                          return (
                            <div className="d-flex align-items-center justify-content-between mt-2 px-1">
                              <span className="text-muted small">
                                Page {linePage} / {totalPages} — {lines.length} ligne{lines.length > 1 ? 's' : ''}
                              </span>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={linePage === 1}
                                  onClick={() => setLinePage(1)}
                                  title="Première page"
                                >«</button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={linePage === 1}
                                  onClick={() => setLinePage(p => p - 1)}
                                  title="Page précédente"
                                >‹</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                  .filter(p => p === 1 || p === totalPages || Math.abs(p - linePage) <= 1)
                                  .reduce<(number | '…')[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                                    acc.push(p);
                                    return acc;
                                  }, [])
                                  .map((p, i) => p === '…'
                                    ? <span key={`e${i}`} className="btn btn-sm disabled px-2">…</span>
                                    : <button
                                        key={p}
                                        className={`btn btn-sm ${linePage === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        style={linePage === p ? { background: 'var(--charcoal-blue)', borderColor: 'var(--charcoal-blue)' } : {}}
                                        onClick={() => setLinePage(p as number)}
                                      >{p}</button>
                                  )
                                }
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={linePage === totalPages}
                                  onClick={() => setLinePage(p => p + 1)}
                                  title="Page suivante"
                                >›</button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled={linePage === totalPages}
                                  onClick={() => setLinePage(totalPages)}
                                  title="Dernière page"
                                >»</button>
                              </div>
                            </div>
                          );
                        })()}
                      </Tab>
                      <Tab eventKey="budget" title="Budget">
                        <BudgetTab lots={lots} profils={profils as any} lines={lines} lineProfils={lineProfils as any} selectedBacklogId={backlog?.id ?? null} leadId={leadId ?? null} deviseAbr={deviseAbr} onTotalChange={setBudgetRH} />
                      </Tab>
                      <Tab eventKey="charges_annexes" title="Charges annexes">
                        <ChargesAnnexesTab
                          backlogId={backlog?.id ?? null}
                          deviseAbr={deviseAbr}
                          budgetRH={budgetRH}
                          service={svc.chargesAnnexes}
                        />
                      </Tab>
                      <Tab eventKey="facturation" title="Facturation des ressources">
                        <FacturableProfil
                          lots={lots}
                          profils={profils}
                          lines={lines}
                          lineProfils={lineProfils}
                          deviseAbr={deviseAbr}
                        />
                      </Tab>
                      <Tab eventKey="paiements" title="Paiements clients">
                        <CalendrierPaiementTab
                          backlogId={backlog?.id ?? null}
                          lots={lots}
                          sprints={sprints}
                          deliverables={deliverables}
                          deviseAbr={deviseAbr}
                          montantOffre={montantOffre}
                          service={svc.paiement}
                        />
                      </Tab>
                      {/* <Tab eventKey="burndown" title="Burndown charte">
                        <BurndownTab
                          lots={lots}
                          sprints={sprints}
                          service={svc.burndown}
                        />
                      </Tab> */}
                    </Tabs>
                  )}
                </>
              )}
            </div>
          </Modal.Body>
        </Modal>

        {/* ══════════════════════════ MODAUX MÉTIER ═══════════════════════ */}

        <Modal show={showLotModal} onHide={() => !saving && setShowLotModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editLot ? "Modifier le lot" : "Nouveau lot"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fLot.name} onChange={e => setFLot(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={fLot.desc} onChange={e => setFLot(f => ({ ...f, desc: e.target.value }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowLotModal(false)} />
            <Button label={saving ? "…" : editLot ? "Enregistrer" : "Créer"} onClick={saveLot} />
          </Modal.Footer>
        </Modal>

        <Modal show={showPhaseModal} onHide={() => !saving && setShowPhaseModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editPhase ? "Modifier la phase" : "Nouvelle phase"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form><Form.Group><Form.Label>Nom *</Form.Label><Form.Control value={fPhase.name} onChange={e => setFPhase({ name: e.target.value })} disabled={saving} autoFocus /></Form.Group></Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowPhaseModal(false)} />
            <Button label={saving ? "…" : editPhase ? "Enregistrer" : "Créer"} onClick={savePhase} />
          </Modal.Footer>
        </Modal>

        <Modal show={showSprintModal} onHide={() => !saving && setShowSprintModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editSprint ? "Modifier le sprint" : "Nouveau sprint"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fSprint.name} onChange={e => setFSprint(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              <div className="row g-2">
                <div className="col"><Form.Group><Form.Label>Date début</Form.Label><Form.Control type="date" value={fSprint.startDate} onChange={e => setFSprint(f => ({ ...f, startDate: e.target.value }))} disabled={saving} /></Form.Group></div>
                <div className="col"><Form.Group><Form.Label>Date fin</Form.Label><Form.Control type="date" value={fSprint.endDate} onChange={e => setFSprint(f => ({ ...f, endDate: e.target.value }))} disabled={saving} /></Form.Group></div>
              </div>
              {(fSprint.startDate || fSprint.endDate) && <div className="mt-2 p-2 rounded" style={{ background: "#e8f4fd", fontSize: "0.78rem", color: "#555" }}>Les dates de la <strong>phase</strong> et du <strong>lot</strong> seront automatiquement recalculées.</div>}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowSprintModal(false)} />
            <Button label={saving ? "…" : editSprint ? "Enregistrer" : "Créer"} onClick={saveSprint} />
          </Modal.Footer>
        </Modal>

        <Modal show={showDelivModal} onHide={() => !saving && setShowDelivModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editDeliv ? "Modifier le livrable" : "Nouveau livrable"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fDeliv.name} onChange={e => setFDeliv(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              {ctxPhaseId !== null && (
                <Form.Group className="mb-3">
                  <Form.Label>Sprint associé</Form.Label>
                  <Form.Select value={fDeliv.sprintId ?? ""} onChange={e => setFDeliv(f => ({ ...f, sprintId: e.target.value ? +e.target.value : null }))} disabled={saving}>
                    <option value="">Sans sprint</option>
                    {(sprints.get(ctxPhaseId) ?? []).map(s => <option key={s.id} value={s.id}>Sprint {s.order} — {s.name}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
              <Form.Group className="mb-3"><Form.Label>Date de livraison</Form.Label><Form.Control type="date" value={fDeliv.deliveryDate} onChange={e => setFDeliv(f => ({ ...f, deliveryDate: e.target.value }))} disabled={saving} /></Form.Group>
              <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={fDeliv.description} onChange={e => setFDeliv(f => ({ ...f, description: e.target.value }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowDelivModal(false)} />
            <Button label={saving ? "…" : editDeliv ? "Enregistrer" : "Créer"} onClick={saveDeliv} />
          </Modal.Footer>
        </Modal>

        <Modal show={showProfilModal} onHide={() => !saving && setShowProfilModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editProfil ? "Modifier le profil" : "Nouveau profil"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fProfil.name} onChange={e => setFProfil(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control value={fProfil.desc} onChange={e => setFProfil(f => ({ ...f, desc: e.target.value }))} disabled={saving} /></Form.Group>
              <Form.Group><Form.Label>TJM ({deviseAbr}/jour) *</Form.Label><Form.Control type="number" min="0" step="50" value={fProfil.tjm} onChange={e => setFProfil(f => ({ ...f, tjm: +e.target.value || 0 }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowProfilModal(false)} />
            <Button label={saving ? "…" : editProfil ? "Enregistrer" : "Créer"} onClick={saveProfil} />
          </Modal.Footer>
        </Modal>

        <Modal show={showCollabModal} onHide={() => !saving && setShowCollabModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title className="d-flex align-items-center gap-2">
              <FaUsers />
              Collaborateurs — {collabProfil?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Barre de recherche */}
            <div className="collab-search-bar mb-3">
              <div className="collab-search-type mb-2">
                <div className="btn-group btn-group-sm w-100">
                  <button
                    className={`btn ${collabSearchType === 'name' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={collabSearchType === 'name' ? { background: 'var(--charcoal-blue)', borderColor: 'var(--charcoal-blue)' } : {}}
                    onClick={() => setCollabSearchType('name')}
                    disabled={saving}
                  >
                    <FaUser className="me-1" /> Par nom / prénom
                  </button>
                  <button
                    className={`btn ${collabSearchType === 'poste' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={collabSearchType === 'poste' ? { background: 'var(--charcoal-blue)', borderColor: 'var(--charcoal-blue)' } : {}}
                    onClick={() => setCollabSearchType('poste')}
                    disabled={saving}
                  >
                    <FaSearch className="me-1" /> Par poste / BU
                  </button>
                </div>
              </div>
              <div className="input-group">
                <span className="input-group-text" style={{ background: 'var(--soft-linen)', borderColor: 'var(--border-grey)' }}>
                  <FaSearch style={{ color: 'var(--dim-grey)' }} />
                </span>
                <Form.Control
                  placeholder={collabSearchType === 'name' ? "Rechercher par nom ou prénom..." : "Rechercher par poste ou Business Unit..."}
                  value={collabSearch}
                  onChange={e => setCollabSearch(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
                {collabSearch && (
                  <button className="btn btn-outline-secondary" onClick={() => setCollabSearch("")} disabled={saving}>
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Collaborateurs sélectionnés */}
            {fCollabIds.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {fCollabIds.map(id => {
                  const c = allCollabs.find((x: any) => x.id === id);
                  if (!c) return null;
                  const fullName = `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
                  return (
                    <div key={id} className="profil-collab-badge">
                      <FaUser size={11} />
                      <span>{fullName || c.appelation || "—"}</span>
                      <button
                        type="button"
                        className="profil-collab-change-btn"
                        onClick={() => setFCollabIds(prev => prev.filter(x => x !== id))}
                        disabled={saving}
                        title="Retirer"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted fst-italic small mb-3">Aucun collaborateur sélectionné.</div>
            )}

            {/* Liste de résultats */}
            <div className="collab-results-list">
              {(() => {
                const q = collabSearch.toLowerCase().trim();
                const filtered = allCollabs.filter((c: any) => {
                  if (fCollabIds.includes(c.id)) return false;
                  if (!q) return true;
                  if (collabSearchType === 'name') {
                    return `${c.nom ?? ""} ${c.prenom ?? ""}`.toLowerCase().includes(q);
                  }
                  const activePoste = c.profilPostes?.find((pp: any) => !pp.endDate);
                  const poste = (activePoste?.poste?.label ?? "").toLowerCase();
                  const bu    = (activePoste?.bu?.name ?? "").toLowerCase();
                  return poste.includes(q) || bu.includes(q);
                });

                if (filtered.length === 0) return (
                  <div className="text-center text-muted py-4">
                    <FaUser size={24} className="mb-2 d-block mx-auto" style={{ opacity: 0.3 }} />
                    Aucun collaborateur trouvé
                  </div>
                );

                return filtered.map((c: any) => {
                  const activePoste = c.profilPostes?.find((pp: any) => !pp.endDate);
                  const posteLabel  = activePoste?.poste?.label ?? "—";
                  const buName      = activePoste?.bu?.name ?? "—";
                  const fullName    = `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
                  return (
                    <div
                      key={c.id}
                      className={`collab-result-item ${saving ? 'disabled' : ''}`}
                      onClick={() => !saving && setFCollabIds(prev => [...prev, c.id])}
                    >
                      <div className="collab-avatar">
                        {(c.prenom?.[0] ?? "").toUpperCase()}{(c.nom?.[0] ?? "").toUpperCase()}
                      </div>
                      <div className="collab-info">
                        <div className="collab-name">{fullName || c.appelation || "—"}</div>
                        <div className="collab-meta">
                          <span className="collab-poste">{posteLabel}</span>
                          <span className="collab-bu-sep">·</span>
                          <span className="collab-bu">{buName}</span>
                        </div>
                      </div>
                      <div className="collab-select-icon">
                        {saving ? <FaSpinner className="fa-spin" /> : <FaCheck />}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => { setShowCollabModal(false); setCollabSearch(""); setCollabSearchType("name"); }} />
            <Button label={saving ? "…" : "Enregistrer"} onClick={saveCollabs} />
          </Modal.Footer>
        </Modal>

        <Modal show={showLineModal} onHide={() => !saving && setShowLineModal(false)} centered size="lg">
          <Modal.Header closeButton><Modal.Title>{editLine ? "Modifier la ligne" : "Nouvelle ligne"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Lot *</Form.Label>
                <Form.Select value={fLine.lotId ?? ""} onChange={e => setFLine(f => ({ ...f, lotId: e.target.value ? +e.target.value : null, phaseId: null, sprintId: null }))} disabled={saving}>
                  <option value="">— Sélectionner un lot —</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Form.Select>
              </Form.Group>
              {fLine.lotId && (
                <Form.Group className="mb-3">
                  <Form.Label>Phase *</Form.Label>
                  <Form.Select value={fLine.phaseId ?? ""} onChange={e => setFLine(f => ({ ...f, phaseId: e.target.value ? +e.target.value : null, sprintId: null }))} disabled={saving}>
                    <option value="">— Sélectionner une phase —</option>
                    {((lots.find(l => l.id === fLine.lotId)?.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
              {fLine.phaseId && (sprints.get(fLine.phaseId) ?? []).length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label>Sprint <small className="text-muted">(optionnel)</small></Form.Label>
                  <Form.Select value={fLine.sprintId ?? ""} onChange={e => setFLine(f => ({ ...f, sprintId: e.target.value ? +e.target.value : null }))} disabled={saving}>
                    <option value="">— Sans sprint —</option>
                    {(sprints.get(fLine.phaseId) ?? []).map(s => <option key={s.id} value={s.id}>Sprint {s.order} — {s.name}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
              <div className="row g-2">
                <div className="col-md-6"><Form.Group><Form.Label>Epic</Form.Label><Form.Control value={fLine.epic} onChange={e => setFLine(f => ({ ...f, epic: e.target.value }))} disabled={saving} /></Form.Group></div>
                <div className="col-md-6"><Form.Group><Form.Label>User Story</Form.Label><Form.Control value={fLine.userStory} onChange={e => setFLine(f => ({ ...f, userStory: e.target.value }))} disabled={saving} /></Form.Group></div>
              </div>
              <Form.Group className="mb-3 mt-2"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={fLine.description} onChange={e => setFLine(f => ({ ...f, description: e.target.value }))} disabled={saving} /></Form.Group>
              <Form.Group><Form.Label>Détails / Résultat attendu</Form.Label><Form.Control as="textarea" rows={2} value={fLine.resultat} onChange={e => setFLine(f => ({ ...f, resultat: e.target.value }))} disabled={saving} /></Form.Group>
            </Form>
            <Form.Group className="mt-3">
              <div
                className="d-flex align-items-center justify-content-between p-3 rounded"
                style={{
                  backgroundColor: fLine.facturable ? "#ecfdf5" : "#f8f9fa",
                  border: `1px solid ${fLine.facturable ? "#6ee7b7" : "#dee2e6"}`,
                  transition: "all 0.2s",
                }}
              >
                <div>
                  <div className="fw-semibold" style={{ fontSize: "0.9rem" }}>Tâche facturable</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {fLine.facturable
                      ? "Le montant sera calculé selon le TJM du profil."
                      : "TJM = 0 — cette tâche ne sera pas facturée."}
                  </div>
                </div>
                <Form.Check
                  type="switch"
                  id="facturable-switch"
                  checked={fLine.facturable}
                  onChange={e => setFLine(f => ({ ...f, facturable: e.target.checked }))}
                  disabled={saving}
                  style={{ transform: "scale(1.3)" }}
                />
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowLineModal(false)} />
            <Button label={saving ? "…" : editLine ? "Enregistrer" : "Créer"} onClick={saveLine} />
          </Modal.Footer>
        </Modal>

        {/* ══ Modal Volume JH — avec sélecteur de ressource ════════════════════ */}
        <Modal show={showVolModal} onHide={() => !saving && setShowVolModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              Affecter une ressource
              {currentProfil ? ` — ${currentProfil.name}` : ""}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>

            {/* ── Sélecteur de ressource (profil + collaborateur) ── */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                Ressource *
                <small className="text-muted fw-normal ms-2">Profil et collaborateur du projet</small>
              </Form.Label>
              <Form.Select
                value={fSelectedRessource}
                onChange={e => handleRessourceChange(e.target.value)}
                disabled={saving}
                style={{
                  borderColor: fSelectedRessource ? "#6366f1" : "#dee2e6",
                  boxShadow: fSelectedRessource ? "0 0 0 0.15rem rgba(99,102,241,0.15)" : "none",
                }}
              >
                <option value="">— Sélectionner une ressource —</option>
                {profils.map(profil => (
                  <optgroup key={profil.id} label={`${profil.name}${profil.desc ? ` (${profil.desc})` : ""} — ${profil.tjm} ${deviseAbr}/j`}>
                    {profil.collaborateurs.length === 0 ? (
                      <option value={`${profil.id}|`}>
                        {profil.name} (sans collaborateur assigné)
                      </option>
                    ) : (
                      profil.collaborateurs.map((c: any) => {
                        const fullName = `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
                        const collabLabel = fullName && c.appellation
                          ? `${fullName} (${c.appellation})`
                          : fullName || c.appellation || "—";
                        return (
                          <option key={c.id} value={`${profil.id}|${c.id}`}>
                            {collabLabel}
                          </option>
                        );
                      })
                    )}
                  </optgroup>
                ))}
              </Form.Select>
              {fSelectedRessource && currentProfil && (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <span className="badge bg-warning text-dark" style={{ fontSize: "0.75rem" }}>
                    TJM : {currentProfil.tjm} {deviseAbr}/j
                  </span>
                  {fCollabId && (
                    <span className="badge bg-info text-dark" style={{ fontSize: "0.75rem" }}>
                      {(() => {
                        const c = currentProfil.collaborateurs.find((x: any) => x.id === fCollabId);
                        if (!c) return "";
                        const fullName = `${c.prenom ?? ""} ${c.nom ?? ""}`.trim();
                        return fullName && c.appellation
                          ? `${fullName} (${c.appellation})`
                          : fullName || c.appellation || "—";
                      })()}
                    </span>
                  )}
                </div>
              )}
            </Form.Group>

            <hr className="my-3" />

            <Form.Group className="mb-3">
              <Form.Label>Jours-Homme planifiés</Form.Label>
              <Form.Control
                type="number" step="0.5" min="0" value={fVolume}
                onChange={e => setFVolume(+e.target.value || 0)}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                disabled={saving || !fSelectedRessource}
                autoFocus={!fSelectedRessource}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Deadline</Form.Label>
              <Form.Control
                type="datetime-local" value={fDeadline}
                onChange={e => setFDeadline(e.target.value)}
                disabled={saving || !fSelectedRessource}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Temps de réalisation (JH)</Form.Label>
              <Form.Control
                type="number" step="0.5" min="0" placeholder="0"
                value={fTimeSpent ?? ""}
                onChange={e => setFTimeSpent(e.target.value ? +e.target.value : null)}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                disabled={saving || !fSelectedRessource}
              />
              {fVolume > 0 && fTimeSpent != null && (
                <div className="text-muted small mt-1">
                  {fTimeSpent} JH réalisés sur {fVolume} JH planifiés
                  {fTimeSpent > fVolume && <span className="text-danger fw-bold ms-2">⚠ Dépassement</span>}
                </div>
              )}
            </Form.Group>

            {fVolume > 0 && fTimeSpent != null && (
              <div className="mb-3 p-3 rounded" style={{ backgroundColor: "#f8f9fa", border: "1px solid #dee2e6" }}>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="text-muted small fw-semibold">Temps passé (planifié − réalisation)</span>
                  {(() => {
                    const ecart = fVolume - fTimeSpent;
                    return (
                      <span style={{ fontSize: "1rem", fontWeight: 700, color: ecartColor(ecart) }}
                        title={ecart >= 0 ? `${fmtJH(ecart)} JH restants` : `Dépassement de ${fmtJH(Math.abs(ecart))} JH`}>
                        {fmtEcart(ecart)} JH
                        {ecart < 0 && <span className="ms-1" style={{ fontSize: "0.8rem" }}></span>}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: 2 }}>
                  {fmtJH(fVolume)} JH planifiés − {fmtJH(fTimeSpent)} JH réalisés
                  {fVolume - fTimeSpent > 0
                    ? <span className="text-success ms-2">= {fmtJH(fVolume - fTimeSpent)} JH encore disponibles</span>
                    : fVolume - fTimeSpent < 0
                      ? <span className="text-danger ms-2">= dépassement de {fmtJH(Math.abs(fVolume - fTimeSpent))} JH</span>
                      : <span className="text-secondary ms-2">= exactement dans le planning</span>
                  }
                </div>
              </div>
            )}

            {currentProfil && (() => {
              const line = lines.find(l => l.id === ctxLineId);
              const isFacturable = line?.facturable !== false;
              return (
                <div className="text-muted small p-2 rounded" style={{ backgroundColor: isFacturable ? "#f8f9fa" : "#fff3cd", border: isFacturable ? "none" : "1px solid #ffc107" }}>
                  {!isFacturable && (
                    <div className="fw-semibold text-warning mb-1" style={{ fontSize: "0.75rem" }}>
                      ⚠ Tâche non facturable — TJM appliqué : 0 {deviseAbr}
                    </div>
                  )}
                  TJM : {isFacturable ? `${currentProfil.tjm?.toLocaleString("fr-FR")} ${deviseAbr}` : `0 ${deviseAbr}`}<br />
                  Montant estimé :{" "}
                  <strong>
                    {isFacturable
                      ? `${(fVolume * (currentProfil.tjm ?? 0)).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${deviseAbr}`
                      : `0 ${deviseAbr}`}
                  </strong>
                </div>
              );
            })()}

            {editLineProfil && (() => {
              const statusId: number | null = (editLineProfil as any)?.currentStatus?.status?.id ?? (editLineProfil as any)?.statusId ?? null;
              const m = taskStatusMeta(statusId);
              if (!m) return null;
              return (
                <div className="d-flex align-items-center gap-2 mt-2 p-2 rounded" style={{ backgroundColor: m.bg, border: `1px solid ${m.color}33` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: m.color, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8rem", color: m.color, fontWeight: 600 }}>Statut : {m.label}</span>
                </div>
              );
            })()}
          </Modal.Body>
          <Modal.Footer>
            {editLineProfil && <Button label="Supprimer" variant="outline" onClick={deleteVolume} />}
            <Button label="Annuler" variant="outline" onClick={() => setShowVolModal(false)} />
            <Button
              label={saving ? "…" : editLineProfil ? "Mettre à jour" : "Ajouter"}
              onClick={saveVolume}
            />
          </Modal.Footer>
        </Modal>

        <Modal show={showCellModal} onHide={() => !saving && setShowCellModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Valeur de cellule</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form><Form.Group><Form.Label>Valeur</Form.Label><Form.Control value={fCellVal} onChange={e => setFCellVal(e.target.value)} disabled={saving} autoFocus /></Form.Group></Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowCellModal(false)} />
            <Button label={saving ? "…" : "Enregistrer"} onClick={saveCellValue} />
          </Modal.Footer>
        </Modal>
      </>
    );
  };

  export default BacklogProjetModal;