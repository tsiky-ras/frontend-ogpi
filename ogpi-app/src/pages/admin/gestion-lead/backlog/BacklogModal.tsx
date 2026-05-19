import React, { useEffect, useRef, useState, useCallback } from "react";
import ExportBacklogBtn, { ExportTabDef } from "../../../../components/export/ExportBacklogBtn.tsx";
import Sortable from "sortablejs";

import Button from "../../../../components/button/Button.tsx";
import {
  FaPlus, FaSpinner, FaEdit, FaTrash, FaEye, FaArrowLeft,
  FaCalendar, FaChevronDown, FaChevronRight, FaRunning,
  FaUser, FaTimes, FaSearch, FaFilter, FaCheck,
} from "react-icons/fa";
import { Modal, Form, Alert, Tabs, Tab, Badge } from "react-bootstrap";

import "./BacklogModal.css";
import { BacklogService }                         from "../../../../services/lead/backlog/BacklogService.tsx";
import { BacklogProjetPhaseService }              from "../../../../services/projet/backlog/BacklogProjetPhaseService.tsx";
import { BacklogLotService }                      from "../../../../services/lead/backlog/BacklogLotService.tsx";
import { BacklogPhaseService }                    from "../../../../services/lead/backlog/BacklogPhaseService.tsx";
import { BacklogProfilService }                   from "../../../../services/lead/backlog/BacklogProfilService.tsx";
import { BacklogLineService }                     from "../../../../services/lead/backlog/BacklogLineService.tsx";
import { BacklogProjetLineProfilService }         from "../../../../services/lead/backlog/BacklogLineProfilService.tsx";
import { useLeadTechFinDetailsService }           from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { BacklogProfilCollaborateurService }      from "../../../../services/lead/backlog/BacklogProfilCollaborateurService.tsx";
import { useAuth }                                from "../../../../context/AuthContext.tsx";
import BacklogForm                                from "./BacklogForm.tsx";
import PlanningTab                                from "./PlanningTab.tsx";
import BudgetTab                                  from "./BudgetTab.tsx";
import ChargesAnnexesTab                          from "../../gestion-projet/tabs/ChargesAnnexesTab.tsx";
import { ChargesAnnexesService }                  from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";
import { BacklogPlanningService }                 from "../../../../services/lead/backlog/BacklogPlanningService.tsx";

import {
  Backlog, BacklogLot, BacklogPhase, BacklogSprint,
  BacklogProfil, BacklogLine, BacklogLineProfil,
  BacklogDeliverable, CreateBacklogRequest,
} from "../../../../types/lead/Backlog/Backlog.tsx";

// ─── Types collaborateur (adapté à l'API) ───────────────────────────────────
interface Collaborateur {
  id: number;
  nom: string;
  prenom: string;
  appellation?: string;
  profilPostes?: Array<{
    poste: { id: number; label: string };
    businessUnit: { id: number; name: string };
    endDate?: string | null;
  }>;
}

interface BacklogModalProps {
  show: boolean;
  onClose: () => void;
  leadId: number;
  leadName?: string;
}

// ─── Helpers pour afficher un collaborateur ──────────────────────────────────
const getCollaborateurPoste = (c: Collaborateur): string => {
  const active = c.profilPostes?.find(pp => !pp.endDate);
  return active?.poste?.label || "—";
};
const getCollaborateurBU = (c: Collaborateur): string => {
  const active = c.profilPostes?.find(pp => !pp.endDate);
  return active?.businessUnit?.name || "—";
};

const BacklogModal: React.FC<BacklogModalProps> = ({ show, onClose, leadId, leadName }) => {
  const { api } = useAuth();

  // ── Services ──────────────────────────────────────────────────────────────
  const backlogService              = new BacklogService(api);
  const backlogLotService           = new BacklogLotService(api);
  const backlogPhaseService         = new BacklogPhaseService(api);
  const backlogProfilService        = new BacklogProfilService(api);
  const backlogLineService          = new BacklogLineService(api);
  const backlogLineProfilService    = new BacklogProjetLineProfilService(api);
  const backlogPlanningService      = new BacklogPlanningService(api);
  const leadTechFinService          = useLeadTechFinDetailsService();
  const chargesAnnexesService       = new ChargesAnnexesService(api);
  const phaseService                = new BacklogProjetPhaseService(api);
  const collaborateurService        = new BacklogProfilCollaborateurService(api);

  // ── Liste des backlogs ────────────────────────────────────────────────────
  const [backlogs,          setBacklogs]          = useState<Backlog[]>([]);
  const [selectedBacklogId, setSelectedBacklogId] = useState<number | null>(null);
  const [loadingBacklogs,   setLoadingBacklogs]   = useState(true);

  // ── Données du backlog sélectionné ───────────────────────────────────────
  const [backlog,     setBacklog]     = useState<Backlog | null>(null);
  const [lots,        setLots]        = useState<BacklogLot[]>([]);
  const [profils,     setProfils]     = useState<BacklogProfil[]>([]);
  const [lines,       setLines]       = useState<BacklogLine[]>([]);
  const [lineProfils, setLineProfils] = useState<BacklogLineProfil[]>([]);

  const [sprintDeliverables, setSprintDeliverables] = useState<Map<number, BacklogDeliverable[]>>(new Map());
  const [planningOverrides,  setPlanningOverrides]  = useState<Map<string, { heures: number }>>(new Map());
  const [planningReady,      setPlanningReady]      = useState(false);

  // ── Collaborateurs (pour lier aux profils) ────────────────────────────────
  const [allCollaborateurs,       setAllCollaborateurs]       = useState<Collaborateur[]>([]);
  const [showCollabModal,         setShowCollabModal]         = useState(false);
  const [selectedBacklogProfilId, setSelectedBacklogProfilId] = useState<number | null>(null);
  const [collabSearch,            setCollabSearch]            = useState("");
  const [collabSearchType,        setCollabSearchType]        = useState<"name" | "poste">("name");
  const [savingCollab,            setSavingCollab]            = useState(false);

  // ── Modaux ────────────────────────────────────────────────────────────────
  const [showLotModal,         setShowLotModal]         = useState(false);
  const [showPhaseModal,       setShowPhaseModal]       = useState(false);
  const [showSprintModal,      setShowSprintModal]      = useState(false);
  const [showProfilModal,      setShowProfilModal]      = useState(false);
  const [showLineModal,        setShowLineModal]        = useState(false);
  const [showLineProfilModal,  setShowLineProfilModal]  = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showBacklogFormModal, setShowBacklogFormModal] = useState(false);

  // ── Entités en cours d'édition ────────────────────────────────────────────
  const [editingLot,         setEditingLot]         = useState<BacklogLot | null>(null);
  const [editingPhase,       setEditingPhase]       = useState<BacklogPhase | null>(null);
  const [editingSprint,      setEditingSprint]      = useState<BacklogSprint | null>(null);
  const [editingProfil,      setEditingProfil]      = useState<BacklogProfil | null>(null);
  const [editingLine,        setEditingLine]        = useState<BacklogLine | null>(null);
  const [editingLineProfil,  setEditingLineProfil]  = useState<BacklogLineProfil | null>(null);
  const [editingDeliverable, setEditingDeliverable] = useState<BacklogDeliverable | null>(null);

  // ── IDs courants ──────────────────────────────────────────────────────────
  const [currentLotId,    setCurrentLotId]    = useState<number | null>(null);
  const [currentPhaseId,  setCurrentPhaseId]  = useState<number | null>(null);
  const [currentSprintId, setCurrentSprintId] = useState<number | null>(null);
  const [currentLineId,   setCurrentLineId]   = useState<number | null>(null);
  const [currentProfilId, setCurrentProfilId] = useState<number | null>(null);

  // ── Formulaires ───────────────────────────────────────────────────────────
  const [newLot,         setNewLot]         = useState({ name: "", desc: "" });
  const [newPhase,       setNewPhase]       = useState({ name: "" });
  const [newSprint,      setNewSprint]      = useState({ name: "" });
  const [newProfil,      setNewProfil]      = useState({ name: "", desc: "", tjm: 0 });
  const [newLine,        setNewLine]        = useState({
    epic: "", userStory: "", description: "", resultat: "",
    lotId: null as number | null,
    phaseId: null as number | null,
    sprintId: null as number | null,
  });
  const [newLineProfil,  setNewLineProfil]  = useState({ volume: 0 });
  const [newDeliverable, setNewDeliverable] = useState({ name: "", description: "" });

  // ── Filtre backlog ────────────────────────────────────────────────────────
  const [filterLotId,    setFilterLotId]    = useState<number | null>(null);
  const [filterPhaseId,  setFilterPhaseId]  = useState<number | null>(null);
  const [filterSprintId, setFilterSprintId] = useState<number | null>(null);
  const [appliedFilter,  setAppliedFilter]  = useState<{
    lotId: number | null; phaseId: number | null; sprintId: number | null;
  }>({ lotId: null, phaseId: null, sprintId: null });
  const [showFilter,     setShowFilter]     = useState(false);
  const [linePage,       setLinePage]       = useState(1);
  const LINE_PAGE_SIZE = 20;

  // ── UI ────────────────────────────────────────────────────────────────────
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState<string | null>(null);
  const [saving,              setSaving]              = useState(false);
  const [activeTab,           setActiveTab]           = useState<string>("backlog");
  const [expandedPhases,      setExpandedPhases]      = useState<Set<number>>(new Set());
  const [expandedSprints,     setExpandedSprints]     = useState<Set<number>>(new Set());
  const [deviseAbr,           setDeviseAbr]           = useState<string | null>(null);
  const [budgetRH,            setBudgetRH]            = useState<number>(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const exportCaptureRef       = useRef<HTMLDivElement | null>(null);
  const listRef                = useRef<HTMLDivElement | null>(null);
  const profilListRef          = useRef<HTMLDivElement | null>(null);
  const sortableInstance       = useRef<Sortable | null>(null);
  const profilSortableInstance = useRef<Sortable | null>(null);
  const phaseSortableInstances = useRef<Map<number, Sortable>>(new Map());
  const lineTableBodyRef       = useRef<HTMLTableSectionElement | null>(null);
  const lineSortableInstance   = useRef<Sortable | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getAllPhases  = (): BacklogPhase[]  => lots.flatMap(lot => lot.phases || []);
  const getAllSprints = (): BacklogSprint[] => getAllPhases().flatMap(p => p.sprints || []);

  const getLotForSprint = (sprintId: number | null | undefined): BacklogLot | undefined => {
    if (!sprintId) return undefined;
    return lots.find(lot => (lot.phases || []).some(p => (p.sprints || []).some(s => s.id === sprintId)));
  };

  const getPhaseForSprint = (sprintId: number | null | undefined): BacklogPhase | undefined => {
    if (!sprintId) return undefined;
    return getAllPhases().find(p => (p.sprints || []).some(s => s.id === sprintId));
  };

  const getSprintById = (sprintId: number | null | undefined): BacklogSprint | undefined => {
    if (!sprintId) return undefined;
    return getAllSprints().find(s => s.id === sprintId);
  };

  const getSprintFullLabel = (sprintId: number | null | undefined): string => {
    if (!sprintId) return "—";
    const lot    = getLotForSprint(sprintId);
    const phase  = getPhaseForSprint(sprintId);
    const sprint = getSprintById(sprintId);
    if (!lot || !phase || !sprint) return "—";
    return `${lot.name} › ${phase.name} › ${sprint.name}`;
  };

  // Phases filtrées selon le lot sélectionné dans le formulaire de ligne
  const phasesForSelectedLot = newLine.lotId
    ? (lots.find(l => l.id === newLine.lotId)?.phases || [])
    : [];

  // Sprints filtrés selon la phase sélectionnée dans le formulaire de ligne
  const sprintsForSelectedPhase = newLine.phaseId
    ? (phasesForSelectedLot.find(p => p.id === newLine.phaseId)?.sprints || [])
    : [];

  // Phases disponibles pour le filtre
  const phasesForFilter = filterLotId
    ? (lots.find(l => l.id === filterLotId)?.phases || [])
    : getAllPhases();

  const sprintsForFilter = filterPhaseId
    ? (phasesForFilter.find(p => p.id === filterPhaseId)?.sprints || [])
    : phasesForFilter.flatMap(p => p.sprints || []);

  // Lignes filtrées selon les filtres appliqués
  const filteredLines = lines.filter(line => {
    const { lotId, phaseId, sprintId } = appliedFilter;
    if (sprintId) return line.sprintId === sprintId;
    if (phaseId) {
      const phase = getPhaseForSprint(line.sprintId);
      return phase?.id === phaseId;
    }
    if (lotId) {
      const lot = getLotForSprint(line.sprintId);
      return lot?.id === lotId;
    }
    return true;
  });

  const isFilterActive = appliedFilter.lotId !== null || appliedFilter.phaseId !== null || appliedFilter.sprintId !== null;

  // ─── Collaborateur pour un BacklogProfil ────────────────────────────────
  const getCollaborateurForProfil = (profilId: number): Collaborateur | undefined => {
    const bp = profils.find(p => p.id === profilId);
    const collabs = (bp as any)?.collaborateurs as Collaborateur[] | undefined;
    return collabs?.[0];
  };

  // ─── Recherche de collaborateurs ─────────────────────────────────────────
  const filteredCollaborateurs = allCollaborateurs.filter(c => {
    if (!collabSearch.trim()) return true;
    const q = collabSearch.toLowerCase().trim();
    if (collabSearchType === "name") {
      return `${c.nom} ${c.prenom}`.toLowerCase().includes(q) ||
             `${c.prenom} ${c.nom}`.toLowerCase().includes(q);
    } else {
      const poste = getCollaborateurPoste(c).toLowerCase();
      const bu    = getCollaborateurBU(c).toLowerCase();
      return poste.includes(q) || bu.includes(q);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH COLLABORATEURS
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchCollaborateurs = async () => {
    try {
      const res = await api.get("/profils/all");
      setAllCollaborateurs(res.data || []);
    } catch (err) {
      console.error("Erreur chargement collaborateurs:", err);
    }
  };

  useEffect(() => {
    if (show) fetchCollaborateurs();
  }, [show]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AFFECTER UN COLLABORATEUR À UN BACKLOG PROFIL
  // ═══════════════════════════════════════════════════════════════════════════

  const openCollabModal = (backlogProfilId: number) => {
    setSelectedBacklogProfilId(backlogProfilId);
    setCollabSearch("");
    setCollabSearchType("name");
    setShowCollabModal(true);
  };

  const handleSelectCollaborateur = async (collaborateur: Collaborateur) => {
    if (!selectedBacklogProfilId) return;
    setSavingCollab(true);
    try {
      await collaborateurService.replaceCollaborateur(selectedBacklogProfilId, collaborateur.id);
      // Mettre à jour localement le collaborateur dans la liste des profils
      setProfils(prev => prev.map(p => {
        if (p.id !== selectedBacklogProfilId) return p;
        return { ...p, collaborateurs: [collaborateur] } as any;
      }));
      setShowCollabModal(false);
      setSelectedBacklogProfilId(null);
    } catch (err) {
      console.error("Erreur affectation collaborateur:", err);
      alert("Impossible d'affecter le collaborateur.");
    } finally {
      setSavingCollab(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CRÉATION BACKLOG
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCreateBacklog = async (item: CreateBacklogRequest) => {
    if (!leadId) return;
    try {
      const created = await backlogService.createBacklog({
        name: item.name, desc: item.desc, leadId: item.leadId, projetId: null, type: item.type,
      });
      setBacklogs(prev => [...prev, created]);
      setSelectedBacklogId(created.id);
      setShowBacklogFormModal(false);
    } catch (err) {
      console.error("Erreur création backlog:", err);
      alert("Impossible de créer le backlog.");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH LISTE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (show && leadId) fetchBacklogsList();
  }, [show, leadId]);

  const fetchBacklogsList = async () => {
    try {
      setLoadingBacklogs(true);
      setError(null);
      const fetched  = await backlogService.getByLeadId(leadId);
      const filtered = fetched.filter(b => b.type !== 1 && !b.projetId);
      setBacklogs(filtered);
      if (filtered.length === 1) setSelectedBacklogId(filtered[0].id);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les backlogs. Veuillez réessayer.");
    } finally {
      setLoadingBacklogs(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH BACKLOG COMPLET
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (selectedBacklogId) fetchBacklog();
  }, [selectedBacklogId]);

  useEffect(() => {
    const fetchDevise = async () => {
      try {
        if (!leadId) return;
        const techFin = await leadTechFinService.getByLeadId(leadId);
        setDeviseAbr(techFin?.devise?.abrDevise || null);
      } catch (err) {
        console.error(err);
        setDeviseAbr(null);
      }
    };
    fetchDevise();
  }, [leadId]);

  const fetchBacklog = async () => {
    if (!selectedBacklogId) return;
    setPlanningReady(false);
    try {
      setLoading(true);
      setError(null);
      const fetchedBacklog = await backlogService.getCompleteById(selectedBacklogId);
      setBacklog(fetchedBacklog);
      const sortedLots    = [...(fetchedBacklog.lots    || [])].sort((a, b) => a.order - b.order);
      const sortedProfils = [...(fetchedBacklog.profils || [])].sort((a, b) => a.order - b.order);
      const sortedLines   = [...(fetchedBacklog.lines   || [])].sort((a, b) => a.order - b.order);
      setLots(sortedLots);
      setProfils(sortedProfils);
      setLines(sortedLines);
      const allLineProfils: BacklogLineProfil[] = [];
      sortedLines.forEach(line => {
        if (line.profils?.length) {
          line.profils.forEach(lp => { allLineProfils.push({ ...lp, lineId: line.id }); });
        }
      });
      setLineProfils(allLineProfils);
      const delivMap = new Map<number, BacklogDeliverable[]>();
      const allPhases = sortedLots.flatMap(lot => lot.phases || []);
      for (const phase of allPhases) {
        for (const sprint of phase.sprints || []) {
          const sorted = [...(sprint.deliverables || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          delivMap.set(sprint.id, sorted);
        }
      }
      setSprintDeliverables(delivMap);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger le backlog. Veuillez réessayer.");
    }
    try {
      const hasChanges = await backlogPlanningService.hasPlanning(selectedBacklogId);
      if (hasChanges) {
        const planningEntries = await backlogPlanningService.getByBacklogId(selectedBacklogId);
        const map = new Map<string, { heures: number }>();
        planningEntries.forEach(e => {
          if (isFinite(e.heures) && e.heures > 0) map.set(`phase-${e.phaseId}`, { heures: e.heures });
        });
        setPlanningOverrides(map);
      } else {
        setPlanningOverrides(new Map());
      }
    } catch {
      setPlanningOverrides(new Map());
    } finally {
      setLoading(false);
      setPlanningReady(true);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RETOUR À LA LISTE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleBackToList = () => {
    setSelectedBacklogId(null);
    setBacklog(null);
    setLots([]);
    setProfils([]);
    setLines([]);
    setLineProfils([]);
    setSprintDeliverables(new Map());
    setPlanningOverrides(new Map());
    setPlanningReady(false);
    setAppliedFilter({ lotId: null, phaseId: null, sprintId: null });
    setFilterLotId(null);
    setFilterPhaseId(null);
    setFilterSprintId(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SORTABLE — LINES
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (lineSortableInstance.current) { lineSortableInstance.current.destroy(); lineSortableInstance.current = null; }
    if (!lineTableBodyRef.current || lines.length === 0 || !show || !selectedBacklogId) return;
    lineSortableInstance.current = Sortable.create(lineTableBodyRef.current, {
      animation: 150, handle: ".line-drag-handle",
      ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
      filter: ".sortable-empty-row",
      onEnd: async (evt: { oldIndex: number | undefined; newIndex: number | undefined; }) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined || evt.oldIndex === evt.newIndex) return;
        const newLines = [...lines];
        const [moved] = newLines.splice(evt.oldIndex, 1);
        newLines.splice(evt.newIndex, 0, moved);
        const reordered = newLines.map((l, i) => ({ ...l, order: i + 1 }));
        setLines(reordered);
        try { await backlogLineService.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); }
        catch (err) { console.error(err); fetchBacklog(); }
      },
    });
    return () => { lineSortableInstance.current?.destroy(); lineSortableInstance.current = null; };
  }, [lines, loading, show, selectedBacklogId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SORTABLE — LOTS / PROFILS / PHASES
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!listRef.current || sortableInstance.current || lots.length === 0 || !show || !selectedBacklogId) return;
    sortableInstance.current = Sortable.create(listRef.current, {
      animation: 150, handle: ".drag-handle",
      ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
      onEnd: async (evt: { oldIndex: number | undefined; newIndex: number | undefined; }) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        const newLots = [...lots];
        const [moved] = newLots.splice(evt.oldIndex, 1);
        newLots.splice(evt.newIndex, 0, moved);
        const reordered = newLots.map((l, i) => ({ ...l, order: i + 1 }));
        setLots(reordered);
        try { await backlogLotService.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); }
        catch (err) { console.error(err); fetchBacklog(); }
      },
    });
    return () => { sortableInstance.current?.destroy(); sortableInstance.current = null; };
  }, [lots, loading, show, selectedBacklogId]);

  useEffect(() => {
    if (!profilListRef.current || profilSortableInstance.current || profils.length === 0 || !show || !selectedBacklogId) return;
    profilSortableInstance.current = Sortable.create(profilListRef.current, {
      animation: 150, handle: ".drag-handle-profil",
      ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
      onEnd: async (evt: { oldIndex: number | undefined; newIndex: number | undefined; }) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        const newProfils = [...profils];
        const [moved] = newProfils.splice(evt.oldIndex, 1);
        newProfils.splice(evt.newIndex, 0, moved);
        const reordered = newProfils.map((p, i) => ({ ...p, order: i + 1 }));
        setProfils(reordered);
        try { await backlogProfilService.updateOrder(reordered.map(p => ({ id: p.id, order: p.order }))); }
        catch (err) { console.error(err); fetchBacklog(); }
      },
    });
    return () => { profilSortableInstance.current?.destroy(); profilSortableInstance.current = null; };
  }, [profils, loading, show, selectedBacklogId]);

  useEffect(() => {
    if (!show || !selectedBacklogId) return;
    phaseSortableInstances.current.forEach(i => i.destroy());
    phaseSortableInstances.current.clear();
    lots.forEach(lot => {
      if (!lot.phases?.length) return;
      const el = document.querySelector(`[data-lot-id="${lot.id}"] .phases-list-sortable`) as HTMLElement;
      if (!el) return;
      const sortable = Sortable.create(el, {
        animation: 150, handle: ".phase-drag-handle",
        ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
        onEnd: async (evt: { oldIndex: number | undefined; newIndex: number | undefined; }) => {
          if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
          const lotToUpdate = lots.find(l => l.id === lot.id);
          if (!lotToUpdate?.phases) return;
          const newPhases = [...lotToUpdate.phases];
          const [moved] = newPhases.splice(evt.oldIndex, 1);
          newPhases.splice(evt.newIndex, 0, moved);
          const reordered = newPhases.map((p, i) => ({ ...p, order: i + 1 }));
          setLots(lots.map(l => l.id === lot.id ? { ...l, phases: reordered } : l));
          try { await backlogPhaseService.updateOrder(reordered.map(p => ({ id: p.id, order: p.order }))); }
          catch (err) { console.error(err); fetchBacklog(); }
        },
      });
      phaseSortableInstances.current.set(lot.id, sortable);
    });
    return () => { phaseSortableInstances.current.forEach(i => i.destroy()); phaseSortableInstances.current.clear(); };
  }, [lots, show, selectedBacklogId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openAddLot  = () => { setEditingLot(null); setNewLot({ name: "", desc: "" }); setShowLotModal(true); };
  const openEditLot = (lot: BacklogLot) => { setEditingLot(lot); setNewLot({ name: lot.name, desc: lot.desc || "" }); setShowLotModal(true); };

  const saveLot = async () => {
    if (!newLot.name.trim()) { alert("Le nom du lot est requis"); return; }
    if (!selectedBacklogId) return;
    setSaving(true);
    try {
      if (editingLot) {
        const updated = await backlogLotService.update(editingLot.id, { name: newLot.name, desc: newLot.desc });
        setLots(lots.map(l => l.id === editingLot.id ? updated : l));
      } else {
        const nextOrder = Math.max(...lots.map(l => l.order), 0) + 1;
        const created   = await backlogLotService.create({ name: newLot.name, desc: newLot.desc, order: nextOrder, backlogId: selectedBacklogId });
        setLots([...lots, created]);
      }
      setShowLotModal(false); setEditingLot(null); setNewLot({ name: "", desc: "" });
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  const deleteLot = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce lot ?")) return;
    try {
      await backlogLotService.delete(id);
      const updated = lots.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
      setLots(updated);
      await backlogLotService.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
    } catch (err) { console.error(err); alert("Impossible de supprimer le lot."); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openAddPhase  = (lotId: number) => { setCurrentLotId(lotId); setEditingPhase(null); setNewPhase({ name: "" }); setShowPhaseModal(true); };
  const openEditPhase = (phase: BacklogPhase, lotId: number) => { setCurrentLotId(lotId); setEditingPhase(phase); setNewPhase({ name: phase.name }); setShowPhaseModal(true); };

  const savePhase = async () => {
    if (!newPhase.name.trim()) { alert("Le nom de la phase est requis"); return; }
    if (currentLotId === null) return;
    setSaving(true);
    try {
      if (editingPhase) {
        const updated = await backlogPhaseService.update(editingPhase.id, { name: newPhase.name });
        setLots(lots.map(lot => lot.id === currentLotId
          ? { ...lot, phases: lot.phases?.map(p => p.id === editingPhase.id ? { ...p, ...updated } : p) }
          : lot));
      } else {
        const currentLot = lots.find(l => l.id === currentLotId);
        const nextOrder  = Math.max(...(currentLot?.phases?.map(p => p.order) || [0]), 0) + 1;
        const created    = await backlogPhaseService.create({ name: newPhase.name, order: nextOrder, lotId: currentLotId });
        setLots(lots.map(lot => lot.id === currentLotId
          ? { ...lot, phases: [...(lot.phases || []), { ...created, sprints: [] }] }
          : lot));
      }
      setShowPhaseModal(false); setEditingPhase(null); setNewPhase({ name: "" }); setCurrentLotId(null);
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  const deletePhase = async (phaseId: number, lotId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette phase ?")) return;
    try {
      await backlogPhaseService.delete(phaseId);
      setLots(lots.map(lot => {
        if (lot.id !== lotId) return lot;
        const updatedPhases = lot.phases?.filter(p => p.id !== phaseId).map((p, i) => ({ ...p, order: i + 1 }));
        return { ...lot, phases: updatedPhases };
      }));
      const currentLot = lots.find(l => l.id === lotId);
      if (currentLot?.phases) {
        await backlogPhaseService.updateOrder(
          currentLot.phases.filter(p => p.id !== phaseId).map((p, i) => ({ id: p.id, order: i + 1 }))
        );
      }
    } catch (err) { console.error(err); alert("Impossible de supprimer la phase."); }
  };

  const togglePhase = (phaseId: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SPRINT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openAddSprint  = (phaseId: number) => { setCurrentPhaseId(phaseId); setEditingSprint(null); setNewSprint({ name: "" }); setShowSprintModal(true); };
  const openEditSprint = (sprint: BacklogSprint) => { setCurrentPhaseId(sprint.phaseId); setEditingSprint(sprint); setNewSprint({ name: sprint.name }); setShowSprintModal(true); };

  const saveSprint = async () => {
    if (!newSprint.name.trim()) { alert("Le nom du sprint est requis"); return; }
    if (currentPhaseId === null) return;
    setSaving(true);
    try {
      if (editingSprint) {
        const updated = await phaseService.updateSprint(editingSprint.id, { name: newSprint.name, order: editingSprint.order });
        setLots(lots.map(lot => ({
          ...lot,
          phases: lot.phases?.map(phase => phase.id === currentPhaseId
            ? { ...phase, sprints: phase.sprints?.map(s => s.id === editingSprint.id ? { ...s, ...updated, deliverables: s.deliverables } : s) }
            : phase),
        })));
      } else {
        const currentPhase = getAllPhases().find(p => p.id === currentPhaseId);
        const nextOrder    = Math.max(...(currentPhase?.sprints?.map(s => s.order) || [0]), 0) + 1;
        const created      = await phaseService.createSprint({ name: newSprint.name, order: nextOrder, phaseId: currentPhaseId });
        setLots(lots.map(lot => ({
          ...lot,
          phases: lot.phases?.map(phase => phase.id === currentPhaseId
            ? { ...phase, sprints: [...(phase.sprints || []), { ...created, deliverables: [] }] }
            : phase),
        })));
        setSprintDeliverables(prev => new Map(prev).set(created.id, []));
      }
      setShowSprintModal(false); setEditingSprint(null); setNewSprint({ name: "" }); setCurrentPhaseId(null);
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde du sprint."); }
    finally { setSaving(false); }
  };

  const deleteSprint = async (sprintId: number, phaseId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce sprint ?")) return;
    try {
      await phaseService.deleteSprint(sprintId);
      setLots(lots.map(lot => ({
        ...lot,
        phases: lot.phases?.map(phase => phase.id === phaseId
          ? { ...phase, sprints: phase.sprints?.filter(s => s.id !== sprintId).map((s, i) => ({ ...s, order: i + 1 })) }
          : phase),
      })));
      setSprintDeliverables(prev => { const next = new Map(prev); next.delete(sprintId); return next; });
      setExpandedSprints(prev => { const next = new Set(prev); next.delete(sprintId); return next; });
    } catch (err) { console.error(err); alert("Impossible de supprimer le sprint."); }
  };

  const toggleSprint = (sprintId: number) => {
    setExpandedSprints(prev => {
      const next = new Set(prev);
      next.has(sprintId) ? next.delete(sprintId) : next.add(sprintId);
      return next;
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // DELIVERABLE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openAddDeliverable = (sprintId: number, phaseId: number) => {
    setCurrentSprintId(sprintId); setCurrentPhaseId(phaseId);
    setEditingDeliverable(null); setNewDeliverable({ name: "", description: "" });
    setShowDeliverableModal(true);
  };

  const openEditDeliverable = (d: BacklogDeliverable, sprintId: number, phaseId: number) => {
    setCurrentSprintId(sprintId); setCurrentPhaseId(phaseId);
    setEditingDeliverable(d); setNewDeliverable({ name: d.name, description: d.description });
    setShowDeliverableModal(true);
  };

  const saveDeliverable = async () => {
    if (!newDeliverable.name.trim()) { alert("Le nom du livrable est requis"); return; }
    if (currentSprintId === null || currentPhaseId === null) return;
    setSaving(true);
    try {
      if (editingDeliverable) {
        const updated = await phaseService.updateDeliverable(editingDeliverable.id, { name: newDeliverable.name, description: newDeliverable.description });
        setSprintDeliverables(prev => {
          const next = new Map(prev);
          const updatedList = (next.get(currentSprintId) || []).map(d =>
            d.id === editingDeliverable.id ? { ...updated, description: updated.description ?? "", phaseId: updated.phaseId ?? 0, sprintId: updated.sprintId ?? 0, deliveryDate: updated.deliveryDate ?? null } as BacklogDeliverable : d
          );
          next.set(currentSprintId, updatedList);
          return next;
        });
      } else {
        const existing = sprintDeliverables.get(currentSprintId) || [];
        const created  = await phaseService.createDeliverable({ name: newDeliverable.name, description: newDeliverable.description, phaseId: currentPhaseId, sprintId: currentSprintId, order: existing.length + 1 });
        setSprintDeliverables(prev => {
          const next = new Map(prev);
          const newDeliv: BacklogDeliverable = { ...created, description: created.description ?? "", phaseId: created.phaseId ?? 0, sprintId: created.sprintId ?? 0 };
          next.set(currentSprintId, [...(next.get(currentSprintId) || []), newDeliv]);
          return next;
        });
      }
      setShowDeliverableModal(false); setEditingDeliverable(null); setNewDeliverable({ name: "", description: "" });
      setCurrentSprintId(null); setCurrentPhaseId(null);
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde du livrable."); }
    finally { setSaving(false); }
  };

  const deleteDeliverable = async (deliverableId: number, sprintId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce livrable ?")) return;
    try {
      await phaseService.deleteDeliverable(deliverableId);
      setSprintDeliverables(prev => {
        const next    = new Map(prev);
        const updated = (next.get(sprintId) || []).filter(d => d.id !== deliverableId).map((d, i) => ({ ...d, order: i + 1 }));
        next.set(sprintId, updated);
        return next;
      });
    } catch (err) { console.error(err); alert("Impossible de supprimer le livrable."); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFIL ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openAddProfil  = () => { setEditingProfil(null); setNewProfil({ name: "", desc: "", tjm: 0 }); setShowProfilModal(true); };
  const openEditProfil = (profil: BacklogProfil) => { setEditingProfil(profil); setNewProfil({ name: profil.name, desc: profil.desc || "", tjm: profil.tjm }); setShowProfilModal(true); };

  const saveProfil = async () => {
    if (!newProfil.name.trim()) { alert("Le nom du profil est requis"); return; }
    if (newProfil.tjm < 0)     { alert("Le TJM doit être positif"); return; }
    if (!selectedBacklogId)    return;
    setSaving(true);
    try {
      if (editingProfil) {
        const updated = await backlogProfilService.update(editingProfil.id, { name: newProfil.name, desc: newProfil.desc, tjm: newProfil.tjm });
        setProfils(profils.map(p => p.id === editingProfil.id ? updated : p));
      } else {
        const nextOrder = Math.max(...profils.map(p => p.order), 0) + 1;
        const created   = await backlogProfilService.create({ name: newProfil.name, desc: newProfil.desc, tjm: newProfil.tjm, order: nextOrder, backlogId: selectedBacklogId });
        setProfils([...profils, created]);
      }
      setShowProfilModal(false); setEditingProfil(null); setNewProfil({ name: "", desc: "", tjm: 0 });
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  const deleteProfil = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce profil ?")) return;
    try {
      await backlogProfilService.delete(id);
      const updated = profils.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
      setProfils(updated);
      await backlogProfilService.updateOrder(updated.map(p => ({ id: p.id, order: p.order })));
    } catch (err) { console.error(err); alert("Impossible de supprimer le profil."); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LINE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const openAddLine = () => {
    setEditingLine(null);
    setNewLine({ epic: "", userStory: "", description: "", resultat: "", lotId: null, phaseId: null, sprintId: null });
    setShowLineModal(true);
  };

  const openEditLine = (line: BacklogLine) => {
    setEditingLine(line);
    const sprintId = line.sprintId ?? null;
    const lot      = getLotForSprint(sprintId);
    const phase    = getPhaseForSprint(sprintId);
    setNewLine({
      epic: line.epic || "", userStory: line.userStory || "",
      description: line.description || "", resultat: line.resultat || "",
      lotId: lot?.id ?? null, phaseId: phase?.id ?? null, sprintId,
    });
    setShowLineModal(true);
  };

  const saveLine = async () => {
    if (!newLine.sprintId) { alert("Le sprint est requis"); return; }
    const sprint = getAllSprints().find(s => s.id === newLine.sprintId);
    if (!sprint) { alert("Sprint introuvable"); return; }
    setSaving(true);
    try {
      if (editingLine) {
        const updated = await backlogLineService.update(editingLine.id, {
          epic: newLine.epic, userStory: newLine.userStory, description: newLine.description,
          resultat: newLine.resultat, phaseId: sprint.phaseId, sprintId: newLine.sprintId, order: editingLine.order,
        });
        setLines(lines.map(l => l.id === editingLine.id ? updated : l));
      } else {
        const nextOrder = Math.max(...lines.map(l => l.order), 0) + 1;
        const created   = await backlogLineService.create({
          epic: newLine.epic, userStory: newLine.userStory, description: newLine.description,
          resultat: newLine.resultat, order: nextOrder, phaseId: sprint.phaseId, sprintId: newLine.sprintId,
        });
        setLines([...lines, created]);
      }
      setShowLineModal(false); setEditingLine(null);
      setNewLine({ epic: "", userStory: "", description: "", resultat: "", lotId: null, phaseId: null, sprintId: null });
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  const deleteLine = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) return;
    try {
      await backlogLineService.delete(id);
      const updated = lines.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
      setLines(updated);
      setLineProfils(prev => prev.filter(lp => lp.lineId !== id));
      await backlogLineService.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
    } catch (err) { console.error(err); alert("Impossible de supprimer la ligne."); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LINE PROFIL ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const getLineProfilVolume = (lineId: number, profilId: number): number =>
    lineProfils.find(lp => lp.lineId === lineId && lp.profil.id === profilId)?.volume || 0;

  const openLineProfilModal = (lineId: number, profilId: number) => {
    setCurrentLineId(lineId); setCurrentProfilId(profilId);
    const existing = lineProfils.find(lp => lp.lineId === lineId && lp.profil.id === profilId);
    if (existing) { setEditingLineProfil(existing); setNewLineProfil({ volume: existing.volume }); }
    else          { setEditingLineProfil(null);     setNewLineProfil({ volume: 0 }); }
    setShowLineProfilModal(true);
  };

  const saveLineProfil = async () => {
    if (currentLineId === null || currentProfilId === null) return;
    setSaving(true);
    try {
      if (editingLineProfil) {
        const updated = await backlogLineProfilService.update(editingLineProfil.id, { volume: newLineProfil.volume, lineId: currentLineId, profilId: currentProfilId });
        setLineProfils(lineProfils.map(lp => lp.id === editingLineProfil.id ? updated : lp));
      } else {
        const created = await backlogLineProfilService.create({ volume: newLineProfil.volume, lineId: currentLineId, profilId: currentProfilId });
        setLineProfils([...lineProfils, created]);
      }
      setShowLineProfilModal(false); setEditingLineProfil(null); setNewLineProfil({ volume: 0 }); setCurrentLineId(null); setCurrentProfilId(null);
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  const deleteLineProfil = async () => {
    if (!editingLineProfil) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce volume ?")) return;
    try {
      await backlogLineProfilService.delete(editingLineProfil.id);
      setLineProfils(lineProfils.filter(lp => lp.id !== editingLineProfil.id));
      setShowLineProfilModal(false); setEditingLineProfil(null); setNewLineProfil({ volume: 0 }); setCurrentLineId(null); setCurrentProfilId(null);
    } catch (err) { console.error(err); alert("Impossible de supprimer le volume."); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULS TOTAUX
  // ═══════════════════════════════════════════════════════════════════════════

  const getProfilTotals = () => profils.map(profil => {
    const totalVolume = lineProfils.filter(lp => lp.profil.id === profil.id).reduce((s, lp) => s + lp.volume, 0);
    return { profil, totalVolume, totalAmount: totalVolume * profil.tjm };
  });

  const getLotTotals = () => lots.map(lot => {
    const phaseTotals = (lot.phases || []).map(phase => {
      const phaseLineIds = lines.filter(l => {
        const sprint = getAllSprints().find(s => s.id === l.sprintId);
        return sprint?.phaseId === phase.id;
      }).map(l => l.id);
      const phaseLP      = lineProfils.filter(lp => phaseLineIds.includes(lp.lineId));
      const totalVolume  = phaseLP.reduce((s, lp) => s + lp.volume, 0);
      const totalAmount  = phaseLP.reduce((s, lp) => s + lp.volume * (profils.find(p => p.id === lp.profil.id)?.tjm || 0), 0);
      return { phase, totalVolume, totalAmount };
    });
    return { lot, phaseTotals, lotTotalVolume: phaseTotals.reduce((s, pt) => s + pt.totalVolume, 0), lotTotalAmount: phaseTotals.reduce((s, pt) => s + pt.totalAmount, 0) };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTRE
  // ═══════════════════════════════════════════════════════════════════════════

  const applyFilter = () => {
    setAppliedFilter({ lotId: filterLotId, phaseId: filterPhaseId, sprintId: filterSprintId });
    setLinePage(1);
    setShowFilter(false);
  };

  const clearFilter = () => {
    setFilterLotId(null); setFilterPhaseId(null); setFilterSprintId(null);
    setAppliedFilter({ lotId: null, phaseId: null, sprintId: null });
    setLinePage(1);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const EXPORT_TABS_LEAD: ExportTabDef[] = [
    { key: 'backlog',         label: 'Backlog'         },
    { key: 'lots',            label: 'Lots et Phases'  },
    { key: 'profils',         label: 'Profils'         },
    { key: 'planning',        label: 'Planning'        },
    { key: 'budget',          label: 'Budget'          },
    { key: 'charges_annexes', label: 'Charges Annexes' },
  ];

  if (loadingBacklogs) {
    return (
      <Modal show={show} onHide={onClose} size="xl" fullscreen>
        <Modal.Header closeButton><Modal.Title>Backlogs - {leadName || 'Chargement...'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
            <FaSpinner className="fa-spin me-2" /><span>Chargement des backlogs...</span>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  const profilTotals = getProfilTotals();
  const lotTotals    = getLotTotals();

  return (
    <>
      <Modal show={show} onHide={onClose} size="xl" fullscreen>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2 flex-wrap">
            {selectedBacklogId && (
              <Button label="" icon={<FaArrowLeft />} variant="outline" onClick={handleBackToList} className="me-2" />
            )}
            Backlogs - {leadName}
          </Modal.Title>
          {selectedBacklogId && (
            <div className="ms-auto me-3">
              <ExportBacklogBtn
                tabs={EXPORT_TABS_LEAD}
                activeTab={activeTab}
                onSwitchTab={k => setActiveTab(k)}
                captureRef={exportCaptureRef}
                fileName={`recap-dao-${leadName ?? 'lead'}`}
                contextName={leadName ?? undefined}
              />
            </div>
          )}
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#f8f9fa' }}>
          <div ref={exportCaptureRef} className="container-fluid">
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || "backlog")} className="mb-4">

              {/* ──────────────────── TAB BACKLOG ──────────────────── */}
              <Tab eventKey="backlog" title="Backlog">
                {!selectedBacklogId ? (
                  <div>
                    {backlogs.length === 0 && (
                      <>
                        <BacklogForm show={showBacklogFormModal} onClose={() => setShowBacklogFormModal(false)} onSubmit={handleCreateBacklog} leadId={leadId} />
                        <Button label="Créer un backlog" icon={<FaPlus />} onClick={() => setShowBacklogFormModal(true)} variant="primary" className="mb-3" />
                        <div className="text-center text-muted py-5">
                          <p>Aucun backlog trouvé pour ce lead.</p>
                          <p className="small">Cliquez sur "Créer un backlog" pour commencer.</p>
                        </div>
                      </>
                    )}
                    {backlogs.length > 0 && (
                      <div className="row">
                        {backlogs.map(b => (
                          <div key={b.id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setSelectedBacklogId(b.id)}>
                              <div className="card-body">
                                <h5 className="card-title">{b.name}</h5>
                                {b.desc && <p className="card-text text-muted small">{b.desc}</p>}
                                <div className="d-flex justify-content-end mt-3">
                                  <small className="text-primary"><FaEye className="me-1" /> Cliquez pour voir les détails</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                    <FaSpinner className="fa-spin me-2" /><span>Chargement du backlog...</span>
                  </div>
                ) : (
                  <>
                    {/* ── Totaux par profil ── */}
                    <div className="card mb-4">
                      <div className="card-header"><h5 className="mb-0">Totaux par profil</h5></div>
                      <div className="card-body">
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered">
                            <thead>
                              <tr><th>Profil</th><th className="text-end">Volume total (JH)</th><th className="text-end">TJM</th><th className="text-end">Montant total</th></tr>
                            </thead>
                            <tbody>
                              {profilTotals.map(({ profil, totalVolume, totalAmount }) => (
                                <tr key={profil.id}>
                                  <td><strong>{profil.name}</strong></td>
                                  <td className="text-end">{totalVolume.toFixed(2)}</td>
                                  <td className="text-end">{profil.tjm.toFixed(2)}</td>
                                  <td className="text-end"><strong>{totalAmount.toFixed(2)} {deviseAbr || ''}</strong></td>
                                </tr>
                              ))}
                              <tr className="table-active">
                                <td><strong>TOTAL GÉNÉRAL</strong></td>
                                <td className="text-end"><strong>{profilTotals.reduce((s, pt) => s + pt.totalVolume, 0).toFixed(2)}</strong></td>
                                <td></td>
                                <td className="text-end"><strong>{profilTotals.reduce((s, pt) => s + pt.totalAmount, 0).toFixed(2)} {deviseAbr || ''}</strong></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* ── Totaux par lot et phase ── */}
                    <div className="card mb-4">
                      <div className="card-header"><h5 className="mb-0">Totaux par lot et phase</h5></div>
                      <div className="card-body">
                        {lotTotals.map(({ lot, phaseTotals, lotTotalVolume, lotTotalAmount }) => (
                          <div key={lot.id} className="mb-4">
                            <h6 className="text-primary">{lot.name} — Volume : {lotTotalVolume.toFixed(2)} JH — Montant : {lotTotalAmount.toFixed(2)} {deviseAbr || ''}</h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered">
                                <thead><tr><th>Phase</th><th className="text-end">Volume (JH)</th><th className="text-end">Montant {deviseAbr}</th></tr></thead>
                                <tbody>
                                  {phaseTotals.map(({ phase, totalVolume, totalAmount }) => (
                                    <tr key={phase.id}><td>{phase.name}</td><td className="text-end">{totalVolume.toFixed(2)}</td><td className="text-end">{totalAmount.toFixed(2)}</td></tr>
                                  ))}
                                  {phaseTotals.length > 0 && (
                                    <tr className="table-secondary">
                                      <td><strong>TOTAL {lot.name}</strong></td>
                                      <td className="text-end"><strong>{lotTotalVolume.toFixed(2)}</strong></td>
                                      <td className="text-end"><strong>{lotTotalAmount.toFixed(2)}</strong></td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Barre d'actions + Filtre ── */}
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <button
                          className={`btn btn-sm ${isFilterActive ? 'btn-warning' : 'btn-outline-secondary'} d-flex align-items-center gap-1`}
                          onClick={() => setShowFilter(!showFilter)}
                        >
                          <FaFilter />
                          Filtres
                          {isFilterActive && <span className="badge bg-dark ms-1">{[appliedFilter.lotId, appliedFilter.phaseId, appliedFilter.sprintId].filter(Boolean).length}</span>}
                        </button>
                        {isFilterActive && (
                          <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={clearFilter}>
                            <FaTimes /> Effacer
                          </button>
                        )}
                        {isFilterActive && (
                          <span className="text-muted small">
                            {filteredLines.length} / {lines.length} ligne{lines.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <Button label="Ajouter une ligne" icon={<FaPlus />} onClick={openAddLine} />
                    </div>

                    {/* ── Panneau de filtres ── */}
                    {showFilter && (
                      <div className="filter-panel mb-3 p-3 border rounded" style={{ background: '#fff', borderColor: '#e5e7eb', boxShadow: '0 2px 8px rgba(34,58,70,0.07)' }}>
                        <div className="row g-2 align-items-end">
                          <div className="col-md-3">
                            <label className="form-label fw-semibold small text-uppercase" style={{ color: 'var(--charcoal-blue)', letterSpacing: '0.5px' }}>Lot</label>
                            <Form.Select size="sm" value={filterLotId ?? ""} onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value) : null;
                              setFilterLotId(val);
                              setFilterPhaseId(null);
                              setFilterSprintId(null);
                            }}>
                              <option value="">Tous les lots</option>
                              {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </Form.Select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold small text-uppercase" style={{ color: 'var(--charcoal-blue)', letterSpacing: '0.5px' }}>Phase</label>
                            <Form.Select size="sm" value={filterPhaseId ?? ""} onChange={e => {
                              const val = e.target.value ? parseInt(e.target.value) : null;
                              setFilterPhaseId(val);
                              setFilterSprintId(null);
                            }} disabled={!filterLotId && phasesForFilter.length === 0}>
                              <option value="">Toutes les phases</option>
                              {phasesForFilter.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Form.Select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label fw-semibold small text-uppercase" style={{ color: 'var(--charcoal-blue)', letterSpacing: '0.5px' }}>Sprint</label>
                            <Form.Select size="sm" value={filterSprintId ?? ""} onChange={e => {
                              setFilterSprintId(e.target.value ? parseInt(e.target.value) : null);
                            }}>
                              <option value="">Tous les sprints</option>
                              {sprintsForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Form.Select>
                          </div>
                          <div className="col-md-3 d-flex gap-2">
                            <button
                              className="btn btn-sm btn-primary flex-fill d-flex align-items-center justify-content-center gap-1"
                              style={{ background: 'var(--charcoal-blue)', borderColor: 'var(--charcoal-blue)' }}
                              onClick={applyFilter}
                            >
                              <FaCheck /> Appliquer
                            </button>
                            <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => setShowFilter(false)}>
                              Fermer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Tableau des lignes ── */}
                    <div className="table-responsive backlog-table-wrapper">
                      <table className="table table-bordered backlog-table">
                        <thead>
                          <tr>
                            <th style={{ width: '30px' }}></th>
                            <th style={{ width: '40px' }}>#</th>
                            {/* Colonne Sprint élargie pour afficher lot > phase > sprint */}
                            <th style={{ minWidth: '220px' }}>Lot › Phase › Sprint</th>
                            <th style={{ minWidth: '130px' }}>Epic</th>
                            <th style={{ minWidth: '160px' }}>User Story</th>
                            <th style={{ minWidth: '180px' }}>Description</th>
                            <th style={{ minWidth: '180px' }}>Détails</th>
                            {/* Colonnes profil avec sous-header collaborateur */}
                            {profils.map((profil, idx) => {
                              const collab = getCollaborateurForProfil(profil.id);
                              return (
                                <th
                                  key={profil.id}
                                  className={`profil-col-header profil-col-${idx % 4}`}
                                  style={{ minWidth: '120px', textAlign: 'center' }}
                                >
                                  <div className="profil-th-name">{profil.name}</div>
                                  {collab && (
                                    <div className="profil-th-collab">
                                      <FaUser size={10} className="me-1" />
                                      {collab.prenom} {collab.nom}
                                    </div>
                                  )}
                                  <div className="profil-th-tjm">{profil.tjm.toFixed(0)} / j</div>
                                </th>
                              );
                            })}
                            <th style={{ width: '100px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody ref={lineTableBodyRef}>
                          {filteredLines.length === 0 ? (
                            <tr className="sortable-empty-row">
                              <td colSpan={8 + profils.length} className="text-center text-muted py-4">
                                {isFilterActive
                                  ? "Aucune ligne ne correspond aux filtres sélectionnés."
                                  : 'Aucune ligne pour le moment. Cliquez sur "Ajouter une ligne" pour commencer.'}
                              </td>
                            </tr>
                          ) : filteredLines.slice((linePage - 1) * LINE_PAGE_SIZE, linePage * LINE_PAGE_SIZE).map(line => (
                            <tr key={line.id}>
                              <td className="line-drag-handle" style={{ cursor: 'grab', textAlign: 'center', color: '#aaa' }}>⋮⋮</td>
                              <td className="text-center" style={{ fontWeight: 600, color: 'var(--tomato-jam)' }}>{line.order}</td>
                              {/* Colonne Lot › Phase › Sprint */}
                              <td className="sprint-breadcrumb-cell">
                                {(() => {
                                  const lot   = getLotForSprint(line.sprintId);
                                  const phase = getPhaseForSprint(line.sprintId);
                                  const sprint = getSprintById(line.sprintId);
                                  if (!lot && !phase && !sprint) return <span className="text-muted">—</span>;
                                  return (
                                    <div className="sprint-breadcrumb">
                                      {lot && <span className="bc-lot">{lot.name}</span>}
                                      {lot && phase && <span className="bc-sep">›</span>}
                                      {phase && <span className="bc-phase">{phase.name}</span>}
                                      {phase && sprint && <span className="bc-sep">›</span>}
                                      {sprint && <span className="bc-sprint"><FaRunning size={10} className="me-1" />{sprint.name}</span>}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td>{line.epic || "—"}</td>
                              <td>{line.userStory || "—"}</td>
                              <td>{line.description || "—"}</td>
                              <td>{line.resultat || "—"}</td>
                              {profils.map((profil, idx) => (
                                <td
                                  key={profil.id}
                                  className={`text-center backlog-profil-cell profil-cell-${idx % 4}`}
                                  onClick={() => openLineProfilModal(line.id, profil.id)}
                                  style={{ cursor: 'pointer' }}
                                  title="Cliquez pour modifier le volume"
                                >
                                  <span className="profil-volume-badge">
                                    {getLineProfilVolume(line.id, profil.id) || "—"}
                                  </span>
                                </td>
                              ))}
                              <td>
                                <div className="d-flex gap-1 justify-content-center">
                                  <button className="btn btn-sm btn-secondary" onClick={() => openEditLine(line)} title="Modifier"><FaEdit /></button>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => deleteLine(line.id)} title="Supprimer"><FaTrash /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Pagination ── */}
                    {filteredLines.length > LINE_PAGE_SIZE && (() => {
                      const totalPages = Math.ceil(filteredLines.length / LINE_PAGE_SIZE);
                      return (
                        <div className="d-flex align-items-center justify-content-between mt-2 px-1">
                          <span className="text-muted small">
                            Page {linePage} / {totalPages} — {filteredLines.length} ligne{filteredLines.length > 1 ? 's' : ''}
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
                  </>
                )}
              </Tab>

              {/* ──────────────────── TAB LOTS ET PHASES ──────────────────── */}
              <Tab eventKey="lots" title="Lots et Phases">
                {!selectedBacklogId ? (
                  <div className="text-center text-muted py-5"><p>Veuillez sélectionner un backlog pour gérer les lots et phases.</p></div>
                ) : (
                  <>
                    <div className="d-flex justify-content-end mb-3">
                      <Button label="Ajouter un lot" icon={<FaPlus />} onClick={openAddLot} />
                    </div>
                    <div className="backlog-list" ref={listRef}>
                      {lots.length === 0 ? (
                        <div className="text-muted py-3 text-center">Aucun lot. Cliquez sur "Ajouter un lot" pour commencer.</div>
                      ) : lots.map(lot => (
                        <div key={lot.id} className="backlog-item" data-lot-id={lot.id}>
                          <div className="drag-handle">⋮⋮</div>
                          <div className="backlog-content">
                            <div className="backlog-title"><span className="backlog-order">{lot.order}. </span>{lot.name}</div>
                            <div className="backlog-desc">{lot.desc || "—"}</div>
                            <div className="phases-section mt-3">
                              <div className="phases-header d-flex justify-content-between align-items-center mb-2">
                                <strong>Phases :</strong>
                                <Button label="Ajouter une phase" variant="secondary" icon={<FaPlus />} onClick={() => openAddPhase(lot.id)} />
                              </div>
                              {lot.phases && lot.phases.length > 0 ? (
                                <div className="phases-list-sortable">
                                  {[...lot.phases].sort((a, b) => a.order - b.order).map(phase => (
                                    <div key={phase.id} className="phase-item" data-phase-id={phase.id}>
                                      <div className="phase-drag-handle">⋮⋮</div>
                                      <div className="phase-content">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <span className="phase-toggle d-inline-flex align-items-center phase-clickable" onClick={() => togglePhase(phase.id)} style={{ cursor: 'pointer', gap: '6px' }}>
                                            {expandedPhases.has(phase.id) ? <FaChevronDown /> : <FaChevronRight />}
                                            <span className="phase-order">{phase.order}.&nbsp;</span>
                                            <span className="phase-name">{phase.name}</span>
                                            <span className="badge bg-secondary ms-2">{phase.sprints?.length ?? 0} sprint{(phase.sprints?.length ?? 0) > 1 ? 's' : ''}</span>
                                          </span>
                                          <div className="phase-actions">
                                            <button className="btn btn-sm btn-primary me-1" onClick={e => { e.stopPropagation(); openAddSprint(phase.id); }} title="Ajouter un sprint">
                                              <FaRunning className="me-1" />Sprint
                                            </button>
                                            <button className="btn-icon" onClick={e => { e.stopPropagation(); openEditPhase(phase, lot.id); }}><FaEdit /></button>
                                            <button className="btn-icon" onClick={e => { e.stopPropagation(); deletePhase(phase.id, lot.id); }}><FaTrash /></button>
                                          </div>
                                        </div>
                                        {expandedPhases.has(phase.id) && (
                                          <div className="sprints-section mt-2 ms-3">
                                            {!phase.sprints || phase.sprints.length === 0 ? (
                                              <div className="text-muted small">Aucun sprint pour cette phase.</div>
                                            ) : (
                                              [...phase.sprints].sort((a, b) => a.order - b.order).map(sprint => (
                                                <div key={sprint.id} className="sprint-item mb-2 border rounded p-2" style={{ background: '#f0f4ff' }}>
                                                  <div className="d-flex justify-content-between align-items-center">
                                                    <span className="d-inline-flex align-items-center" style={{ cursor: 'pointer', gap: '6px', fontWeight: 500 }} onClick={() => toggleSprint(sprint.id)}>
                                                      {expandedSprints.has(sprint.id) ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                                                      <FaRunning size={13} className="text-primary" />
                                                      {sprint.order}. {sprint.name}
                                                      <span className="badge bg-success ms-2" style={{ fontSize: '0.7rem' }}>
                                                        {(sprintDeliverables.get(sprint.id)?.length ?? 0)} livrable{(sprintDeliverables.get(sprint.id)?.length ?? 0) > 1 ? 's' : ''}
                                                      </span>
                                                    </span>
                                                    <div className="d-flex gap-1">
                                                      <button className="btn btn-sm btn-success" onClick={e => { e.stopPropagation(); openAddDeliverable(sprint.id, phase.id); }}><FaCalendar className="me-1" />Livrable</button>
                                                      <button className="btn-icon" onClick={() => openEditSprint(sprint)}><FaEdit /></button>
                                                      <button className="btn-icon" onClick={() => deleteSprint(sprint.id, phase.id)}><FaTrash /></button>
                                                    </div>
                                                  </div>
                                                  {expandedSprints.has(sprint.id) && (
                                                    <div className="deliverables-section mt-2 ms-3">
                                                      {(sprintDeliverables.get(sprint.id)?.length ?? 0) === 0 ? (
                                                        <div className="text-muted small">Aucun livrable pour ce sprint.</div>
                                                      ) : (
                                                        sprintDeliverables.get(sprint.id)!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(deliverable => (
                                                          <div key={deliverable.id} className="deliverable-item">
                                                            <div className="deliverable-content">
                                                              <div className="d-flex justify-content-between align-items-start">
                                                                <div>
                                                                  <strong>{deliverable.name}</strong>
                                                                  {deliverable.description && <div className="text-muted small mt-1">{deliverable.description}</div>}
                                                                  {deliverable.isDelivered && <span className="badge bg-success ms-1" style={{ fontSize: '0.65rem' }}>Livré</span>}
                                                                </div>
                                                                <div className="deliverable-actions">
                                                                  <button className="btn-icon" onClick={() => openEditDeliverable(deliverable, sprint.id, phase.id)}><FaEdit /></button>
                                                                  <button className="btn-icon" onClick={() => deleteDeliverable(deliverable.id, sprint.id)}><FaTrash /></button>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        ))
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-muted small">Aucune phase. Cliquez sur "Ajouter une phase" pour commencer.</div>
                              )}
                            </div>
                          </div>
                          <div className="backlog-actions">
                            <Button label="Modifier" variant="secondary" onClick={() => openEditLot(lot)} />
                            <Button label="Supprimer" variant="outline" onClick={() => deleteLot(lot.id)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Tab>

              {/* ──────────────────── TAB PROFILS ──────────────────── */}
              <Tab eventKey="profils" title="Profils">
                {!selectedBacklogId ? (
                  <div className="text-center text-muted py-5"><p>Veuillez sélectionner un backlog pour gérer les profils.</p></div>
                ) : (
                  <>
                    <div className="d-flex justify-content-end mb-3">
                      <Button label="Ajouter un profil" icon={<FaPlus />} onClick={openAddProfil} />
                    </div>
                    <div className="profil-list" ref={profilListRef}>
                      {profils.length === 0 ? (
                        <div className="text-muted py-3 text-center">Aucun profil. Cliquez sur "Ajouter un profil" pour commencer.</div>
                      ) : profils.map(profil => {
                        const collab = getCollaborateurForProfil(profil.id);
                        return (
                          <div key={profil.id} className="backlog-item">
                            <div className="drag-handle-profil">⋮⋮</div>
                            <div className="backlog-content">
                              <div className="backlog-title"><span className="backlog-order">{profil.order}. </span>{profil.name}</div>
                              <div className="backlog-desc">{profil.desc || "—"}</div>
                              <div className="profil-tjm mt-2"><strong>TJM:</strong> {profil.tjm.toFixed(2)} { deviseAbr }</div>
                              {/* Collaborateur affecté */}
                              <div className="profil-collab-section mt-2">
                                {collab ? (
                                  <div className="profil-collab-badge">
                                    <FaUser className="me-1" />
                                    <span>{collab.prenom} {collab.nom}</span>
                                    <span className="profil-collab-poste">{getCollaborateurPoste(collab)} · {getCollaborateurBU(collab)}</span>
                                    <button
                                      className="profil-collab-change-btn"
                                      onClick={() => openCollabModal(profil.id)}
                                      title="Changer le collaborateur"
                                    >
                                      <FaEdit size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="profil-assign-btn"
                                    onClick={() => openCollabModal(profil.id)}
                                  >
                                    <FaUser className="me-1" size={12} />
                                    Affecter un collaborateur
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="backlog-actions">
                              <Button label="Modifier" variant="secondary" onClick={() => openEditProfil(profil)} />
                              <Button label="Supprimer" variant="outline" onClick={() => deleteProfil(profil.id)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Tab>

              {/* ──────────────────── TAB PLANNING ──────────────────── */}
              <Tab
                eventKey="planning"
                title={
                  <>
                    Planning
                    {planningOverrides.size > 0 && (
                      <span className="badge ms-1" style={{ background: "#7b3fbe", fontSize: "0.65rem", verticalAlign: "middle" }}>
                        {planningOverrides.size}
                      </span>
                    )}
                  </>
                }
              >
                {planningReady ? (
                  <PlanningTab
                    lots={lots}
                    lines={lines}
                    lineProfils={lineProfils}
                    deliverables={sprintDeliverables}
                    selectedBacklogId={selectedBacklogId}
                    planningService={backlogPlanningService}
                    datedebutPlanning={backlog?.dateDebutPlanning}
                    api={api}
                  />
                ) : (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Chargement du planning…
                  </div>
                )}
              </Tab>

              {/* ──────────────────── TAB BUDGET ──────────────────── */}
              <Tab eventKey="budget" title="Budget">
                <BudgetTab
                  lots={lots}
                  profils={profils}
                  lines={lines}
                  lineProfils={lineProfils}
                  selectedBacklogId={selectedBacklogId}
                  deviseAbr={deviseAbr}
                  onTotalChange={setBudgetRH}
                />
              </Tab>

              {/* ──────────────────── TAB CHARGES ANNEXES ──────────────────── */}
              <Tab eventKey="charges_annexes" title="Charges Annexes">
                <ChargesAnnexesTab
                  backlogId={selectedBacklogId}
                  deviseAbr={deviseAbr}
                  budgetRH={budgetRH}
                  service={chargesAnnexesService}
                />
              </Tab>

            </Tabs>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button label="Fermer" variant="outline" onClick={onClose} />
        </Modal.Footer>
      </Modal>

      {/* ═══════════════════════ SOUS-MODALS ═══════════════════════ */}

      {/* Lot */}
      <Modal show={showLotModal} onHide={() => !saving && setShowLotModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editingLot ? "Modifier le lot" : "Ajouter un lot"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={newLot.name} onChange={e => setNewLot({ ...newLot, name: e.target.value })} placeholder="Entrez le nom du lot" disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={newLot.desc} onChange={e => setNewLot({ ...newLot, desc: e.target.value })} placeholder="Entrez la description du lot" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowLotModal(false)} />
          <Button label={editingLot ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={saveLot} />
        </Modal.Footer>
      </Modal>

      {/* Phase */}
      <Modal show={showPhaseModal} onHide={() => !saving && setShowPhaseModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editingPhase ? "Modifier la phase" : "Ajouter une phase"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={newPhase.name} onChange={e => setNewPhase({ name: e.target.value })} placeholder="Entrez le nom de la phase" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowPhaseModal(false)} />
          <Button label={editingPhase ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={savePhase} />
        </Modal.Footer>
      </Modal>

      {/* Sprint */}
      <Modal show={showSprintModal} onHide={() => !saving && setShowSprintModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editingSprint ? "Modifier le sprint" : "Ajouter un sprint"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={newSprint.name} onChange={e => setNewSprint({ name: e.target.value })} placeholder="Entrez le nom du sprint" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowSprintModal(false)} />
          <Button label={editingSprint ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={saveSprint} />
        </Modal.Footer>
      </Modal>

      {/* Livrable */}
      <Modal show={showDeliverableModal} onHide={() => !saving && setShowDeliverableModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editingDeliverable ? "Modifier le livrable" : "Ajouter un livrable"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom du livrable *</Form.Label>
              <Form.Control value={newDeliverable.name} onChange={e => setNewDeliverable({ ...newDeliverable, name: e.target.value })} placeholder="Entrez le nom du livrable" disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description du livrable</Form.Label>
              <Form.Control as="textarea" rows={3} value={newDeliverable.description} onChange={e => setNewDeliverable({ ...newDeliverable, description: e.target.value })} placeholder="Entrez la description du livrable" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowDeliverableModal(false)} />
          <Button label={editingDeliverable ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={saveDeliverable} />
        </Modal.Footer>
      </Modal>

      {/* Profil */}
      <Modal show={showProfilModal} onHide={() => !saving && setShowProfilModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editingProfil ? "Modifier le profil" : "Ajouter un profil"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={newProfil.name} onChange={e => setNewProfil({ ...newProfil, name: e.target.value })} placeholder="Entrez le nom du profil" disabled={saving} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={newProfil.desc} onChange={e => setNewProfil({ ...newProfil, desc: e.target.value })} placeholder="Entrez la description du profil" disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>TJM *</Form.Label>
              <Form.Control type="number" step="0.01" min="0" value={newProfil.tjm} onChange={e => setNewProfil({ ...newProfil, tjm: parseFloat(e.target.value) || 0 })} placeholder="Entrez le tarif journalier moyen" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowProfilModal(false)} />
          <Button label={editingProfil ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={saveProfil} />
        </Modal.Footer>
      </Modal>

      {/* Ligne — sélection en cascade Lot › Phase › Sprint */}
      <Modal show={showLineModal} onHide={() => !saving && setShowLineModal(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>{editingLine ? "Modifier la ligne" : "Ajouter une ligne"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            {/* ── Cascade Lot > Phase > Sprint ── */}
            <div className="cascade-selector mb-3">
              <div className="cascade-selector-label">Affectation sprint *</div>
              <div className="row g-2">
                <div className="col-md-4">
                  <Form.Label className="small fw-semibold text-uppercase" style={{ color: 'var(--charcoal-blue)', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Lot
                  </Form.Label>
                  <Form.Select
                    value={newLine.lotId ?? ""}
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      setNewLine({ ...newLine, lotId: val, phaseId: null, sprintId: null });
                    }}
                    disabled={saving}
                    className="cascade-select"
                  >
                    <option value="">— Choisir un lot —</option>
                    {lots.map(l => <option key={l.id} value={l.id}>{l.order}. {l.name}</option>)}
                  </Form.Select>
                </div>
                <div className="col-md-4">
                  <Form.Label className="small fw-semibold text-uppercase" style={{ color: 'var(--charcoal-blue)', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Phase
                  </Form.Label>
                  <Form.Select
                    value={newLine.phaseId ?? ""}
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      setNewLine({ ...newLine, phaseId: val, sprintId: null });
                    }}
                    disabled={saving || !newLine.lotId}
                    className="cascade-select"
                  >
                    <option value="">— Choisir une phase —</option>
                    {phasesForSelectedLot.map(p => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}
                  </Form.Select>
                </div>
                <div className="col-md-4">
                  <Form.Label className="small fw-semibold text-uppercase" style={{ color: 'var(--charcoal-blue)', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
                    Sprint
                  </Form.Label>
                  <Form.Select
                    value={newLine.sprintId ?? ""}
                    onChange={e => setNewLine({ ...newLine, sprintId: e.target.value ? parseInt(e.target.value) : null })}
                    disabled={saving || !newLine.phaseId}
                    className="cascade-select"
                  >
                    <option value="">— Choisir un sprint —</option>
                    {sprintsForSelectedPhase.map(s => <option key={s.id} value={s.id}>{s.order}. {s.name}</option>)}
                  </Form.Select>
                </div>
              </div>
              {/* Breadcrumb de confirmation */}
              {newLine.sprintId && (
                <div className="cascade-breadcrumb mt-2">
                  <FaCheck className="me-1" style={{ color: '#28a745' }} />
                  {getSprintFullLabel(newLine.sprintId)}
                </div>
              )}
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Epic</Form.Label>
              <Form.Control value={newLine.epic} onChange={e => setNewLine({ ...newLine, epic: e.target.value })} placeholder="Entrez l'epic" disabled={saving} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>User Story</Form.Label>
              <Form.Control value={newLine.userStory} onChange={e => setNewLine({ ...newLine, userStory: e.target.value })} placeholder="Entrez la user story" disabled={saving} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={newLine.description} onChange={e => setNewLine({ ...newLine, description: e.target.value })} placeholder="Entrez la description" disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Détails</Form.Label>
              <Form.Control as="textarea" rows={2} value={newLine.resultat} onChange={e => setNewLine({ ...newLine, resultat: e.target.value })} placeholder="Entrez les détails du résultat attendu" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowLineModal(false)} />
          <Button label={editingLine ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={saveLine} />
        </Modal.Footer>
      </Modal>

      {/* Volume profil */}
      <Modal show={showLineProfilModal} onHide={() => !saving && setShowLineProfilModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editingLineProfil ? "Modifier le volume" : "Ajouter un volume"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Volume (jours-homme) *</Form.Label>
              <Form.Control type="number" step="0.5" min="0" value={newLineProfil.volume} onChange={e => setNewLineProfil({ volume: parseFloat(e.target.value) || 0 })} placeholder="Entrez le volume en jours-homme" disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {editingLineProfil && <Button label="Supprimer" variant="outline" onClick={deleteLineProfil} />}
          <Button label="Annuler" variant="outline" onClick={() => setShowLineProfilModal(false)} />
          <Button label={editingLineProfil ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")} onClick={saveLineProfil} />
        </Modal.Footer>
      </Modal>

      {/* ═══════════════ MODAL AFFECTATION COLLABORATEUR ═══════════════ */}
      <Modal show={showCollabModal} onHide={() => !savingCollab && setShowCollabModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaUser />
            Affecter un collaborateur
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
                >
                  <FaUser className="me-1" /> Par nom / prénom
                </button>
                <button
                  className={`btn ${collabSearchType === 'poste' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={collabSearchType === 'poste' ? { background: 'var(--charcoal-blue)', borderColor: 'var(--charcoal-blue)' } : {}}
                  onClick={() => setCollabSearchType('poste')}
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
                autoFocus
              />
              {collabSearch && (
                <button className="btn btn-outline-secondary" onClick={() => setCollabSearch("")}>
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* Liste de résultats */}
          <div className="collab-results-list">
            {filteredCollaborateurs.length === 0 ? (
              <div className="text-center text-muted py-4">
                <FaUser size={24} className="mb-2 d-block mx-auto" style={{ opacity: 0.3 }} />
                Aucun collaborateur trouvé
              </div>
            ) : (
              filteredCollaborateurs.map(c => (
                <div
                  key={c.id}
                  className={`collab-result-item ${savingCollab ? 'disabled' : ''}`}
                  onClick={() => !savingCollab && handleSelectCollaborateur(c)}
                >
                  <div className="collab-avatar">
                    {c.prenom[0]}{c.nom[0]}
                  </div>
                  <div className="collab-info">
                    <div className="collab-name">{c.prenom} {c.nom}</div>
                    <div className="collab-meta">
                      <span className="collab-poste">{getCollaborateurPoste(c)}</span>
                      <span className="collab-bu-sep">·</span>
                      <span className="collab-bu">{getCollaborateurBU(c)}</span>
                    </div>
                  </div>
                  <div className="collab-select-icon">
                    {savingCollab ? <FaSpinner className="fa-spin" /> : <FaCheck />}
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowCollabModal(false)} />
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default BacklogModal;