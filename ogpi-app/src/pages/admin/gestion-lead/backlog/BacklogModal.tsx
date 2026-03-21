import React, { useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";

import Button from "../../../../components/button/Button.tsx";
import { FaPlus, FaSpinner, FaEdit, FaTrash, FaEye, FaArrowLeft, FaCalendar, FaChevronDown, FaChevronRight } from "react-icons/fa";
import { Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";

import "./BacklogModal.css";
import { BacklogService } from "../../../../services/lead/backlog/BacklogService.tsx";
import { BacklogLotService } from "../../../../services/lead/backlog/BacklogLotService.tsx";
import { BacklogPhaseService } from "../../../../services/lead/backlog/BacklogPhaseService.tsx";
import { BacklogProfilService } from "../../../../services/lead/backlog/BacklogProfilService.tsx";
import { BacklogLineService } from "../../../../services/lead/backlog/BacklogLineService.tsx";
import { BacklogProjetLineProfilService } from "../../../../services/lead/backlog/BacklogLineProfilService.tsx";
import { BacklogDeliverableService } from "../../../../services/lead/backlog/BacklogdeliverableService.tsx";
import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import BacklogForm from "./BacklogForm.tsx";
import PlanningTab from "./PlanningTab.tsx";
import BudgetTab from "./BudgetTab.tsx";
import ChargesAnnexesTab from "../../gestion-projet/tabs/ChargesAnnexesTab.tsx";
import { ChargesAnnexesService } from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";

import {
  Backlog,
  BacklogLot,
  BacklogPhase,
  BacklogProfil,
  BacklogLine,
  BacklogLineProfil,
  CreateBacklogRequest
} from "../../../../types/lead/Backlog/Backlog.tsx";

import { BacklogDeliverable } from "../../../../types/lead/Backlog/Backlog.tsx";
import { BacklogPlanningService } from "../../../../services/lead/backlog/BacklogPlanningService.tsx";

interface BacklogModalProps {
  show: boolean;
  onClose: () => void;
  leadId: number;
  leadName?: string;
}

const BacklogModal: React.FC<BacklogModalProps> = ({ show, onClose, leadId, leadName }) => {
  const { api } = useAuth();
  const backlogService            = new BacklogService(api);
  const backlogLotService         = new BacklogLotService(api);
  const backlogPhaseService       = new BacklogPhaseService(api);
  const backlogProfilService      = new BacklogProfilService(api);
  const backlogLineService        = new BacklogLineService(api);
  const backlogLineProfilService  = new BacklogLineProfilService(api);
  const backlogDeliverableService = new BacklogDeliverableService(api);
  const backlogPlanningService    = new BacklogPlanningService(api);
  const leadTechFinService        = useLeadTechFinDetailsService();
  const chargesAnnexesService     = new ChargesAnnexesService(api);

  // ── Liste des backlogs ────────────────────────────────────
  const [backlogs,          setBacklogs]          = useState<Backlog[]>([]);
  const [selectedBacklogId, setSelectedBacklogId] = useState<number | null>(null);
  const [loadingBacklogs,   setLoadingBacklogs]   = useState(true);

  // ── Données du backlog sélectionné ────────────────────────
  const [backlog,      setBacklog]      = useState<Backlog | null>(null);
  const [lots,         setLots]         = useState<BacklogLot[]>([]);
  const [profils,      setProfils]      = useState<BacklogProfil[]>([]);
  const [lines,        setLines]        = useState<BacklogLine[]>([]);
  const [lineProfils,  setLineProfils]  = useState<BacklogLineProfil[]>([]);
  const [deliverables, setDeliverables] = useState<Map<number, BacklogDeliverable[]>>(new Map());

  // ── Overrides planning pré-chargés ────────────────────────
  // Clé : "phase-{id}", Valeur : { heures }
  const [planningOverrides, setPlanningOverrides] = useState<Map<string, { heures: number }>>(new Map());
  const [planningReady,     setPlanningReady]     = useState(false); // ← NOUVEAU

  // ── Modaux ────────────────────────────────────────────────
  const [showLotModal,          setShowLotModal]          = useState(false);
  const [showPhaseModal,        setShowPhaseModal]        = useState(false);
  const [showProfilModal,       setShowProfilModal]       = useState(false);
  const [showLineModal,         setShowLineModal]         = useState(false);
  const [showLineProfilModal,   setShowLineProfilModal]   = useState(false);
  const [showDeliverableModal,  setShowDeliverableModal]  = useState(false);
  const [showBacklogFormModal,  setShowBacklogFormModal]  = useState(false);

  // ── Entités en cours d'édition ───────────────────────────
  const [editingLot,         setEditingLot]         = useState<BacklogLot | null>(null);
  const [editingPhase,       setEditingPhase]       = useState<BacklogPhase | null>(null);
  const [editingProfil,      setEditingProfil]      = useState<BacklogProfil | null>(null);
  const [editingLine,        setEditingLine]        = useState<BacklogLine | null>(null);
  const [editingLineProfil,  setEditingLineProfil]  = useState<BacklogLineProfil | null>(null);
  const [editingDeliverable, setEditingDeliverable] = useState<BacklogDeliverable | null>(null);

  // ── IDs courants ─────────────────────────────────────────
  const [currentLotId,    setCurrentLotId]    = useState<number | null>(null);
  const [currentLineId,   setCurrentLineId]   = useState<number | null>(null);
  const [currentProfilId, setCurrentProfilId] = useState<number | null>(null);
  const [currentPhaseId,  setCurrentPhaseId]  = useState<number | null>(null);

  // ── Formulaires ──────────────────────────────────────────
  const [newLot,         setNewLot]         = useState({ name: "", desc: "" });
  const [newPhase,       setNewPhase]       = useState({ name: "" });
  const [newProfil,      setNewProfil]      = useState({ name: "", desc: "", tjm: 0 });
  const [newLine,        setNewLine]        = useState({ epic: "", userStory: "", description: "", resultat: "", phaseId: null as number | null });
  const [newLineProfil,  setNewLineProfil]  = useState({ volume: 0 });
  const [newDeliverable, setNewDeliverable] = useState({ name: "", description: "" });

  // ── États UI ─────────────────────────────────────────────
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState<string | null>(null);
  const [saving,              setSaving]              = useState(false);
  const [activeTab,           setActiveTab]           = useState<string>("backlog");
  const [expandedPhases,      setExpandedPhases]      = useState<Set<number>>(new Set());
  const [loadingDeliverables, setLoadingDeliverables] = useState<Set<number>>(new Set());
  const [deviseAbr,           setDeviseAbr]           = useState<string | null>(null);
  const [budgetRH,            setBudgetRH]            = useState<number>(0);

  // ── Refs Sortable ─────────────────────────────────────────
  const listRef                      = useRef<HTMLDivElement | null>(null);
  const profilListRef                = useRef<HTMLDivElement | null>(null);
  const sortableInstance             = useRef<Sortable | null>(null);
  const profilSortableInstance       = useRef<Sortable | null>(null);
  const phaseSortableInstances       = useRef<Map<number, Sortable>>(new Map());
  const deliverableSortableInstances = useRef<Map<number, Sortable>>(new Map());
  const lineTableBodyRef             = useRef<HTMLTableSectionElement | null>(null);
  const lineSortableInstance         = useRef<Sortable | null>(null);

  // ─────────────────────────────────────────────────────────
  // CRÉATION BACKLOG
  // ─────────────────────────────────────────────────────────
  const handleCreateBacklog = async (item: CreateBacklogRequest) => {
    if (!leadId) return;
    try {
      const created = await backlogService.createBacklog({
        name:     item.name,
        desc:     item.desc,
        leadId:   item.leadId,
        projetId: null,
        type:     item.type, 
      });
      setBacklogs(prev => [...prev, created]);
      setSelectedBacklogId(created.id);
      setShowBacklogFormModal(false);
    } catch (err) {
      console.error("Erreur lors de la création du backlog:", err);
      alert("Impossible de créer le backlog.");
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH LISTE DES BACKLOGS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (show && leadId) fetchBacklogsList();
  }, [show, leadId]);

  const fetchBacklogsList = async () => {
    try {
      setLoadingBacklogs(true);
      setError(null);
      const fetchedBacklogs = await backlogService.getByLeadId(leadId);
      const filtered = fetchedBacklogs.filter(b => b.type !== 1); 
      setBacklogs(filtered);
      if (filtered.length === 1) setSelectedBacklogId(filtered[0].id);
    } catch (err) {
      console.error("Erreur lors du chargement des backlogs:", err);
      setError("Impossible de charger les backlogs. Veuillez réessayer.");
    } finally {
      setLoadingBacklogs(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH BACKLOG COMPLET + OVERRIDES PLANNING
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedBacklogId) fetchBacklog();
  }, [selectedBacklogId]);

  useEffect(() => {
    const fetchDevise = async () => {
      try {
        if (!leadId) return;
        const techFin = await leadTechFinService.getByLeadId(leadId);
        const abr = (techFin && (techFin.devise?.abrDevise || techFin.devise?.abrDevise)) || null;
        setDeviseAbr(abr);
      } catch (err) {
        console.error("Erreur lors du chargement de la devise:", err);
        setDeviseAbr(null);
      }
    };
    fetchDevise();
  }, [leadId]);

  const fetchBacklog = async () => {
    if (!selectedBacklogId) return;

    // Reset planningReady à chaque nouveau chargement
    setPlanningReady(false);

    try {
      setLoading(true);
      setError(null);

      const fetchedBacklog = await backlogService.getCompleteById(selectedBacklogId);
      setBacklog(fetchedBacklog);

      const sortedLots = [...(fetchedBacklog.lots || [])].sort((a, b) => a.order - b.order);
      setLots(sortedLots);

      const sortedProfils = [...(fetchedBacklog.profils || [])].sort((a, b) => a.order - b.order);
      setProfils(sortedProfils);

      const sortedLines = [...(fetchedBacklog.lines || [])].sort((a, b) => a.order - b.order);
      setLines(sortedLines);

      const allLineProfils: BacklogLineProfil[] = [];
      sortedLines.forEach(line => {
        if (line.profils && line.profils.length > 0) allLineProfils.push(...line.profils);
      });
      setLineProfils(allLineProfils);

      const deliverablesMap = new Map<number, BacklogDeliverable[]>();
      const allPhases = sortedLots.flatMap(lot => lot.phases || []);
      for (const phase of allPhases) {
        try {
          const phaseDeliverables = await backlogDeliverableService.getByPhaseId(phase.id);
          const sorted = [...(phaseDeliverables || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          deliverablesMap.set(phase.id, sorted);
        } catch (err) {
          console.error(`Erreur livrables phase ${phase.id}:`, err);
          deliverablesMap.set(phase.id, []);
        }
      }
      setDeliverables(deliverablesMap);

    } catch (err) {
      console.error("Erreur lors du chargement du backlog:", err);
      setError("Impossible de charger le backlog. Veuillez réessayer.");
    }

    // ── Chargement conditionnel des overrides planning ──────────────────
    // On utilise hasPlanning() pour éviter un appel inutile à getByBacklogId()
    // si aucun override n'existe encore pour ce backlog.
    // PlanningTab n'est monté QUE quand planningReady = true → initialOverrides
    // est déjà rempli au moment du premier rendu du composant.
    try {
      const hasChanges = await backlogPlanningService.hasPlanning(selectedBacklogId);
      if (hasChanges) {
        const planningEntries = await backlogPlanningService.getByBacklogId(selectedBacklogId);
        const map = new Map<string, { heures: number }>();
        planningEntries.forEach(e => {
          if (isFinite(e.heures) && e.heures > 0) {
            map.set(`phase-${e.phaseId}`, { heures: e.heures });
          }
        });
        setPlanningOverrides(map);
      } else {
        setPlanningOverrides(new Map());
      }
    } catch {
      setPlanningOverrides(new Map());
    } finally {
      setLoading(false);
      setPlanningReady(true); // ← overrides prêts (vides ou non) → PlanningTab peut être monté
    }
  };

  // ─────────────────────────────────────────────────────────
  // RETOUR À LA LISTE
  // ─────────────────────────────────────────────────────────
  const handleBackToList = () => {
    setSelectedBacklogId(null);
    setBacklog(null);
    setLots([]);
    setProfils([]);
    setLines([]);
    setLineProfils([]);
    setDeliverables(new Map());
    setPlanningOverrides(new Map());
    setPlanningReady(false); // ← reset : PlanningTab sera démonté et remonté proprement
  };

  /* ================= SORTABLE LINES ================= */
  useEffect(() => {
    if (lineSortableInstance.current) {
      lineSortableInstance.current.destroy();
      lineSortableInstance.current = null;
    }
    if (!lineTableBodyRef.current || lines.length === 0 || !show || !selectedBacklogId) return;

    lineSortableInstance.current = Sortable.create(lineTableBodyRef.current, {
      animation: 150, handle: ".line-drag-handle",
      ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
      filter: ".sortable-empty-row",
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        if (evt.oldIndex === evt.newIndex) return;
        const newLines = [...lines];
        const [movedItem] = newLines.splice(evt.oldIndex, 1);
        newLines.splice(evt.newIndex, 0, movedItem);
        const reorderedLines = newLines.map((line, index) => ({ ...line, order: index + 1 }));
        setLines(reorderedLines);
        try {
          await backlogLineService.updateOrder(reorderedLines.map(l => ({ id: l.id, order: l.order })));
        } catch (err) {
          console.error("Erreur ordre lignes:", err);
          fetchBacklog();
        }
      },
    });
    return () => { lineSortableInstance.current?.destroy(); lineSortableInstance.current = null; };
  }, [lines, loading, show, selectedBacklogId]);

  /* ================= SORTABLE LOTS ================= */
  useEffect(() => {
    if (!listRef.current || sortableInstance.current || lots.length === 0 || !show || !selectedBacklogId) return;
    sortableInstance.current = Sortable.create(listRef.current, {
      animation: 150, handle: ".drag-handle",
      ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        const newLots = [...lots];
        const [movedItem] = newLots.splice(evt.oldIndex, 1);
        newLots.splice(evt.newIndex, 0, movedItem);
        const reorderedLots = newLots.map((lot, index) => ({ ...lot, order: index + 1 }));
        setLots(reorderedLots);
        try {
          await backlogLotService.updateOrder(reorderedLots.map(l => ({ id: l.id, order: l.order })));
        } catch (err) {
          console.error("Erreur ordre lots:", err);
          fetchBacklog();
        }
      },
    });
    return () => { sortableInstance.current?.destroy(); sortableInstance.current = null; };
  }, [lots, loading, show, selectedBacklogId]);

  /* ================= SORTABLE PROFILS ================= */
  useEffect(() => {
    if (!profilListRef.current || profilSortableInstance.current || profils.length === 0 || !show || !selectedBacklogId) return;
    profilSortableInstance.current = Sortable.create(profilListRef.current, {
      animation: 150, handle: ".drag-handle-profil",
      ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        const newProfils = [...profils];
        const [movedItem] = newProfils.splice(evt.oldIndex, 1);
        newProfils.splice(evt.newIndex, 0, movedItem);
        const reorderedProfils = newProfils.map((p, index) => ({ ...p, order: index + 1 }));
        setProfils(reorderedProfils);
        try {
          await backlogProfilService.updateOrder(reorderedProfils.map(p => ({ id: p.id, order: p.order })));
        } catch (err) {
          console.error("Erreur ordre profils:", err);
          fetchBacklog();
        }
      },
    });
    return () => { profilSortableInstance.current?.destroy(); profilSortableInstance.current = null; };
  }, [profils, loading, show, selectedBacklogId]);

  /* ================= SORTABLE PHASES ================= */
  useEffect(() => {
    if (!show || !selectedBacklogId) return;
    phaseSortableInstances.current.forEach(i => i.destroy());
    phaseSortableInstances.current.clear();
    lots.forEach(lot => {
      if (!lot.phases || lot.phases.length === 0) return;
      const el = document.querySelector(`[data-lot-id="${lot.id}"] .phases-list-sortable`) as HTMLElement;
      if (!el) return;
      const sortable = Sortable.create(el, {
        animation: 150, handle: ".phase-drag-handle",
        ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
        onEnd: async (evt) => {
          if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
          const lotToUpdate = lots.find(l => l.id === lot.id);
          if (!lotToUpdate?.phases) return;
          const newPhases = [...lotToUpdate.phases];
          const [movedPhase] = newPhases.splice(evt.oldIndex, 1);
          newPhases.splice(evt.newIndex, 0, movedPhase);
          const reorderedPhases = newPhases.map((p, i) => ({ ...p, order: i + 1 }));
          setLots(lots.map(l => l.id === lot.id ? { ...l, phases: reorderedPhases } : l));
          try {
            await backlogPhaseService.updateOrder(reorderedPhases.map(p => ({ id: p.id, order: p.order })));
          } catch (err) {
            console.error("Erreur ordre phases:", err);
            fetchBacklog();
          }
        },
      });
      phaseSortableInstances.current.set(lot.id, sortable);
    });
    return () => { phaseSortableInstances.current.forEach(i => i.destroy()); phaseSortableInstances.current.clear(); };
  }, [lots, show, selectedBacklogId]);

  /* ================= LOT ACTIONS ================= */
  const openAddLot  = () => { setEditingLot(null); setNewLot({ name: "", desc: "" }); setShowLotModal(true); };
  const openEditLot = (lot: BacklogLot) => { setEditingLot(lot); setNewLot({ name: lot.name, desc: lot.desc || "" }); setShowLotModal(true); };

  const saveLot = async () => {
    if (!newLot.name.trim()) { alert("Le nom du lot est requis"); return; }
    if (!selectedBacklogId) return;
    setSaving(true);
    try {
      if (editingLot) {
        const updatedLot = await backlogLotService.update(editingLot.id, { name: newLot.name, desc: newLot.desc });
        setLots(lots.map(l => l.id === editingLot.id ? updatedLot : l));
      } else {
        const nextOrder = Math.max(...lots.map(l => l.order), 0) + 1;
        const createdLot = await backlogLotService.create({ name: newLot.name, desc: newLot.desc, order: nextOrder, backlogId: selectedBacklogId });
        setLots([...lots, createdLot]);
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
      await backlogLotService.updateOrder(updated.map(lot => ({ id: lot.id, order: lot.order })));
    } catch (err) { console.error(err); alert("Impossible de supprimer le lot."); }
  };

  /* ================= PHASE ACTIONS ================= */
  const openAddPhase  = (lotId: number) => { setCurrentLotId(lotId); setEditingPhase(null); setNewPhase({ name: "" }); setShowPhaseModal(true); };
  const openEditPhase = (phase: BacklogPhase, lotId: number) => { setCurrentLotId(lotId); setEditingPhase(phase); setNewPhase({ name: phase.name }); setShowPhaseModal(true); };

  const togglePhase = async (phaseId: number) => {
    if (expandedPhases.has(phaseId)) {
      setExpandedPhases(prev => { const n = new Set(prev); n.delete(phaseId); return n; });
      return;
    }
    if (deliverables.has(phaseId)) { setExpandedPhases(prev => new Set(prev).add(phaseId)); return; }
    setLoadingDeliverables(prev => new Set(prev).add(phaseId));
    try {
      const phaseDeliverables = await backlogDeliverableService.getByPhaseId(phaseId);
      const sorted = [...(phaseDeliverables || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setDeliverables(prev => { const n = new Map(prev); n.set(phaseId, sorted); return n; });
      setExpandedPhases(prev => new Set(prev).add(phaseId));
    } catch (err) {
      console.error(err);
      alert("Impossible de charger les livrables pour cette phase.");
    } finally {
      setLoadingDeliverables(prev => { const n = new Set(prev); n.delete(phaseId); return n; });
    }
  };

  const savePhase = async () => {
    if (!newPhase.name.trim()) { alert("Le nom de la phase est requis"); return; }
    if (currentLotId === null) return;
    setSaving(true);
    try {
      if (editingPhase) {
        const updatedPhase = await backlogPhaseService.update(editingPhase.id, { name: newPhase.name });
        setLots(lots.map(lot => lot.id === currentLotId
          ? { ...lot, phases: lot.phases?.map(p => p.id === editingPhase.id ? updatedPhase : p) }
          : lot));
      } else {
        const currentLot = lots.find(l => l.id === currentLotId);
        const nextOrder = Math.max(...(currentLot?.phases?.map(p => p.order) || [0]), 0) + 1;
        const createdPhase = await backlogPhaseService.create({ name: newPhase.name, order: nextOrder, lotId: currentLotId });
        setLots(lots.map(lot => lot.id === currentLotId ? { ...lot, phases: [...(lot.phases || []), createdPhase] } : lot));
        const updatedMap = new Map(deliverables);
        updatedMap.set(createdPhase.id, []);
        setDeliverables(updatedMap);
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
      const updatedMap = new Map(deliverables);
      updatedMap.delete(phaseId);
      setDeliverables(updatedMap);
      const currentLot = lots.find(l => l.id === lotId);
      if (currentLot?.phases) {
        await backlogPhaseService.updateOrder(
          currentLot.phases.filter(p => p.id !== phaseId).map((p, i) => ({ id: p.id, order: i + 1 }))
        );
      }
    } catch (err) { console.error(err); alert("Impossible de supprimer la phase."); }
  };

  /* ================= DELIVERABLE ACTIONS ================= */
  const openAddDeliverable  = (phaseId: number) => { setCurrentPhaseId(phaseId); setEditingDeliverable(null); setNewDeliverable({ name: "", description: "" }); setShowDeliverableModal(true); };
  const openEditDeliverable = (d: BacklogDeliverable, phaseId: number) => { setCurrentPhaseId(phaseId); setEditingDeliverable(d); setNewDeliverable({ name: d.name, description: d.description }); setShowDeliverableModal(true); };

  const saveDeliverable = async () => {
    if (!newDeliverable.name.trim()) { alert("Le nom du livrable est requis"); return; }
    if (currentPhaseId === null) return;
    setSaving(true);
    try {
      if (editingDeliverable) {
        const updated = await backlogDeliverableService.update(editingDeliverable.id, { name: newDeliverable.name, description: newDeliverable.description, phaseId: currentPhaseId ?? editingDeliverable.phaseId });
        const updatedMap = new Map(deliverables);
        updatedMap.set(currentPhaseId, (updatedMap.get(currentPhaseId) || []).map(d => d.id === editingDeliverable.id ? updated : d));
        setDeliverables(updatedMap);
      } else {
        const created = await backlogDeliverableService.create({ name: newDeliverable.name, description: newDeliverable.description, phaseId: currentPhaseId });
        const updatedMap = new Map(deliverables);
        updatedMap.set(currentPhaseId, [...(updatedMap.get(currentPhaseId) || []), created]);
        setDeliverables(updatedMap);
      }
      setShowDeliverableModal(false); setEditingDeliverable(null); setNewDeliverable({ name: "", description: "" }); setCurrentPhaseId(null);
    } catch (err) { console.error(err); alert("Une erreur est survenue lors de la sauvegarde."); }
    finally { setSaving(false); }
  };

  const deleteDeliverable = async (deliverableId: number, phaseId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce livrable ?")) return;
    try {
      await backlogDeliverableService.delete(deliverableId);
      const updatedMap = new Map(deliverables);
      const updated = (updatedMap.get(phaseId) || []).filter(d => d.id !== deliverableId).map((d, i) => ({ ...d, order: i + 1 }));
      updatedMap.set(phaseId, updated);
      setDeliverables(updatedMap);
      if (updated.length > 0) await backlogDeliverableService.updateOrder(updated.map(d => ({ id: d.id, order: d.order })));
    } catch (err) { console.error(err); alert("Impossible de supprimer le livrable."); }
  };

  /* ================= PROFIL ACTIONS ================= */
  const openAddProfil  = () => { setEditingProfil(null); setNewProfil({ name: "", desc: "", tjm: 0 }); setShowProfilModal(true); };
  const openEditProfil = (profil: BacklogProfil) => { setEditingProfil(profil); setNewProfil({ name: profil.name, desc: profil.desc || "", tjm: profil.tjm }); setShowProfilModal(true); };

  const saveProfil = async () => {
    if (!newProfil.name.trim()) { alert("Le nom du profil est requis"); return; }
    if (newProfil.tjm < 0) { alert("Le TJM doit être positif"); return; }
    if (!selectedBacklogId) return;
    setSaving(true);
    try {
      if (editingProfil) {
        const updated = await backlogProfilService.update(editingProfil.id, { name: newProfil.name, desc: newProfil.desc, tjm: newProfil.tjm });
        setProfils(profils.map(p => p.id === editingProfil.id ? updated : p));
      } else {
        const nextOrder = Math.max(...profils.map(p => p.order), 0) + 1;
        const created = await backlogProfilService.create({ name: newProfil.name, desc: newProfil.desc, tjm: newProfil.tjm, order: nextOrder, backlogId: selectedBacklogId });
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

  /* ================= LINE ACTIONS ================= */
  const getAllPhases = (): BacklogPhase[] => lots.flatMap(lot => lot.phases || []);

  const openAddLine  = () => { setEditingLine(null); setNewLine({ epic: "", userStory: "", description: "", resultat: "", phaseId: null }); setShowLineModal(true); };
  const openEditLine = (line: BacklogLine) => { setEditingLine(line); setNewLine({ epic: line.epic || "", userStory: line.userStory || "", description: line.description || "", resultat: line.resultat || "", phaseId: line.phaseId }); setShowLineModal(true); };

  const saveLine = async () => {
    if (!newLine.phaseId) { alert("La phase est requise"); return; }
    setSaving(true);
    try {
      if (editingLine) {
        const updated = await backlogLineService.update(editingLine.id, { epic: newLine.epic, userStory: newLine.userStory, description: newLine.description, resultat: newLine.resultat, phaseId: newLine.phaseId, order: editingLine.order });
        setLines(lines.map(l => l.id === editingLine.id ? updated : l));
      } else {
        const nextOrder = Math.max(...lines.map(l => l.order), 0) + 1;
        const created = await backlogLineService.create({ epic: newLine.epic, userStory: newLine.userStory, description: newLine.description, resultat: newLine.resultat, order: nextOrder, phaseId: newLine.phaseId });
        setLines([...lines, created]);
      }
      setShowLineModal(false); setEditingLine(null); setNewLine({ epic: "", userStory: "", description: "", resultat: "", phaseId: null });
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

  /* ================= LINE PROFIL ACTIONS ================= */
  const getLineProfilVolume = (lineId: number, profilId: number): number =>
    lineProfils.find(lp => lp.lineId === lineId && lp.profil.id === profilId)?.volume || 0;

  const openLineProfilModal = (lineId: number, profilId: number) => {
    setCurrentLineId(lineId); setCurrentProfilId(profilId);
    const existing = lineProfils.find(lp => lp.lineId === lineId && lp.profil.id === profilId);
    if (existing) { setEditingLineProfil(existing); setNewLineProfil({ volume: existing.volume }); }
    else { setEditingLineProfil(null); setNewLineProfil({ volume: 0 }); }
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

  const getPhaseNameById = (phaseId: number | null): string => {
    if (!phaseId) return "—";
    return getAllPhases().find(p => p.id === phaseId)?.name || "—";
  };

  /* ================= CALCULS TOTAUX ================= */
  const getProfilTotals = () => profils.map(profil => {
    const totalVolume = lineProfils.filter(lp => lp.profil.id === profil.id).reduce((s, lp) => s + lp.volume, 0);
    return { profil, totalVolume, totalAmount: totalVolume * profil.tjm };
  });

  const getLotTotals = () => lots.map(lot => {
    const phaseTotals = (lot.phases || []).map(phase => {
      const phaseLineIds = lines.filter(l => l.phaseId === phase.id).map(l => l.id);
      const phaseLP = lineProfils.filter(lp => phaseLineIds.includes(lp.lineId));
      const totalVolume = phaseLP.reduce((s, lp) => s + lp.volume, 0);
      const totalAmount = phaseLP.reduce((s, lp) => s + lp.volume * (profils.find(p => p.id === lp.profil.id)?.tjm || 0), 0);
      return { phase, totalVolume, totalAmount };
    });
    return { lot, phaseTotals, lotTotalVolume: phaseTotals.reduce((s, pt) => s + pt.totalVolume, 0), lotTotalAmount: phaseTotals.reduce((s, pt) => s + pt.totalAmount, 0) };
  });

  /* ================= RENDER ================= */
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
          <Modal.Title>
            {selectedBacklogId && (
              <Button label="" icon={<FaArrowLeft />} variant="outline" onClick={handleBackToList} className="me-2" />
            )}
            Backlogs - {leadName}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#f8f9fa' }}>
          <div className="container-fluid">
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || "backlog")} className="mb-4">

              {/* ── TAB BACKLOG ── */}
              <Tab eventKey="backlog" title="Backlog">
                {!selectedBacklogId ? (
                  <div>
                    {/* Bouton + formulaire de création : uniquement quand aucun backlog n'existe */}
                    {backlogs.length === 0 && (
                      <>
                        <BacklogForm
                          show={showBacklogFormModal}
                          onClose={() => setShowBacklogFormModal(false)}
                          onSubmit={handleCreateBacklog}
                          leadId={leadId}
                        />
                        <Button
                          label="Créer un backlog"
                          icon={<FaPlus />}
                          onClick={() => setShowBacklogFormModal(true)}
                          variant="primary"
                          className="mb-3"
                        />
                        <div className="text-center text-muted py-5">
                          <p>Aucun backlog trouvé pour ce lead.</p>
                          <p className="small">Cliquez sur "Créer un backlog" pour commencer.</p>
                        </div>
                      </>
                    )}

                    {/* Liste des backlogs existants */}
                    {backlogs.length > 0 && (
                      <div className="row">
                        {backlogs.map(backlogItem => (
                          <div key={backlogItem.id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setSelectedBacklogId(backlogItem.id)}>
                              <div className="card-body">
                                <h5 className="card-title">{backlogItem.name}</h5>
                                {backlogItem.desc && <p className="card-text text-muted small">{backlogItem.desc}</p>}
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
                    {/* Totaux par profil */}
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
                                  <td className="text-end"><strong>{`${totalAmount.toFixed(2)} ${deviseAbr || ''}`}</strong></td>
                                </tr>
                              ))}
                              <tr className="table-active">
                                <td><strong>TOTAL GÉNÉRAL</strong></td>
                                <td className="text-end"><strong>{profilTotals.reduce((s, pt) => s + pt.totalVolume, 0).toFixed(2)}</strong></td>
                                <td></td>
                                <td className="text-end"><strong>{`${profilTotals.reduce((s, pt) => s + pt.totalAmount, 0).toFixed(2)} ${deviseAbr || ''}`}</strong></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Totaux par lot et phase */}
                    <div className="card mb-4">
                      <div className="card-header"><h5 className="mb-0">Totaux par lot et phase</h5></div>
                      <div className="card-body">
                        {lotTotals.map(({ lot, phaseTotals, lotTotalVolume, lotTotalAmount }) => (
                          <div key={lot.id} className="mb-4">
                            <h6 className="text-primary">{lot.name} - Volume: {lotTotalVolume.toFixed(2)} JH - Montant: {`${lotTotalAmount.toFixed(2)} ${deviseAbr || ''}`}</h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered">
                                <thead><tr><th>Phase</th><th className="text-end">Volume (JH)</th><th className="text-end">Montant</th></tr></thead>
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

                    <div className="d-flex justify-content-end mb-3">
                      <Button label="Ajouter une ligne" icon={<FaPlus />} onClick={openAddLine} />
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered backlog-table">
                        <thead>
                          <tr>
                            <th style={{width:'30px'}}></th>
                            <th style={{width:'50px'}}>Ordre</th>
                            <th style={{width:'100px'}}>Phase</th>
                            <th style={{width:'150px'}}>Epic</th>
                            <th style={{width:'150px'}}>User Story</th>
                            <th style={{width:'200px'}}>Description</th>
                            <th style={{width:'200px'}}>Détails</th>
                            {profils.map(profil => <th key={profil.id} style={{width:'100px'}}>{profil.name}</th>)}
                            <th style={{width:'120px'}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody ref={lineTableBodyRef}>
                          {lines.length === 0 ? (
                            <tr className="sortable-empty-row">
                              <td colSpan={8 + profils.length} className="text-center text-muted">
                                Aucune ligne pour le moment. Cliquez sur "Ajouter une ligne" pour commencer.
                              </td>
                            </tr>
                          ) : lines.map(line => (
                            <tr key={line.id}>
                              <td className="line-drag-handle" style={{cursor:'grab',userSelect:'none',textAlign:'center',color:'#aaa'}}>⋮⋮</td>
                              <td className="text-center">{line.order}</td>
                              <td>{getPhaseNameById(line.phaseId)}</td>
                              <td>{line.epic || "—"}</td>
                              <td>{line.userStory || "—"}</td>
                              <td>{line.description || "—"}</td>
                              <td>{line.resultat || "—"}</td>
                              {profils.map(profil => (
                                <td key={profil.id} className="text-center backlog-profil-cell"
                                  onClick={() => openLineProfilModal(line.id, profil.id)}
                                  style={{cursor:'pointer'}} title="Cliquez pour modifier le volume">
                                  {getLineProfilVolume(line.id, profil.id)}                                
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
                  </>
                )}
              </Tab>

              {/* ── TAB LOTS ET PHASES ── */}
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
                        <div className="text-muted py-3 text-center">Aucun lot pour le moment. Cliquez sur "Ajouter un lot" pour commencer.</div>
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
                                  {lot.phases.sort((a, b) => a.order - b.order).map(phase => (
                                    <div key={phase.id} className="phase-item" data-phase-id={phase.id}>
                                      <div className="phase-drag-handle">⋮⋮</div>
                                      <div className="phase-content">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <div>
                                            <span className="phase-toggle d-inline-flex align-items-center phase-clickable" onClick={() => togglePhase(phase.id)} style={{ cursor:'pointer', gap:'6px' }}>
                                              {expandedPhases.has(phase.id) ? <FaChevronDown /> : <FaChevronRight />}
                                              <span className="phase-order">{phase.order}.&nbsp;</span>
                                              <span className="phase-name">{phase.name}</span>
                                              <span className="badge bg-primary ms-2">{(deliverables.get(phase.id)?.length ?? 0)} livrable{(deliverables.get(phase.id)?.length ?? 0) > 1 ? 's' : ''}</span>
                                            </span>
                                          </div>
                                          <div className="phase-actions">
                                            <button className="btn btn-sm btn-success me-1" onClick={e => { e.stopPropagation(); openAddDeliverable(phase.id); }} title="Ajouter un livrable">
                                              <FaCalendar className="me-1" />Livrable
                                            </button>
                                            <button className="btn-icon" onClick={e => { e.stopPropagation(); openEditPhase(phase, lot.id); }} title="Modifier"><FaEdit /></button>
                                            <button className="btn-icon" onClick={e => { e.stopPropagation(); deletePhase(phase.id, lot.id); }} title="Supprimer"><FaTrash /></button>
                                          </div>
                                        </div>
                                        {expandedPhases.has(phase.id) && (
                                          <div className="deliverables-section mt-2 ms-4">
                                            {(deliverables.get(phase.id)?.length ?? 0) === 0 ? (
                                              <div className="text-muted small">Aucun livrable pour cette phase.</div>
                                            ) : (
                                              <div className="deliverables-list-sortable">
                                                {deliverables.get(phase.id)!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(deliverable => (
                                                  <div key={deliverable.id} className="deliverable-item">
                                                    <div className="deliverable-drag-handle">⋮⋮</div>
                                                    <div className="deliverable-content">
                                                      <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                          <strong>{deliverable.name}</strong>
                                                          {deliverable.description && <div className="text-muted small mt-1">{deliverable.description}</div>}
                                                        </div>
                                                        <div className="deliverable-actions">
                                                          <button className="btn-icon" onClick={e => { e.stopPropagation(); openEditDeliverable(deliverable, phase.id); }}><FaEdit /></button>
                                                          <button className="btn-icon" onClick={e => { e.stopPropagation(); deleteDeliverable(deliverable.id, phase.id); }}><FaTrash /></button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
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

              {/* ── TAB PROFILS ── */}
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
                        <div className="text-muted py-3 text-center">Aucun profil pour le moment. Cliquez sur "Ajouter un profil" pour commencer.</div>
                      ) : profils.map(profil => (
                        <div key={profil.id} className="backlog-item">
                          <div className="drag-handle-profil">⋮⋮</div>
                          <div className="backlog-content">
                            <div className="backlog-title"><span className="backlog-order">{profil.order}. </span>{profil.name}</div>
                            <div className="backlog-desc">{profil.desc || "—"}</div>
                            <div className="profil-tjm mt-2"><strong>TJM:</strong> {profil.tjm.toFixed(2)}</div>
                          </div>
                          <div className="backlog-actions">
                            <Button label="Modifier" variant="secondary" onClick={() => openEditProfil(profil)} />
                            <Button label="Supprimer" variant="outline" onClick={() => deleteProfil(profil.id)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Tab>

              {/* ── TAB PLANNING ── */}
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
                {/* PlanningTab n'est monté QUE quand planningReady = true          */}
                {/* → initialOverrides est déjà rempli au premier rendu du composant */}
                {planningReady ? (
                  <PlanningTab
                    lots={lots}
                    lines={lines}
                    lineProfils={lineProfils}
                    deliverables={deliverables}
                    selectedBacklogId={selectedBacklogId}
                    planningService={backlogPlanningService}
                    initialOverrides={planningOverrides}
                  />
                ) : (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Chargement du planning…
                  </div>
                )}
              </Tab>

              {/* ── TAB BUDGET ── */}
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

              {/* ── TAB CHARGES ANNEXES ── */}
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

      {/* ── SOUS-MODALS ── */}

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

      {/* Ligne */}
      <Modal show={showLineModal} onHide={() => !saving && setShowLineModal(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>{editingLine ? "Modifier la ligne" : "Ajouter une ligne"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Phase *</Form.Label>
              <Form.Select value={newLine.phaseId || ""} onChange={e => setNewLine({ ...newLine, phaseId: e.target.value ? parseInt(e.target.value) : null })} disabled={saving}>
                <option value="">Sélectionnez une phase</option>
                {getAllPhases().map(phase => <option key={phase.id} value={phase.id}>{phase.name}</option>)}
              </Form.Select>
            </Form.Group>
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
    </>
  );
};

export default BacklogModal;