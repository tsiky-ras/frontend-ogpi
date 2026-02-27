import React, { useCallback, useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";

import Button from "../../../../components/button/Button.tsx";
import {
  FaPlus, FaSpinner, FaEdit, FaTrash, FaCalendar,
  FaChevronDown, FaChevronRight, FaUsers, FaColumns,
} from "react-icons/fa";
import { Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";

// ── Services (URLs corrigées pour correspondre aux controllers Spring) ──────
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

// ── Types ─────────────────────────────────────────────────────────────────
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
import BacklogForm  from "../../gestion-lead/backlog/BacklogForm.tsx";
import PlanningTab  from "../../gestion-lead/backlog/PlanningTab.tsx";
import BudgetTab    from "../../gestion-lead/backlog/BudgetTab.tsx";

// ─────────────────────────────────────────────────────────────────────────

interface BacklogProjetModalProps {
  show: boolean;
  onClose: () => void;
  projetId: number;
  projetNom?: string;
}

/** Profil enrichi avec collaborateurs hydratés depuis profilsProjet */
interface ProfilFull extends BacklogProjetProfil {
  collaborateurs: any[];
}

// ─────────────────────────────────────────────────────────────────────────
const BacklogProjetModal: React.FC<BacklogProjetModalProps> = ({
  show, onClose, projetId, projetNom,
}) => {
  const { api } = useAuth();
  const collaborateurService = useProfilService();
  const svc = useRef({
    backlog : new BacklogProjetService(api),
    lot : new BacklogProjetLotService(api),
    phase : new BacklogProjetPhaseService(api),
    profil : new BacklogProjetProfilService(api),
    line : new BacklogProjetLineService(api),
    lineProfil : new BacklogProjetLineProfilService(api),
    column : new BacklogProjetColumnService(api),
    planning : new BacklogPlanningService(api),
  }).current;

  // ── État principal ────────────────────────────────────────────────────
  const [backlog,     setBacklog]     = useState<Backlog | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  // ── Données hydratées depuis /full ────────────────────────────────────
  const [lots,        setLots]        = useState<BacklogLot[]>([]);
  const [profils,     setProfils]     = useState<ProfilFull[]>([]);
  const [lines,       setLines]       = useState<BacklogLine[]>([]);
  const [lineProfils, setLineProfils] = useState<BacklogProjetLineProfil[]>([]);

  const [sprints,      setSprints]      = useState<Map<number, BacklogSprint[]>>(new Map());
  const [deliverables, setDeliverables] = useState<Map<number, BacklogDelivrableProjet[]>>(new Map());
  const [columns,      setColumns]      = useState<Map<number, BacklogColumn[]>>(new Map());
  const [colValues,    setColValues]    = useState<Map<number, BacklogLineColumnValue[]>>(new Map());
  const [allCollabs,   setAllCollabs]   = useState<any[]>([]);
  const [fCollabId, setFCollabId] = useState<number | null>(null);
  // ── UI ─────────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState("backlog");
  const [expandedPhases,  setExpandedPhases]  = useState<Set<number>>(new Set());
  const [expandedSprints, setExpandedSprints] = useState<Map<number, Set<number>>>(new Map());
  const deviseAbr = "€";

  // ── Modals ────────────────────────────────────────────────────────────
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

  // ── Entités en édition ─────────────────────────────────────────────────
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

  // ── IDs contexte ───────────────────────────────────────────────────────
  const [ctxLotId,    setCtxLotId]    = useState<number | null>(null);
  const [ctxPhaseId,  setCtxPhaseId]  = useState<number | null>(null);
  const [ctxSprintId, setCtxSprintId] = useState<number | null>(null);
  const [ctxLineId,   setCtxLineId]   = useState<number | null>(null);
  const [ctxProfilId, setCtxProfilId] = useState<number | null>(null);
  const currentProfil = profils.find(p => p.id === ctxProfilId) ?? null;

  // ── Formulaires ────────────────────────────────────────────────────────
  const [fLot,       setFLot]       = useState({ name: "", desc: "" });
  const [fPhase,     setFPhase]     = useState({ name: "" });
  const [fSprint,    setFSprint]    = useState({ name: "", startDate: "", endDate: "" });
  const [fDeliv,     setFDeliv]     = useState({ name: "", description: "", deliveryDate: "", sprintId: null as number | null });
  const [fProfil,    setFProfil]    = useState({ name: "", desc: "", tjm: 0 });
  const [fCollabIds, setFCollabIds] = useState<number[]>([]);
  const [fLine,      setFLine]      = useState({ epic: "", userStory: "", description: "", resultat: "", phaseId: null as number | null });
  const [fVolume,    setFVolume]    = useState(0);
  const [fCol,       setFCol]       = useState({ name: "", type: "TEXT" as BacklogColumnType });
  const [fCellVal,   setFCellVal]   = useState("");

  // ── Refs SortableJS ────────────────────────────────────────────────────
  const lineBodyRef    = useRef<HTMLTableSectionElement | null>(null);
  const lotsRef        = useRef<HTMLDivElement | null>(null);
  const profilsRef     = useRef<HTMLDivElement | null>(null);
  const lineSortable   = useRef<Sortable | null>(null);
  const lotSortable    = useRef<Sortable | null>(null);
  const profilSortable = useRef<Sortable | null>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // CHARGEMENT
  // Route utilisée : GET /api/projet/backlogs/projet/{projetId}/full
  // ═══════════════════════════════════════════════════════════════════════

  const hydrateFromFull = useCallback((full: any) => {
    setBacklog(full);

    const sortedLots: BacklogLot[] = (full.lots ?? []).sort(
      (a: any, b: any) => a.order - b.order
    );
    setLots(sortedLots);

    const spMap  = new Map<number, BacklogSprint[]>();
    const dlvMap = new Map<number, BacklogDelivrableProjet[]>();
    for (const lot of sortedLots) {
      for (const phase of (lot.phases ?? []) as any[]) {
        spMap.set(phase.id,  (phase.sprints      ?? []).sort((a: any, b: any) => a.order - b.order));
        dlvMap.set(phase.id, (phase.deliverables ?? []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
      }
    }
    setSprints(spMap);
    setDeliverables(dlvMap);

    // profilsProjet contient les collaborateurs[]
    const rawProfils: any[] = full.profilsProjet ?? full.profils ?? [];
    setProfils(
      rawProfils
        .sort((a: any, b: any) => a.order - b.order)
        .map((p: any) => ({ ...p, collaborateurs: p.collaborateurs ?? [] }))
    );

    setLines(
      (full.lines ?? []).sort((a: any, b: any) => a.order - b.order)
    );
  }, []);

  const loadColumnsAndValues = useCallback(async (full: any) => {
    const allSprints: any[] = (full.lots ?? [])
      .flatMap((l: any) => l.phases ?? [])
      .flatMap((p: any) => p.sprints ?? []);
    const allLines: any[] = full.lines ?? [];

    const colMap = new Map<number, BacklogColumn[]>();
    const valMap = new Map<number, BacklogLineColumnValue[]>();

    await Promise.all([
      ...allSprints.map(async (s: any) => {
        if (s.columns && Array.isArray(s.columns)) {
          colMap.set(s.id, s.columns);
        } else {
          try {
            const cols = await svc.column.getColumnsBySprintId(s.id);
            colMap.set(s.id, cols);
          } catch { colMap.set(s.id, []); }
        }
      }),
      ...allLines.map(async (l: any) => {
        try {
          const vals = await svc.column.getValuesByLineId(l.id);
          valMap.set(l.id, vals);
        } catch { valMap.set(l.id, []); }
      }),
    ]);

    setColumns(colMap);
    setColValues(valMap);
  }, []);

  const loadLineProfils = useCallback(async (backlogId: number) => {
    try {
      const lp = await svc.lineProfil.getAllByBacklogId(backlogId);
      setLineProfils(lp);
    } catch { setLineProfils([]); }
  }, []);

  const loadAllCollabs = useCallback(async () => {
    try {
      const data = await collaborateurService.getAll(); 
      setAllCollabs(Array.isArray(data) ? data : []);
    } catch { setAllCollabs([]); }
  }, [collaborateurService]);

  const loadFull = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const full = await svc.backlog.getFullByProjetId(projetId);
      console.log("🟢 Réponse API:", full);
      if (!full) {
        setShowCreate(true);
        return;
      }
      hydrateFromFull(full);
      await Promise.all([
        loadLineProfils(full.id),
        loadColumnsAndValues(full),
        loadAllCollabs(),
      ]);
    } catch (err) {
      setError("Impossible de charger le backlog.");
    } finally {
      setLoading(false);
    }
  }, [projetId]);

  const reload = useCallback(async () => {
    if (!backlog?.id) { await loadFull(); return; }
    setLoading(true);
    try {
      const full = await svc.backlog.getFullByProjetId(projetId);
      if (full) {
        hydrateFromFull(full);
        await Promise.all([loadLineProfils(full.id), loadColumnsAndValues(full)]);
      }
    } catch { setError("Impossible de recharger les données."); }
    finally { setLoading(false); }
  }, [projetId, backlog?.id]);

  useEffect(() => {
    if (!show || !projetId) return;
    setBacklog(null); setLots([]); setProfils([]); setLines([]);
    setLineProfils([]); setSprints(new Map()); setDeliverables(new Map());
    setColumns(new Map()); setColValues(new Map()); setAllCollabs([]);
    setError(null); setShowCreate(false); setActiveTab("backlog");
    setExpandedPhases(new Set()); setExpandedSprints(new Map());
    loadFull();
  }, [show, projetId]);

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  const getAllPhases = (): BacklogPhase[] =>
    lots.flatMap(l => (l.phases ?? []) as BacklogPhase[]);

  const getLotByPhaseId = (phaseId: number | null): BacklogLot | undefined =>
    lots.find(l => (l.phases ?? []).some((p: any) => p.id === phaseId));

  const getPhaseNameById = (id: number | null): string =>
    id ? getAllPhases().find(p => p.id === id)?.name ?? "—" : "—";

  const getVolume = (lineId: number, profilId: number): number =>
    lineProfils.find(lp => lp.lineId === lineId && (lp.profil as any)?.id === profilId)?.volume ?? 0;

  const togglePhase = (id: number) =>
    setExpandedPhases(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const toggleSprint = (phaseId: number, sprintId: number) =>
    setExpandedSprints(prev => {
      const m = new Map(prev);
      const s = new Set(m.get(phaseId) ?? []);
      s.has(sprintId) ? s.delete(sprintId) : s.add(sprintId);
      s.size ? m.set(phaseId, s) : m.delete(phaseId);
      return m;
    });

  // ═══════════════════════════════════════════════════════════════════════
  // CRÉATION BACKLOG
  // Route : POST /api/projet/backlogs/projet
  // ═══════════════════════════════════════════════════════════════════════

  const handleCreateBacklog = async (item: CreateBacklogForProjetRequest) => {
    setSaving(true);
    try {
      const created = await svc.backlog.createForProjet({ name: item.name, desc: item.desc, projetId });
      setBacklog(created);
      setShowCreate(false);
      await loadFull();
    } catch { setError("Impossible de créer le backlog."); }
    finally { setSaving(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // LOTS — /api/projet/backlog-lots
  // ═══════════════════════════════════════════════════════════════════════

  const openAddLot  = () => { setEditLot(null); setFLot({ name: "", desc: "" }); setShowLotModal(true); };
  const openEditLot = (lot: BacklogLot) => { setEditLot(lot); setFLot({ name: lot.name, desc: lot.desc ?? "" }); setShowLotModal(true); };

  const saveLot = async () => {
    if (!fLot.name.trim() || !backlog?.id) return;
    setSaving(true);
    try {
      if (editLot) {
        const updated = await svc.lot.update(editLot.id, fLot);
        setLots(prev => prev.map(l => l.id === editLot.id ? { ...l, ...updated } : l));
      } else {
        const order = Math.max(0, ...lots.map(l => l.order)) + 1;
        const created = await svc.lot.create({ ...fLot, order, backlogId: backlog.id });
        setLots(prev => [...prev, { ...created, phases: [] }]);
      }
      setShowLotModal(false);
    } catch { alert("Erreur lors de la sauvegarde du lot."); }
    finally { setSaving(false); }
  };

  const deleteLot = async (id: number) => {
    if (!window.confirm("Supprimer ce lot et tout son contenu ?")) return;
    try {
      await svc.lot.delete(id);
      const updated = lots.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
      setLots(updated);
      if (updated.length) await svc.lot.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
    } catch { alert("Impossible de supprimer le lot."); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PHASES — /api/projet/backlog-phases
  // ═══════════════════════════════════════════════════════════════════════

  const openAddPhase  = (lotId: number) => { setCtxLotId(lotId); setEditPhase(null); setFPhase({ name: "" }); setShowPhaseModal(true); };
  const openEditPhase = (p: BacklogPhase, lotId: number) => { setCtxLotId(lotId); setEditPhase(p); setFPhase({ name: p.name }); setShowPhaseModal(true); };

  const savePhase = async () => {
    if (!fPhase.name.trim() || ctxLotId === null) return;
    setSaving(true);
    try {
      if (editPhase) {
        const updated = await svc.phase.update(editPhase.id, { name: fPhase.name });
        setLots(prev => prev.map(l => l.id !== ctxLotId ? l : {
          ...l,
          phases: (l.phases ?? []).map((p: any) => p.id === editPhase.id ? { ...p, ...updated } : p),
        }));
      } else {
        const lot = lots.find(l => l.id === ctxLotId);
        const order = Math.max(0, ...((lot?.phases ?? []) as any[]).map(p => p.order)) + 1;
        const created = await svc.phase.create({ name: fPhase.name, order, lotId: ctxLotId });
        setLots(prev => prev.map(l => l.id !== ctxLotId ? l : {
          ...l,
          phases: [...(l.phases ?? []), { ...created, sprints: [], deliverables: [] }],
        }));
        setSprints(prev => new Map(prev).set(created.id, []));
        setDeliverables(prev => new Map(prev).set(created.id, []));
      }
      setShowPhaseModal(false);
    } catch { alert("Erreur lors de la sauvegarde de la phase."); }
    finally { setSaving(false); setCtxLotId(null); }
  };

  const deletePhase = async (phaseId: number, lotId: number) => {
    if (!window.confirm("Supprimer cette phase et tout son contenu ?")) return;
    try {
      await svc.phase.delete(phaseId);
      setLots(prev => prev.map(l => l.id !== lotId ? l : {
        ...l,
        phases: (l.phases ?? []).filter((p: any) => p.id !== phaseId).map((p: any, i: number) => ({ ...p, order: i + 1 })),
      }));
      setSprints(prev => { const m = new Map(prev); m.delete(phaseId); return m; });
      setDeliverables(prev => { const m = new Map(prev); m.delete(phaseId); return m; });
    } catch { alert("Impossible de supprimer la phase."); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SPRINTS — POST /api/projet/backlog-phases/{phaseId}/sprints
  //           PUT  /api/projet/backlog-phases/sprints/{id}
  //           DEL  /api/projet/backlog-phases/sprints/{id}
  // ═══════════════════════════════════════════════════════════════════════

  const openAddSprint  = (phaseId: number) => { setCtxPhaseId(phaseId); setEditSprint(null); setFSprint({ name: "", startDate: "", endDate: "" }); setShowSprintModal(true); };
  const openEditSprint = (s: BacklogSprint, phaseId: number) => { setCtxPhaseId(phaseId); setEditSprint(s); setFSprint({ name: s.name, startDate: s.dateDebut ?? "", endDate: s.dateFin ?? "" }); setShowSprintModal(true); };

  const saveSprint = async () => {
    if (!fSprint.name.trim() || ctxPhaseId === null) return;
    setSaving(true);
    try {
      const existing = sprints.get(ctxPhaseId) ?? [];
      if (editSprint) {
        const updated = await svc.phase.updateSprint(editSprint.id, {
          name: fSprint.name, startDate: fSprint.startDate, endDate: fSprint.endDate,
        });
        setSprints(prev => new Map(prev).set(ctxPhaseId, existing.map(s => s.id === editSprint.id ? { ...s, ...updated } : s)));
      } else {
        const order = Math.max(0, ...existing.map(s => s.order)) + 1;
        const created = await svc.phase.createSprint({
          name: fSprint.name, order, phaseId: ctxPhaseId,
          startDate: fSprint.startDate, endDate: fSprint.endDate,
        });
        setSprints(prev => new Map(prev).set(ctxPhaseId, [...existing, created]));
        setColumns(prev => new Map(prev).set(created.id, []));
      }
      setShowSprintModal(false);
    } catch { alert("Erreur lors de la sauvegarde du sprint."); }
    finally { setSaving(false); setCtxPhaseId(null); }
  };

  const deleteSprint = async (sprintId: number, phaseId: number) => {
    if (!window.confirm("Supprimer ce sprint ?")) return;
    try {
      await svc.phase.deleteSprint(sprintId);
      const updated = (sprints.get(phaseId) ?? []).filter(s => s.id !== sprintId).map((s, i) => ({ ...s, order: i + 1 }));
      setSprints(prev => new Map(prev).set(phaseId, updated));
      setDeliverables(prev => {
        const m = new Map(prev);
        const dl = (m.get(phaseId) ?? []).map(d => (d as any).sprintId === sprintId ? { ...d, sprintId: null } : d);
        m.set(phaseId, dl);
        return m;
      });
    } catch { alert("Impossible de supprimer le sprint."); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // LIVRABLES — POST /api/projet/backlog-phases/{phaseId}/livrables
  //             PUT  /api/projet/backlog-phases/livrables/{id}
  //             DEL  /api/projet/backlog-phases/livrables/{id}
  // ═══════════════════════════════════════════════════════════════════════

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
    } catch { alert("Erreur lors de la sauvegarde du livrable."); }
    finally { setSaving(false); setCtxPhaseId(null); }
  };

  const deleteDeliv = async (delivId: number, phaseId: number) => {
    if (!window.confirm("Supprimer ce livrable ?")) return;
    try {
      await svc.phase.deleteDeliverable(delivId);
      setDeliverables(prev => new Map(prev).set(phaseId, (deliverables.get(phaseId) ?? []).filter(d => d.id !== delivId)));
    } catch { alert("Impossible de supprimer le livrable."); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PROFILS — /api/projet/backlog-profils
  // ═══════════════════════════════════════════════════════════════════════

  const openAddProfil   = () => { setEditProfil(null); setFProfil({ name: "", desc: "", tjm: 0 }); setFCollabIds([]); setShowProfilModal(true); };
  const openEditProfil  = (p: ProfilFull) => { setEditProfil(p); setFProfil({ name: p.name, desc: p.desc ?? "", tjm: p.tjm }); setFCollabIds(p.collaborateurs.map((c: any) => c.id)); setShowProfilModal(true); };
  const openCollabModal = (p: ProfilFull) => { setCollabProfil(p); setFCollabIds(p.collaborateurs.map((c: any) => c.id)); setShowCollabModal(true); };

  const saveProfil = async () => {
    if (!fProfil.name.trim() || !backlog?.id) return;
    setSaving(true);
    try {
      if (editProfil) {
        await svc.profil.update(editProfil.id, fProfil);
        // PUT /api/projet/backlog-profils/{id}/collaborateurs
        await svc.profil.replaceCollaborateurs(editProfil.id, fCollabIds);
      } else {
        const order = Math.max(0, ...profils.map(p => p.order)) + 1;
        const created = await svc.profil.create({ ...fProfil, order, backlogId: backlog.id });
        if (fCollabIds.length) await svc.profil.replaceCollaborateurs(created.id, fCollabIds);
      }
      setShowProfilModal(false);
      await reload();
    } catch { alert("Erreur lors de la sauvegarde du profil."); }
    finally { setSaving(false); }
  };

  const saveCollabs = async () => {
    if (!collabProfil) return;
    setSaving(true);
    try {
      await svc.profil.replaceCollaborateurs(collabProfil.id, fCollabIds);
      setProfils(prev => prev.map(p => p.id !== collabProfil.id ? p : {
        ...p,
        collaborateurs: allCollabs.filter(c => fCollabIds.includes(c.id)),
      }));
      setShowCollabModal(false);
    } catch { alert("Erreur lors de la mise à jour des collaborateurs."); }
    finally { setSaving(false); setCollabProfil(null); }
  };

  const deleteProfil = async (id: number) => {
    if (!window.confirm("Supprimer ce profil ?")) return;
    try {
      await svc.profil.delete(id);
      const updated = profils.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
      setProfils(updated);
      if (updated.length) await svc.profil.updateOrder(updated.map(p => ({ id: p.id, order: p.order })));
    } catch { alert("Impossible de supprimer le profil."); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // LIGNES — /api/projet/backlog-lines
  // ═══════════════════════════════════════════════════════════════════════

  const openAddLine  = () => { setEditLine(null); setFLine({ epic: "", userStory: "", description: "", resultat: "", phaseId: null }); setShowLineModal(true); };
  const openEditLine = (l: BacklogLine) => { setEditLine(l); setFLine({ epic: l.epic ?? "", userStory: l.userStory ?? "", description: l.description ?? "", resultat: l.resultat ?? "", phaseId: (l as any).phaseId ?? null }); setShowLineModal(true); };

  const saveLine = async () => {
    if (!fLine.phaseId) { alert("Veuillez sélectionner une phase."); return; }
    setSaving(true);
    try {
      if (editLine) {
        const updated = await svc.line.update(editLine.id, { ...fLine, phaseId: fLine.phaseId!, order: editLine.order });
        setLines(prev => prev.map(l => l.id === editLine.id ? { ...l, ...updated } : l));
      } else {
        const order = Math.max(0, ...lines.map(l => l.order)) + 1;
        const created = await svc.line.create({ ...fLine, phaseId: fLine.phaseId!, order });
        setLines(prev => [...prev, created]);
        setColValues(prev => new Map(prev).set(created.id, []));
      }
      setShowLineModal(false);
    } catch { alert("Erreur lors de la sauvegarde de la ligne."); }
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
      // PATCH /api/projet/backlog-lines/{id}/order (en batch via le service)
      if (updated.length) await svc.line.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
    } catch { alert("Impossible de supprimer la ligne."); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // VOLUMES — /api/projet/backlog-line-profils
  // ═══════════════════════════════════════════════════════════════════════

  const openVolModal = (lineId: number, profilId: number) => {
    setCtxLineId(lineId);
    setCtxProfilId(profilId);
    const existing = lineProfils.find(
      lp => lp.lineId === lineId && (lp.profil as any)?.id === profilId
    );
    setEditLineProfil(existing ?? null);
    setFVolume(existing?.volume ?? 0);
    setFCollabId((existing as any)?.collaborateur?.id ?? null); // ← ajout
    setShowVolModal(true);
  };

  const saveVolume = async () => {
    if (ctxLineId === null || ctxProfilId === null) return;
    setSaving(true);
    try {
      if (editLineProfil) {
        const updated = await svc.lineProfil.update(editLineProfil.id, {
          volume: fVolume,
          lineId: ctxLineId,
          profilId: ctxProfilId,
          collaborateurId: fCollabId, // ← ajout
        });
        setLineProfils(prev => prev.map(lp => lp.id === editLineProfil.id ? updated : lp));
      } else {
        const created = await svc.lineProfil.create({
          volume: fVolume,
          lineId: ctxLineId,
          profilId: ctxProfilId,
          collaborateurId: fCollabId, // ← ajout
        });
        setLineProfils(prev => [...prev, created]);
      }
      setShowVolModal(false);
    } catch { alert("Erreur lors de la sauvegarde du volume."); }
    finally { setSaving(false); setCtxLineId(null); setCtxProfilId(null); }
  };

  const deleteVolume = async () => {
    if (!editLineProfil || !window.confirm("Supprimer ce volume ?")) return;
    try {
      await svc.lineProfil.delete(editLineProfil.id);
      setLineProfils(prev => prev.filter(lp => lp.id !== editLineProfil.id));
      setShowVolModal(false);
    } catch { alert("Impossible de supprimer le volume."); }
    finally { setCtxLineId(null); setCtxProfilId(null); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // COLONNES — /api/projet/backlog-columns
  // ═══════════════════════════════════════════════════════════════════════

  const openAddCol  = (sprintId: number) => { setCtxSprintId(sprintId); setEditCol(null); setFCol({ name: "", type: "TEXT" }); setShowColModal(true); };
  const openEditCol = (col: BacklogColumn) => { setCtxSprintId(col.sprintId); setEditCol(col); setFCol({ name: col.name, type: col.type }); setShowColModal(true); };

  const deleteColumn = async (col: BacklogColumn) => {
    if (!window.confirm("Supprimer cette colonne ?")) return;
    try {
      await svc.column.deleteColumn(col.id);
      setColumns(prev => new Map(prev).set(col.sprintId, (prev.get(col.sprintId) ?? []).filter(c => c.id !== col.id)));
    } catch { alert("Impossible de supprimer la colonne."); }
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
      // PUT /api/projet/backlog-columns/values
      const saved = await svc.column.upsertValue({ value: fCellVal, lineId: editCell.lineId, columnId: editCell.columnId });
      setColValues(prev => {
        const m = new Map(prev);
        const vals = (m.get(editCell.lineId) ?? []).filter(v => (v.column as any)?.id !== editCell.columnId);
        m.set(editCell.lineId, [...vals, saved]);
        return m;
      });
      setShowCellModal(false);
    } catch { alert("Erreur lors de la sauvegarde de la valeur."); }
    finally { setSaving(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SORTABLE
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!show || !lines.length || !lineBodyRef.current) return;
    lineSortable.current?.destroy();
    lineSortable.current = Sortable.create(lineBodyRef.current, {
      animation: 150, handle: ".drag-line", ghostClass: "sortable-ghost", filter: ".empty-row",
      onEnd: async ({ oldIndex, newIndex }) => {
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
        const next = [...lines];
        const [m] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, m);
        const reordered = next.map((l, i) => ({ ...l, order: i + 1 }));
        setLines(reordered);
        // PATCH /api/projet/backlog-lines/{id}/order (en batch)
        try { await svc.line.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); } catch {}
      },
    });
    return () => lineSortable.current?.destroy();
  }, [lines, show]);

  useEffect(() => {
    if (!show || !lots.length || !lotsRef.current) return;
    lotSortable.current?.destroy();
    lotSortable.current = Sortable.create(lotsRef.current, {
      animation: 150, handle: ".drag-lot", ghostClass: "sortable-ghost",
      onEnd: async ({ oldIndex, newIndex }) => {
        if (oldIndex === undefined || newIndex === undefined) return;
        const next = [...lots];
        const [m] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, m);
        const reordered = next.map((l, i) => ({ ...l, order: i + 1 }));
        setLots(reordered);
        // PATCH /api/projet/backlog-lots/reorder
        try { await svc.lot.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); } catch {}
      },
    });
    return () => lotSortable.current?.destroy();
  }, [lots, show]);

  useEffect(() => {
    if (!show || !profils.length || !profilsRef.current) return;
    profilSortable.current?.destroy();
    profilSortable.current = Sortable.create(profilsRef.current, {
      animation: 150, handle: ".drag-profil", ghostClass: "sortable-ghost",
      onEnd: async ({ oldIndex, newIndex }) => {
        if (oldIndex === undefined || newIndex === undefined) return;
        const next = [...profils];
        const [m] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, m);
        const reordered = next.map((p, i) => ({ ...p, order: i + 1 }));
        setProfils(reordered);
        // PUT /api/projet/backlog-profils/{id} unitaire via updateOrder
        try { await svc.profil.updateOrder(reordered.map(p => ({ id: p.id, order: p.order }))); } catch {}
      },
    });
    return () => profilSortable.current?.destroy();
  }, [profils, show]);

  // ═══════════════════════════════════════════════════════════════════════
  // TOTAUX
  // ═══════════════════════════════════════════════════════════════════════

  const profilTotals = profils.map(p => {
    const vol = lineProfils.filter(lp => (lp.profil as any)?.id === p.id).reduce((s, lp) => s + lp.volume, 0);
    return { profil: p, vol, amount: vol * p.tjm };
  });
  const grandTotalVol = profilTotals.reduce((s, t) => s + t.vol, 0);
  const grandTotalAmt = profilTotals.reduce((s, t) => s + t.amount, 0);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDU — Écran de création si pas de backlog existant
  // ═══════════════════════════════════════════════════════════════════════

  if (showCreate) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer le backlog — {projetNom}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BacklogForm
            show={showCreate}
            onClose={() => { setShowCreate(false); onClose(); }}
            onSubmit={handleCreateBacklog as any}
            projetId={projetId}
          />
        </Modal.Body>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <>
      <Modal show={show} onHide={onClose} size="xl" fullscreen>
        <Modal.Header closeButton>
          <Modal.Title>Backlog — {projetNom ?? `Projet #${projetId}`}</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: "#f8f9fa" }}>
          <div className="container-fluid">
            {error && (
              <Alert variant="danger" onClose={() => setError(null)} dismissible>
                {error}
              </Alert>
            )}
            {loading && (
              <div className="text-center py-5">
                <FaSpinner className="fa-spin me-2" size={24} />
                <span>Chargement du backlog…</span>
              </div>
            )}

            {!loading && (
              <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k ?? "backlog")} className="mb-4">

                {/* ══════════ TAB BACKLOG ══════════════════════════════ */}
                <Tab eventKey="backlog" title="Backlog">
                  <div className="d-flex justify-content-end mb-3">
                    <Button label="Ajouter une ligne" icon={<FaPlus />} onClick={openAddLine} />
                  </div>

                  {/* Récap profils */}
                  <div className="card shadow-sm mb-4">
                    <div className="card-header fw-bold">Récapitulatif par profil</div>
                    <div className="card-body p-0">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Profil</th>
                            <th className="text-end">Volume JH</th>
                            <th className="text-end">TJM</th>
                            <th className="text-end">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profilTotals.map(({ profil, vol, amount }) => (
                            <tr key={profil.id}>
                              <td>
                                <strong>{profil.name}</strong>
                                {profil.desc && <small className="text-muted ms-2">{profil.desc}</small>}
                              </td>
                              <td className="text-end">{vol.toFixed(2)}</td>
                              <td className="text-end">{profil.tjm.toFixed(2)} {deviseAbr}</td>
                              <td className="text-end fw-bold">{amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-active">
                          <tr>
                            <td><strong>TOTAL</strong></td>
                            <td className="text-end fw-bold">{grandTotalVol.toFixed(2)}</td>
                            <td />
                            <td className="text-end fw-bold text-primary">{grandTotalAmt.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Tableau des lignes */}
                  <div className="table-responsive shadow-sm rounded">
                    <table className="table table-bordered table-hover align-middle mb-0">
                      <thead className="table-dark">
                        <tr>
                          <th style={{ width: 32 }} />
                          <th style={{ width: 40 }}>#</th>
                          <th>Lot / Phase</th>
                          <th>Epic</th>
                          <th>User Story</th>
                          <th>Description</th>
                          <th>Détails</th>
                            {profils.map((p) => (
                              <th
                                key={p.id}
                                className="text-center"
                                style={{ minWidth: 140 }}
                              >
                                <div className="fw-bold">{p.name}</div>

                                {p.collaborateurs.length > 0 && (
                                  <div className="mt-1" style={{ fontSize: "0.75rem", lineHeight: "1.1" }}>
                                    {p.collaborateurs.map((c: any, index: number) => (
                                      <div key={index}>
                                        {c.nom} {c.prenom}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </th>
                            ))}
                          <th style={{ width: 90 }} />
                        </tr>
                      </thead>
                      <tbody ref={lineBodyRef}>
                        {lines.length === 0
                          ? (
                            <tr className="empty-row">
                              <td colSpan={8 + profils.length} className="text-center text-muted fst-italic py-4">
                                Aucune ligne — cliquez sur « Ajouter une ligne »
                              </td>
                            </tr>
                          )
                          : lines.map(line => {
                              const lot       = getLotByPhaseId((line as any).phaseId);
                              const phaseName = getPhaseNameById((line as any).phaseId);
                              return (
                                <tr key={line.id}>
                                  <td className="drag-line text-center text-muted" style={{ cursor: "grab" }}>⋮⋮</td>
                                  <td className="text-center text-muted">{line.order}</td>
                                  <td className="text-nowrap">
                                    <small className="text-muted">{lot?.name ?? "—"}</small>
                                    <br />
                                    <span>{phaseName}</span>
                                  </td>
                                  <td>{line.epic ?? "—"}</td>
                                  <td>{line.userStory ?? "—"}</td>
                                  <td>{line.description ?? "—"}</td>
                                  <td>{line.resultat ?? "—"}</td>
                                  {profils.map(p => {
                                    const vol = getVolume(line.id, p.id);
                                    return (
                                      <td
                                        key={p.id}
                                        className="text-center"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => openVolModal(line.id, p.id)}
                                      >
                                        {vol > 0
                                          ? <span className="badge bg-primary">{vol}</span>
                                          : <span className="text-muted">—</span>}
                                      </td>
                                    );
                                  })}
                                  <td>
                                    <div className="d-flex gap-1 justify-content-center">
                                      <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLine(line)}><FaEdit /></button>
                                      <button className="btn btn-sm btn-outline-danger"    onClick={() => deleteLine(line.id)}><FaTrash /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                      </tbody>
                    </table>
                  </div>
                </Tab>

                {/* ══════════ TAB LOTS & PHASES ════════════════════════ */}
                <Tab eventKey="lots" title="Lots & Phases">
                  <div className="d-flex justify-content-end mb-3">
                    <Button label="Ajouter un lot" icon={<FaPlus />} onClick={openAddLot} />
                  </div>
                  <div ref={lotsRef}>
                    {lots.length === 0
                      ? <div className="text-center text-muted py-4 fst-italic">Aucun lot. Cliquez sur « Ajouter un lot ».</div>
                      : lots.map(lot => (
                        <div key={lot.id} className="card mb-3 shadow-sm">
                          <div className="card-header d-flex align-items-center gap-2">
                            <span className="drag-lot text-muted" style={{ cursor: "grab" }}>⋮⋮</span>
                            <strong className="flex-grow-1">{lot.order}. {lot.name}</strong>
                            {lot.desc && <small className="text-muted me-2">{lot.desc}</small>}
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLot(lot)}><FaEdit /></button>
                            <button className="btn btn-sm btn-outline-danger ms-1" onClick={() => deleteLot(lot.id)}><FaTrash /></button>
                          </div>
                          <div className="card-body pt-2 pb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-muted small fw-semibold">Phases</span>
                              <Button label="+ Phase" variant="secondary" onClick={() => openAddPhase(lot.id)} />
                            </div>
                            {((lot.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(phase => {
                              const phaseSprints = sprints.get(phase.id) ?? [];
                              const phaseDeliv   = deliverables.get(phase.id) ?? [];
                              const expanded     = expandedPhases.has(phase.id);
                              return (
                                <div key={phase.id} className="border rounded mb-2 p-0" style={{ backgroundColor: "#f5f7fa" }}>
                                  <div className="d-flex align-items-center gap-2 p-2">
                                    <span style={{ cursor: "pointer" }} onClick={() => togglePhase(phase.id)}>
                                      {expanded ? <FaChevronDown /> : <FaChevronRight />}
                                    </span>
                                    <span className="fw-semibold flex-grow-1" style={{ cursor: "pointer" }} onClick={() => togglePhase(phase.id)}>
                                      {phase.order}. {phase.name}
                                    </span>
                                    <span className="badge bg-primary">{phaseSprints.length} sprint{phaseSprints.length !== 1 ? "s" : ""}</span>
                                    <span className="badge bg-success">{phaseDeliv.length} livrable{phaseDeliv.length !== 1 ? "s" : ""}</span>
                                    <button className="btn btn-sm btn-warning"               onClick={() => openAddSprint(phase.id)}><FaCalendar className="me-1" />Sprint</button>
                                    <button className="btn btn-sm btn-success ms-1"          onClick={() => openAddDeliv(phase.id)}><FaCalendar className="me-1" />Livrable</button>
                                    <button className="btn btn-sm btn-outline-secondary ms-1" onClick={() => openEditPhase(phase, lot.id)}><FaEdit /></button>
                                    <button className="btn btn-sm btn-outline-danger ms-1"   onClick={() => deletePhase(phase.id, lot.id)}><FaTrash /></button>
                                  </div>

                                  {expanded && (
                                    <div className="px-3 pb-2">
                                      {phaseSprints.map(sprint => {
                                        const sprintCols  = columns.get(sprint.id) ?? [];
                                        const sprintDeliv = phaseDeliv.filter(d => (d as any).sprintId === sprint.id);
                                        const spExpanded  = expandedSprints.get(phase.id)?.has(sprint.id) ?? false;
                                        return (
                                          <div key={sprint.id} className="border rounded p-2 mb-2" style={{ backgroundColor: "#fffbea" }}>
                                            <div className="d-flex align-items-center gap-2">
                                              <span className="text-muted" style={{ cursor: "grab" }}>⋮⋮</span>
                                              <strong className="flex-grow-1">Sprint {sprint.order} : {sprint.name}</strong>
                                              {sprint.dateDebut && sprint.dateFin && (
                                                <small className="text-muted">
                                                  {new Date(sprint.dateDebut).toLocaleDateString("fr-FR")} → {new Date(sprint.dateFin).toLocaleDateString("fr-FR")}
                                                </small>
                                              )}
                                              <button className="btn btn-sm btn-outline-secondary ms-1" onClick={() => toggleSprint(phase.id, sprint.id)}>
                                                {spExpanded ? <FaChevronDown /> : <FaChevronRight />}
                                              </button>
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
                                                    <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-1 small">
                                                      <span>
                                                        <strong>{d.name}</strong>
                                                        {(d as any).deliveryDate && ` — ${new Date((d as any).deliveryDate).toLocaleDateString("fr-FR")}`}
                                                      </span>
                                                      <div className="d-flex gap-1">
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

                                      {/* Livrables hors sprint */}
                                      {phaseDeliv.filter(d => !(d as any).sprintId).map(d => (
                                        <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-1 small ps-1">
                                          <span>
                                            📦 <strong>{d.name}</strong>
                                            {(d as any).deliveryDate && ` — ${new Date((d as any).deliveryDate).toLocaleDateString("fr-FR")}`}
                                          </span>
                                          <div className="d-flex gap-1">
                                            <button className="btn btn-link btn-sm p-0" onClick={() => openEditDeliv(d, phase.id)}><FaEdit /></button>
                                            <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteDeliv(d.id!, phase.id)}><FaTrash /></button>
                                          </div>
                                        </div>
                                      ))}

                                      {phaseSprints.length === 0 && phaseDeliv.length === 0 && (
                                        <div className="text-muted small fst-italic py-1">Aucun sprint ni livrable.</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </Tab>

                {/* ══════════ TAB PROFILS ══════════════════════════════ */}
                <Tab eventKey="profils" title="Profils">
                  <div className="d-flex justify-content-end mb-3">
                    <Button label="Ajouter un profil" icon={<FaPlus />} onClick={openAddProfil} />
                  </div>
                  <div ref={profilsRef}>
                    {profils.length === 0
                      ? <div className="text-center text-muted py-4 fst-italic">Aucun profil. Cliquez sur « Ajouter un profil ».</div>
                      : profils.map(profil => (
                        <div key={profil.id} className="card mb-2 shadow-sm">
                          <div className="card-body d-flex align-items-start gap-3 py-2">
                            <span className="drag-profil text-muted mt-1" style={{ cursor: "grab" }}>⋮⋮</span>
                            <div className="flex-grow-1">
                              <div className="fw-bold">{profil.order}. {profil.name}</div>
                              {profil.desc && <small className="text-muted">{profil.desc}</small>}
                              <div className="mt-1">
                                <span className="badge bg-warning text-dark">TJM : {profil.tjm.toFixed(0)} {deviseAbr}/j</span>
                              </div>
                              {profil.collaborateurs.length > 0 && (
                                <div className="mt-2 d-flex flex-wrap gap-1">
                                  {profil.collaborateurs.map((c: any) => (
                                    <span key={c.id} className="badge bg-info text-dark">
                                      {c.nom} {c.prenom}
                                      {c.appellation && <em className="ms-1 opacity-75">({c.appellation})</em>}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                              <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1" onClick={() => openCollabModal(profil)}>
                                <FaUsers /><span className="d-none d-md-inline">Collaborateurs</span>
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditProfil(profil)}><FaEdit /></button>
                              <button className="btn btn-sm btn-outline-danger"    onClick={() => deleteProfil(profil.id)}><FaTrash /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </Tab>

                {/* ══════════ TAB PLANNING ═════════════════════════════ */}
                <Tab eventKey="planning" title="Planning">
                  <PlanningTab
                    lots={lots}
                    lines={lines}
                    lineProfils={lineProfils as any}
                    deliverables={deliverables as any}
                    selectedBacklogId={backlog?.id ?? null}
                    planningService={svc.planning}
                  />
                </Tab>

                {/* ══════════ TAB BUDGET ═══════════════════════════════ */}
                <Tab eventKey="budget" title="Budget">
                  <BudgetTab
                    lots={lots}
                    profils={profils as any}
                    lines={lines}
                    lineProfils={lineProfils as any}
                    selectedBacklogId={backlog?.id ?? null}
                    deviseAbr={deviseAbr}
                  />
                </Tab>

              </Tabs>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button label="Fermer" variant="outline" onClick={onClose} />
        </Modal.Footer>
      </Modal>

      {/* ═══════════════════════ MODAUX ════════════════════════════════════ */}

      {/* LOT */}
      <Modal show={showLotModal} onHide={() => !saving && setShowLotModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editLot ? "Modifier le lot" : "Nouveau lot"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={fLot.name} onChange={e => setFLot(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={fLot.desc} onChange={e => setFLot(f => ({ ...f, desc: e.target.value }))} disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowLotModal(false)} />
          <Button label={saving ? "…" : editLot ? "Enregistrer" : "Créer"} onClick={saveLot} />
        </Modal.Footer>
      </Modal>

      {/* PHASE */}
      <Modal show={showPhaseModal} onHide={() => !saving && setShowPhaseModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editPhase ? "Modifier la phase" : "Nouvelle phase"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={fPhase.name} onChange={e => setFPhase({ name: e.target.value })} disabled={saving} autoFocus />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowPhaseModal(false)} />
          <Button label={saving ? "…" : editPhase ? "Enregistrer" : "Créer"} onClick={savePhase} />
        </Modal.Footer>
      </Modal>

      {/* SPRINT */}
      <Modal show={showSprintModal} onHide={() => !saving && setShowSprintModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editSprint ? "Modifier le sprint" : "Nouveau sprint"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={fSprint.name} onChange={e => setFSprint(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus />
            </Form.Group>
            <div className="row g-2">
              <div className="col">
                <Form.Group>
                  <Form.Label>Début</Form.Label>
                  <Form.Control type="date" value={fSprint.startDate} onChange={e => setFSprint(f => ({ ...f, startDate: e.target.value }))} disabled={saving} />
                </Form.Group>
              </div>
              <div className="col">
                <Form.Group>
                  <Form.Label>Fin</Form.Label>
                  <Form.Control type="date" value={fSprint.endDate} onChange={e => setFSprint(f => ({ ...f, endDate: e.target.value }))} disabled={saving} />
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowSprintModal(false)} />
          <Button label={saving ? "…" : editSprint ? "Enregistrer" : "Créer"} onClick={saveSprint} />
        </Modal.Footer>
      </Modal>

      {/* LIVRABLE */}
      <Modal show={showDelivModal} onHide={() => !saving && setShowDelivModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editDeliv ? "Modifier le livrable" : "Nouveau livrable"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={fDeliv.name} onChange={e => setFDeliv(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus />
            </Form.Group>
            {ctxPhaseId !== null && (
              <Form.Group className="mb-3">
                <Form.Label>Sprint associé</Form.Label>
                <Form.Select value={fDeliv.sprintId ?? ""} onChange={e => setFDeliv(f => ({ ...f, sprintId: e.target.value ? +e.target.value : null }))} disabled={saving}>
                  <option value="">Sans sprint</option>
                  {(sprints.get(ctxPhaseId) ?? []).map(s => (
                    <option key={s.id} value={s.id}>Sprint {s.order} — {s.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Date de livraison</Form.Label>
              <Form.Control type="date" value={fDeliv.deliveryDate} onChange={e => setFDeliv(f => ({ ...f, deliveryDate: e.target.value }))} disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={fDeliv.description} onChange={e => setFDeliv(f => ({ ...f, description: e.target.value }))} disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowDelivModal(false)} />
          <Button label={saving ? "…" : editDeliv ? "Enregistrer" : "Créer"} onClick={saveDeliv} />
        </Modal.Footer>
      </Modal>

      {/* PROFIL */}
      <Modal show={showProfilModal} onHide={() => !saving && setShowProfilModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editProfil ? "Modifier le profil" : "Nouveau profil"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control value={fProfil.name} onChange={e => setFProfil(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control value={fProfil.desc} onChange={e => setFProfil(f => ({ ...f, desc: e.target.value }))} disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>TJM ({deviseAbr}/jour) *</Form.Label>
              <Form.Control type="number" min="0" step="50" value={fProfil.tjm} onChange={e => setFProfil(f => ({ ...f, tjm: +e.target.value || 0 }))} disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowProfilModal(false)} />
          <Button label={saving ? "…" : editProfil ? "Enregistrer" : "Créer"} onClick={saveProfil} />
        </Modal.Footer>
      </Modal>

      {/* COLLABORATEURS */}
      <Modal show={showCollabModal} onHide={() => !saving && setShowCollabModal(false)} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title><FaUsers className="me-2" />Collaborateurs — {collabProfil?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-2">
            Cochez les collaborateurs correspondant à ce profil.
          </p>
          <div className="border rounded p-2" style={{ maxHeight: 360, overflowY: "auto" }}>
            {allCollabs.length === 0
              ? <div className="text-muted fst-italic small">Aucun collaborateur disponible.</div>
              : allCollabs.map((c: any) => (
                <Form.Check
                  key={c.id}
                  type="checkbox"
                  id={`collab-${c.id}`}
                  label={
                    <span>
                      <strong>{c.nom} {c.prenom}</strong>
                      {c.appellation && <span className="text-muted ms-1 small">({c.appellation})</span>}
                      {c.emailPro    && <span className="text-muted ms-2 small">{c.emailPro}</span>}
                    </span>
                  }
                  checked={fCollabIds.includes(c.id)}
                  onChange={e => setFCollabIds(prev =>
                    e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                  )}
                  className="mb-2"
                  disabled={saving}
                />
              ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowCollabModal(false)} />
          <Button label={saving ? "…" : "Enregistrer"} onClick={saveCollabs} />
        </Modal.Footer>
      </Modal>

      {/* LIGNE */}
      <Modal show={showLineModal} onHide={() => !saving && setShowLineModal(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>{editLine ? "Modifier la ligne" : "Nouvelle ligne"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Phase *</Form.Label>
              <Form.Select value={fLine.phaseId ?? ""} onChange={e => setFLine(f => ({ ...f, phaseId: e.target.value ? +e.target.value : null }))} disabled={saving}>
                <option value="">— Sélectionner une phase —</option>
                {lots.flatMap(lot =>
                  ((lot.phases ?? []) as BacklogPhase[]).map(p => (
                    <option key={p.id} value={p.id}>{lot.name} › {p.name}</option>
                  ))
                )}
              </Form.Select>
            </Form.Group>
            <div className="row g-2">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Epic</Form.Label>
                  <Form.Control value={fLine.epic} onChange={e => setFLine(f => ({ ...f, epic: e.target.value }))} disabled={saving} />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>User Story</Form.Label>
                  <Form.Control value={fLine.userStory} onChange={e => setFLine(f => ({ ...f, userStory: e.target.value }))} disabled={saving} />
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mb-3 mt-2">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={fLine.description} onChange={e => setFLine(f => ({ ...f, description: e.target.value }))} disabled={saving} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Détails / Résultat attendu</Form.Label>
              <Form.Control as="textarea" rows={2} value={fLine.resultat} onChange={e => setFLine(f => ({ ...f, resultat: e.target.value }))} disabled={saving} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button label="Annuler" variant="outline" onClick={() => setShowLineModal(false)} />
          <Button label={saving ? "…" : editLine ? "Enregistrer" : "Créer"} onClick={saveLine} />
        </Modal.Footer>
      </Modal>

      {/* VOLUME JH */}
      <Modal show={showVolModal} onHide={() => !saving && setShowVolModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Volume JH — {currentProfil?.name ?? "Profil"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Jours-Homme *</Form.Label>
            <Form.Control
              type="number"
              step="0.5"
              min="0"
              value={fVolume}
              onChange={e => setFVolume(+e.target.value || 0)}
              disabled={saving}
              autoFocus
            />
          </Form.Group>

          {/* ← NOUVEAU : sélection collaborateur si le profil en a */}
          {currentProfil && (currentProfil.collaborateurs?.length ?? 0) > 0 && (
            <Form.Group className="mb-3">
              <Form.Label>Collaborateur assigné</Form.Label>
              <Form.Select
                value={fCollabId ?? ""}
                onChange={e => setFCollabId(e.target.value ? +e.target.value : null)}
                disabled={saving}
              >
                <option value="">— Non assigné —</option>
                {currentProfil.collaborateurs!.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.prenom}{c.appellation ? ` (${c.appellation})` : ""}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}

          {currentProfil && (
            <div className="text-muted small">
              TJM : {currentProfil.tjm?.toLocaleString("fr-FR")} {deviseAbr}
              <br />
              Montant estimé :{" "}
              {(fVolume * (currentProfil.tjm ?? 0)).toLocaleString("fr-FR", {
                maximumFractionDigits: 0,
              })}{" "}
              {deviseAbr}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          {editLineProfil && (
            <Button label="Supprimer" variant="outline" onClick={deleteVolume} />
          )}
          <Button label="Annuler" variant="outline" onClick={() => setShowVolModal(false)} />
          <Button
            label={saving ? "…" : editLineProfil ? "Mettre à jour" : "Ajouter"}
            onClick={saveVolume}
          />
        </Modal.Footer>
      </Modal>

      {/* VALEUR CELLULE */}
      <Modal show={showCellModal} onHide={() => !saving && setShowCellModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Valeur de cellule</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Valeur</Form.Label>
              <Form.Control value={fCellVal} onChange={e => setFCellVal(e.target.value)} disabled={saving} autoFocus />
            </Form.Group>
          </Form>
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