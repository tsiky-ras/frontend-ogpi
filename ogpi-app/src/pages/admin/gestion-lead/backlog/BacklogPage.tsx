import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiError } from "../../../../utils/apiError.ts";
import Sortable from "sortablejs";

import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import { FaPlus, FaSpinner, FaEdit, FaTrash } from "react-icons/fa";
import { Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";

import "./BacklogPage.css";
import { BacklogService } from "../../../../services/lead/backlog/BacklogService.tsx";
import { BacklogLotService } from "../../../../services/lead/backlog/BacklogLotService.tsx";
import { BacklogPhaseService } from "../../../../services/lead/backlog/BacklogPhaseService.tsx";
import { BacklogProfilService } from "../../../../services/lead/backlog/BacklogProfilService.tsx";
import { BacklogLineService } from "../../../../services/lead/backlog/BacklogLineService.tsx";
import { BacklogLineProfilService } from "../../../../services/lead/backlog/BacklogLineProfilService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { 
  Backlog, 
  BacklogLot, 
  BacklogPhase, 
  BacklogProfil,
  BacklogLine,
  BacklogLineProfil 
} from "../../../../types/lead/Backlog/Backlog.tsx";

const fmtJH  = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtMnt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const BacklogPage: React.FC = () => {
  const { api } = useAuth();
  const idBacklog = 1;
  const backlogService          = useMemo(() => new BacklogService(api), [api]);
  const backlogLotService       = useMemo(() => new BacklogLotService(api), [api]);
  const backlogPhaseService     = useMemo(() => new BacklogPhaseService(api), [api]);
  const backlogProfilService    = useMemo(() => new BacklogProfilService(api), [api]);
  const backlogLineService      = useMemo(() => new BacklogLineService(api), [api]);
  const backlogLineProfilService = useMemo(() => new BacklogLineProfilService(api), [api]);

  const [backlog, setBacklog] = useState<Backlog | null>(null);
  const [lots, setLots] = useState<BacklogLot[]>([]);
  const [profils, setProfils] = useState<BacklogProfil[]>([]);
  const [lines, setLines] = useState<BacklogLine[]>([]);
  const [lineProfils, setLineProfils] = useState<BacklogLineProfil[]>([]);
  
  const [showLotModal, setShowLotModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showProfilModal, setShowProfilModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [showLineProfilModal, setShowLineProfilModal] = useState(false);
  
  const [editingLot, setEditingLot] = useState<BacklogLot | null>(null);
  const [editingPhase, setEditingPhase] = useState<BacklogPhase | null>(null);
  const [editingProfil, setEditingProfil] = useState<BacklogProfil | null>(null);
  const [editingLine, setEditingLine] = useState<BacklogLine | null>(null);
  const [editingLineProfil, setEditingLineProfil] = useState<BacklogLineProfil | null>(null);
  
  const [currentLotId, setCurrentLotId] = useState<number | null>(null);
  const [currentLineId, setCurrentLineId] = useState<number | null>(null);
  const [currentProfilId, setCurrentProfilId] = useState<number | null>(null);
  
  const [newLot, setNewLot] = useState({ name: "", desc: "" });
  const [newPhase, setNewPhase] = useState({ name: "" });
  const [newProfil, setNewProfil] = useState({ name: "", desc: "", tjm: 0 });
  const [newLine, setNewLine] = useState({ 
    epic: "", 
    userStory: "", 
    description: "", 
    resultat: "", 
    phaseId: null as number | null 
  });
  const [newLineProfil, setNewLineProfil] = useState({ volume: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("backlog");

  // Refs pour les sortables existants (lots, profils, phases)
  const listRef = useRef<HTMLDivElement | null>(null);
  const profilListRef = useRef<HTMLDivElement | null>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const profilSortableInstance = useRef<Sortable | null>(null);
  const phaseSortableInstances = useRef<Map<number, Sortable>>(new Map());

  // Ref pour le sortable des lignes du tableau
  const lineTableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const lineSortableInstance = useRef<Sortable | null>(null);

  /* ================= FETCH BACKLOG COMPLET ================= */
  const fetchBacklog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedBacklog = await backlogService.getCompleteById(idBacklog);
      setBacklog(fetchedBacklog);
      
      const sortedLots = [...(fetchedBacklog.lots || [])].sort((a, b) => a.order - b.order);
      setLots(sortedLots);
      
      const sortedProfils = [...(fetchedBacklog.profils || [])].sort((a, b) => a.order - b.order);
      setProfils(sortedProfils);
      
      const sortedLines = [...(fetchedBacklog.lines || [])].sort((a, b) => a.order - b.order);
      setLines(sortedLines);

      // Extraire les lineProfils depuis lines[].profils[]
      const allLineProfils: BacklogLineProfil[] = [];
      sortedLines.forEach((line) => {
        if (line.profils && line.profils.length > 0) {
          allLineProfils.push(...line.profils);
        }
      });
      setLineProfils(allLineProfils);

    } catch (err) {
      console.error("Erreur lors du chargement du backlog:", err);
      setError("Impossible de charger le backlog. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [backlogService]);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  /* ================= SORTABLE LINES (tableau) ================= */
  useEffect(() => {
    // Détruire l'instance précédente avant de recréer
    if (lineSortableInstance.current) {
      lineSortableInstance.current.destroy();
      lineSortableInstance.current = null;
    }

    if (!lineTableBodyRef.current || lines.length === 0) return;

    lineSortableInstance.current = Sortable.create(lineTableBodyRef.current, {
      animation: 150,
      handle: ".line-drag-handle",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      // Nécessaire pour que Sortable fonctionne correctement sur les <tr>
      filter: ".sortable-empty-row",
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
        if (evt.oldIndex === evt.newIndex) return;

        const newLines = [...lines];
        const [movedItem] = newLines.splice(evt.oldIndex, 1);
        newLines.splice(evt.newIndex, 0, movedItem);

        const reorderedLines = newLines.map((line, index) => ({
          ...line,
          order: index + 1,
        }));

        setLines(reorderedLines);

        try {
          const orderUpdates = reorderedLines.map((line) => ({
            id: line.id,
            order: line.order,
          }));
          await backlogLineService.updateOrder(orderUpdates);
        } catch (err) {
          console.error("Erreur lors de la mise à jour de l'ordre des lignes:", err);
          fetchBacklog();
        }
      },
    });

    return () => {
      if (lineSortableInstance.current) {
        lineSortableInstance.current.destroy();
        lineSortableInstance.current = null;
      }
    };
  }, [lines, loading]);

  /* ================= SORTABLE LOTS ================= */
  useEffect(() => {
    if (!listRef.current || sortableInstance.current || lots.length === 0) return;

    sortableInstance.current = Sortable.create(listRef.current, {
      animation: 150,
      handle: ".drag-handle",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;

        const newLots = [...lots];
        const [movedItem] = newLots.splice(evt.oldIndex, 1);
        newLots.splice(evt.newIndex, 0, movedItem);

        const reorderedLots = newLots.map((lot, index) => ({
          ...lot,
          order: index + 1,
        }));

        setLots(reorderedLots);

        try {
          const orderUpdates = reorderedLots.map((lot) => ({
            id: lot.id,
            order: lot.order,
          }));
          await backlogLotService.updateOrder(orderUpdates);
        } catch (err) {
          console.error("Erreur lors de la mise à jour de l'ordre:", err);
          fetchBacklog();
        }
      },
    });

    return () => {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
        sortableInstance.current = null;
      }
    };
  }, [lots, loading]);

  /* ================= SORTABLE PROFILS ================= */
  useEffect(() => {
    if (!profilListRef.current || profilSortableInstance.current || profils.length === 0) return;

    profilSortableInstance.current = Sortable.create(profilListRef.current, {
      animation: 150,
      handle: ".drag-handle-profil",
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      onEnd: async (evt) => {
        if (evt.oldIndex === undefined || evt.newIndex === undefined) return;

        const newProfils = [...profils];
        const [movedItem] = newProfils.splice(evt.oldIndex, 1);
        newProfils.splice(evt.newIndex, 0, movedItem);

        const reorderedProfils = newProfils.map((profil, index) => ({
          ...profil,
          order: index + 1,
        }));

        setProfils(reorderedProfils);

        try {
          const orderUpdates = reorderedProfils.map((profil) => ({
            id: profil.id,
            order: profil.order,
          }));
          await backlogProfilService.updateOrder(orderUpdates);
        } catch (err) {
          console.error("Erreur lors de la mise à jour de l'ordre des profils:", err);
          fetchBacklog();
        }
      },
    });

    return () => {
      if (profilSortableInstance.current) {
        profilSortableInstance.current.destroy();
        profilSortableInstance.current = null;
      }
    };
  }, [profils, loading]);

  /* ================= SORTABLE PHASES ================= */
  useEffect(() => {
    phaseSortableInstances.current.forEach((instance) => instance.destroy());
    phaseSortableInstances.current.clear();

    lots.forEach((lot) => {
      if (!lot.phases || lot.phases.length === 0) return;

      const phaseListElement = document.querySelector(
        `[data-lot-id="${lot.id}"] .phases-list-sortable`
      ) as HTMLElement;

      if (!phaseListElement) return;

      const sortable = Sortable.create(phaseListElement, {
        animation: 150,
        handle: ".phase-drag-handle",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        onEnd: async (evt) => {
          if (evt.oldIndex === undefined || evt.newIndex === undefined) return;

          const lotToUpdate = lots.find((l) => l.id === lot.id);
          if (!lotToUpdate || !lotToUpdate.phases) return;

          const newPhases = [...lotToUpdate.phases];
          const [movedPhase] = newPhases.splice(evt.oldIndex, 1);
          newPhases.splice(evt.newIndex, 0, movedPhase);

          const reorderedPhases = newPhases.map((phase, index) => ({
            ...phase,
            order: index + 1,
          }));

          setLots(
            lots.map((l) =>
              l.id === lot.id ? { ...l, phases: reorderedPhases } : l
            )
          );

          try {
            const orderUpdates = reorderedPhases.map((phase) => ({
              id: phase.id,
              order: phase.order,
            }));
            await backlogPhaseService.updateOrder(orderUpdates);
          } catch (err) {
            console.error("Erreur lors de la mise à jour de l'ordre des phases:", err);
            fetchBacklog();
          }
        },
      });

      phaseSortableInstances.current.set(lot.id, sortable);
    });

    return () => {
      phaseSortableInstances.current.forEach((instance) => instance.destroy());
      phaseSortableInstances.current.clear();
    };
  }, [lots]);

  /* ================= LOT ACTIONS ================= */
  const openAddLot = () => {
    setEditingLot(null);
    setNewLot({ name: "", desc: "" });
    setShowLotModal(true);
  };

  const openEditLot = (lot: BacklogLot) => {
    setEditingLot(lot);
    setNewLot({ name: lot.name, desc: lot.desc || "" });
    setShowLotModal(true);
  };

  const saveLot = async () => {
    if (!newLot.name.trim()) {
      setError("Le nom du lot est requis.");
      return;
    }

    setSaving(true);
    try {
      if (editingLot) {
        const updatedLot = await backlogLotService.update(editingLot.id, {
          name: newLot.name,
          desc: newLot.desc,
        });

        setLots(lots.map((l) => (l.id === editingLot.id ? updatedLot : l)));
      } else {
        const nextOrder = Math.max(...lots.map((l) => l.order), 0) + 1;
        const newLotData = {
          name: newLot.name,
          desc: newLot.desc,
          order: nextOrder,
          backlogId: idBacklog,
        };

        const createdLot = await backlogLotService.create(newLotData);
        setLots([...lots, createdLot]);
      }

      setShowLotModal(false);
      setEditingLot(null);
      setNewLot({ name: "", desc: "" });
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du lot:", err);
      setError(apiError(err, "Impossible de sauvegarder le lot"));
    } finally {
      setSaving(false);
    }
  };

  const deleteLot = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce lot ?")) {
      return;
    }

    try {
      await backlogLotService.delete(id);
      const updated = lots
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, order: i + 1 }));

      setLots(updated);

      const orderUpdates = updated.map((lot) => ({
        id: lot.id,
        order: lot.order,
      }));
      await backlogLotService.updateOrder(orderUpdates);
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError(apiError(err, "Impossible de supprimer le lot"));
    }
  };

  /* ================= PHASE ACTIONS ================= */
  const openAddPhase = (lotId: number) => {
    setCurrentLotId(lotId);
    setEditingPhase(null);
    setNewPhase({ name: "" });
    setShowPhaseModal(true);
  };

  const openEditPhase = (phase: BacklogPhase, lotId: number) => {
    setCurrentLotId(lotId);
    setEditingPhase(phase);
    setNewPhase({ name: phase.name });
    setShowPhaseModal(true);
  };

  const savePhase = async () => {
    if (!newPhase.name.trim()) {
      setError("Le nom de la phase est requis.");
      return;
    }

    if (currentLotId === null) return;

    setSaving(true);
    try {
      if (editingPhase) {
        const updatedPhase = await backlogPhaseService.update(editingPhase.id, {
          name: newPhase.name,
        });

        setLots(
          lots.map((lot) =>
            lot.id === currentLotId
              ? {
                  ...lot,
                  phases: lot.phases?.map((p) =>
                    p.id === editingPhase.id ? updatedPhase : p
                  ),
                }
              : lot
          )
        );
      } else {
        const currentLot = lots.find((l) => l.id === currentLotId);
        const nextOrder =
          Math.max(...(currentLot?.phases?.map((p) => p.order) || [0]), 0) + 1;

        const newPhaseData = {
          name: newPhase.name,
          order: nextOrder,
          lotId: currentLotId,
        };

        const createdPhase = await backlogPhaseService.create(newPhaseData);

        setLots(
          lots.map((lot) =>
            lot.id === currentLotId
              ? {
                  ...lot,
                  phases: [...(lot.phases || []), createdPhase],
                }
              : lot
          )
        );
      }

      setShowPhaseModal(false);
      setEditingPhase(null);
      setNewPhase({ name: "" });
      setCurrentLotId(null);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la phase:", err);
      setError(apiError(err, "Impossible de sauvegarder la phase"));
    } finally {
      setSaving(false);
    }
  };

  const deletePhase = async (phaseId: number, lotId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette phase ?")) {
      return;
    }

    try {
      await backlogPhaseService.delete(phaseId);

      setLots(
        lots.map((lot) => {
          if (lot.id !== lotId) return lot;

          const updatedPhases = lot.phases
            ?.filter((p) => p.id !== phaseId)
            .map((p, i) => ({ ...p, order: i + 1 }));

          return { ...lot, phases: updatedPhases };
        })
      );

      const currentLot = lots.find((l) => l.id === lotId);
      if (currentLot?.phases) {
        const orderUpdates = currentLot.phases
          .filter((p) => p.id !== phaseId)
          .map((p, i) => ({
            id: p.id,
            order: i + 1,
          }));
        await backlogPhaseService.updateOrder(orderUpdates);
      }
    } catch (err) {
      console.error("Erreur lors de la suppression de la phase:", err);
      setError(apiError(err, "Impossible de supprimer la phase"));
    }
  };

  /* ================= PROFIL ACTIONS ================= */
  const openAddProfil = () => {
    setEditingProfil(null);
    setNewProfil({ name: "", desc: "", tjm: 0 });
    setShowProfilModal(true);
  };

  const openEditProfil = (profil: BacklogProfil) => {
    setEditingProfil(profil);
    setNewProfil({ name: profil.name, desc: profil.desc || "", tjm: profil.tjm });
    setShowProfilModal(true);
  };

  const saveProfil = async () => {
    if (!newProfil.name.trim()) {
      setError("Le nom du profil est requis.");
      return;
    }

    if (newProfil.tjm < 0) {
      setError("Le TJM doit être un nombre positif.");
      return;
    }

    setSaving(true);
    try {
      if (editingProfil) {
        const updatedProfil = await backlogProfilService.update(editingProfil.id, {
          name: newProfil.name,
          desc: newProfil.desc,
          tjm: newProfil.tjm,
        });

        setProfils(profils.map((p) => (p.id === editingProfil.id ? updatedProfil : p)));
      } else {
        const nextOrder = Math.max(...profils.map((p) => p.order), 0) + 1;
        const newProfilData = {
          name: newProfil.name,
          desc: newProfil.desc,
          tjm: newProfil.tjm,
          order: nextOrder,
          backlogId: idBacklog,
        };

        const createdProfil = await backlogProfilService.create(newProfilData);
        setProfils([...profils, createdProfil]);
      }

      setShowProfilModal(false);
      setEditingProfil(null);
      setNewProfil({ name: "", desc: "", tjm: 0 });
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du profil:", err);
      setError(apiError(err, "Impossible de sauvegarder le profil"));
    } finally {
      setSaving(false);
    }
  };

  const deleteProfil = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce profil ?")) {
      return;
    }

    try {
      await backlogProfilService.delete(id);
      const updated = profils
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, order: i + 1 }));

      setProfils(updated);

      const orderUpdates = updated.map((profil) => ({
        id: profil.id,
        order: profil.order,
      }));
      await backlogProfilService.updateOrder(orderUpdates);
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError(apiError(err, "Impossible de supprimer le profil"));
    }
  };

  /* ================= LINE ACTIONS ================= */
  const getAllPhases = (): BacklogPhase[] => {
    const allPhases: BacklogPhase[] = [];
    lots.forEach(lot => {
      if (lot.phases) {
        allPhases.push(...lot.phases);
      }
    });
    return allPhases;
  };

  const openAddLine = () => {
    setEditingLine(null);
    setNewLine({ epic: "", userStory: "", description: "", resultat: "", phaseId: null });
    setShowLineModal(true);
  };

  const openEditLine = (line: BacklogLine) => {
    setEditingLine(line);
    setNewLine({ 
      epic: line.epic || "", 
      userStory: line.userStory || "", 
      description: line.description || "", 
      resultat: line.resultat || "", 
      phaseId: line.phaseId 
    });
    setShowLineModal(true);
  };

  const saveLine = async () => {
    if (!newLine.phaseId) {
      setError("Veuillez sélectionner une phase avant de sauvegarder la ligne.");
      return;
    }

    setSaving(true);
    try {
      if (editingLine) {
        const updatedLine = await backlogLineService.update(editingLine.id, {
          epic: newLine.epic,
          userStory: newLine.userStory,
          description: newLine.description,
          resultat: newLine.resultat,
          phaseId: newLine.phaseId,
          order: editingLine.order
        });

        setLines(lines.map((l) => (l.id === editingLine.id ? updatedLine : l)));
      } else {
        const nextOrder = Math.max(...lines.map((l) => l.order), 0) + 1;
        const newLineData = {
          epic: newLine.epic,
          userStory: newLine.userStory,
          description: newLine.description,
          resultat: newLine.resultat,
          order: nextOrder,
          phaseId: newLine.phaseId,
        };

        const createdLine = await backlogLineService.create(newLineData);
        setLines([...lines, createdLine]);
      }

      setShowLineModal(false);
      setEditingLine(null);
      setNewLine({ epic: "", userStory: "", description: "", resultat: "", phaseId: null });
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la ligne:", err);
      setError(apiError(err, "Impossible de sauvegarder la ligne du backlog"));
    } finally {
      setSaving(false);
    }
  };

  const deleteLine = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) {
      return;
    }

    try {
      await backlogLineService.delete(id);
      const updated = lines
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, order: i + 1 }));

      setLines(updated);

      // Nettoyer aussi les lineProfils de cette ligne localement
      setLineProfils(prev => prev.filter(lp => lp.lineId !== id));

      const orderUpdates = updated.map((line) => ({
        id: line.id,
        order: line.order,
      }));
      await backlogLineService.updateOrder(orderUpdates);
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError(apiError(err, "Impossible de supprimer la ligne du backlog"));
    }
  };

  /* ================= LINE PROFIL ACTIONS ================= */
  const getLineProfilVolume = (lineId: number, profilId: number): number => {
    const lineProfil = lineProfils.find(
      lp => lp.lineId === lineId && lp.profil.id === profilId
    );
    return lineProfil?.volume || 0;
  };

  const openLineProfilModal = (lineId: number, profilId: number) => {
    setCurrentLineId(lineId);
    setCurrentProfilId(profilId);
    
    const existing = lineProfils.find(
      lp => lp.lineId === lineId && lp.profil.id === profilId
    );
    
    if (existing) {
      setEditingLineProfil(existing);
      setNewLineProfil({ volume: existing.volume });
    } else {
      setEditingLineProfil(null);
      setNewLineProfil({ volume: 0 });
    }
    
    setShowLineProfilModal(true);
  };

  const saveLineProfil = async () => {
    if (currentLineId === null || currentProfilId === null) return;

    setSaving(true);
    try {
      if (editingLineProfil) {
        const updatedLineProfil = await backlogLineProfilService.update(editingLineProfil.id, {
          volume: newLineProfil.volume,
          lineId: currentLineId,
          profilId: currentProfilId,
        });

        setLineProfils(lineProfils.map((lp) => 
          lp.id === editingLineProfil.id ? updatedLineProfil : lp
        ));
      } else {
        const newLineProfilData = {
          volume: newLineProfil.volume,
          lineId: currentLineId,
          profilId: currentProfilId,
        };

        const createdLineProfil = await backlogLineProfilService.create(newLineProfilData);
        setLineProfils([...lineProfils, createdLineProfil]);
      }

      setShowLineProfilModal(false);
      setEditingLineProfil(null);
      setNewLineProfil({ volume: 0 });
      setCurrentLineId(null);
      setCurrentProfilId(null);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du volume:", err);
      setError(apiError(err, "Impossible de sauvegarder le volume JH"));
    } finally {
      setSaving(false);
    }
  };

  const deleteLineProfil = async () => {
    if (!editingLineProfil) return;

    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce volume ?")) {
      return;
    }

    try {
      await backlogLineProfilService.delete(editingLineProfil.id);
      setLineProfils(lineProfils.filter(lp => lp.id !== editingLineProfil.id));
      setShowLineProfilModal(false);
      setEditingLineProfil(null);
      setNewLineProfil({ volume: 0 });
      setCurrentLineId(null);
      setCurrentProfilId(null);
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError(apiError(err, "Impossible de supprimer le volume JH"));
    }
  };

  const getPhaseNameById = (phaseId: number | null): string => {
    if (!phaseId) return "—";
    const allPhases = getAllPhases();
    const phase = allPhases.find(p => p.id === phaseId);
    return phase?.name || "—";
  };

  /* ================= CALCULS DES TOTAUX ================= */
  
  // Calcul des totaux par profil
  const getProfilTotals = () => {
    return profils.map(profil => {
      const totalVolume = lineProfils
        .filter(lp => lp.profil.id === profil.id)
        .reduce((sum, lp) => sum + lp.volume, 0);
      
      const totalAmount = totalVolume * profil.tjm;
      
      return {
        profil,
        totalVolume,
        totalAmount
      };
    });
  };

  // Calcul des totaux par lot (avec phases)
  const getLotTotals = () => {
    return lots.map(lot => {
      const lotPhases = lot.phases || [];
      
      // Calcul par phase
      const phaseTotals = lotPhases.map(phase => {
        const phaseLines = lines.filter(line => line.phaseId === phase.id);
        const phaseLineIds = phaseLines.map(l => l.id);
        
        const phaseLineProfils = lineProfils.filter(lp => 
          phaseLineIds.includes(lp.lineId)
        );
        
        const totalVolume = phaseLineProfils.reduce((sum, lp) => sum + lp.volume, 0);
        
        const totalAmount = phaseLineProfils.reduce((sum, lp) => {
          const profil = profils.find(p => p.id === lp.profil.id);
          return sum + (lp.volume * (profil?.tjm || 0));
        }, 0);
        
        return {
          phase,
          totalVolume,
          totalAmount
        };
      });
      
      // Totaux du lot (somme des phases)
      const lotTotalVolume = phaseTotals.reduce((sum, pt) => sum + pt.totalVolume, 0);
      const lotTotalAmount = phaseTotals.reduce((sum, pt) => sum + pt.totalAmount, 0);
      
      return {
        lot,
        phaseTotals,
        lotTotalVolume,
        lotTotalAmount
      };
    });
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="listeuser-layout">
        <Header />
        <div className="listeuser-wrapper">
          <aside className="listeuser-sidebar">
            <Sidebar />
          </aside>
          <main className="listeuser-main">
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ height: "50vh" }}
            >
              <FaSpinner className="fa-spin me-2" />
              <span>Chargement du workload...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const profilTotals = getProfilTotals();
  const lotTotals = getLotTotals();

  return (
    <div className="listeuser-layout">
      <Header />

      <div className="listeuser-wrapper">
        <aside className="listeuser-sidebar">
          <Sidebar />
        </aside>

        <main className="listeuser-main">
          <div className="container-fluid">
            {/* HEADER */}
            <div className="row align-items-center mb-4">
              <div className="col-md-8">
                <Title
                  title={backlog?.name || "Workload"}
                  subtitle={backlog?.desc || "Gérez votre workload"}
                />
              </div>
            </div>

            {/* ERREUR */}
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            {/* TABS */}
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k || "backlog")}
              className="mb-4"
            >
              {/* TAB BACKLOG */}
              <Tab eventKey="backlog" title="Backlog">
                {/* TOTAUX PAR PROFIL */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">Totaux par profil</h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead>
                          <tr>
                            <th>Profil</th>
                            <th className="text-end">Volume total (JH)</th>
                            <th className="text-end">TJM</th>
                            <th className="text-end">Montant total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profilTotals.map(({ profil, totalVolume, totalAmount }) => (
                            <tr key={profil.id}>
                              <td><strong>{profil.name}</strong></td>
                              <td className="text-end">{fmtJH(totalVolume)}</td>
                              <td className="text-end">{fmtMnt(profil.tjm)}</td>
                              <td className="text-end"><strong>{fmtMnt(totalAmount)}</strong></td>
                            </tr>
                          ))}
                          <tr className="table-active">
                            <td><strong>TOTAL GÉNÉRAL</strong></td>
                            <td className="text-end">
                              <strong>
                                {fmtJH(profilTotals.reduce((sum, pt) => sum + pt.totalVolume, 0))}
                              </strong>
                            </td>
                            <td></td>
                            <td className="text-end">
                              <strong>
                                {fmtMnt(profilTotals.reduce((sum, pt) => sum + pt.totalAmount, 0))}
                              </strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* TOTAUX PAR LOT ET PHASE */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h5 className="mb-0">Totaux par lot et phase</h5>
                  </div>
                  <div className="card-body">
                    {lotTotals.map(({ lot, phaseTotals, lotTotalVolume, lotTotalAmount }) => (
                      <div key={lot.id} className="mb-4">
                        <h6 className="text-primary">
                          {lot.name} - Volume: {fmtJH(lotTotalVolume)} JH - Montant: {fmtMnt(lotTotalAmount)}
                        </h6>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered">
                            <thead>
                              <tr>
                                <th>Phase</th>
                                <th className="text-end">Volume (JH)</th>
                                <th className="text-end">Montant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {phaseTotals.map(({ phase, totalVolume, totalAmount }) => (
                                <tr key={phase.id}>
                                  <td>{phase.name}</td>
                                  <td className="text-end">{fmtJH(totalVolume)}</td>
                                  <td className="text-end">{fmtMnt(totalAmount)}</td>
                                </tr>
                              ))}
                              {phaseTotals.length > 0 && (
                                <tr className="table-secondary">
                                  <td><strong>TOTAL {lot.name}</strong></td>
                                  <td className="text-end"><strong>{fmtJH(lotTotalVolume)}</strong></td>
                                  <td className="text-end"><strong>{fmtMnt(lotTotalAmount)}</strong></td>
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
                  <Button
                    label="Ajouter une ligne"
                    icon={<FaPlus />}
                    onClick={openAddLine}
                  />
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered backlog-table">
                    <thead>
                      <tr>
                        {/* Colonne drag handle */}
                        <th style={{width: '30px'}}></th>
                        <th style={{width: '50px'}}>Ordre</th>
                        <th style={{width: '100px'}}>Phase</th>
                        <th style={{width: '150px'}}>Epic</th>
                        <th style={{width: '150px'}}>User Story</th>
                        <th style={{width: '200px'}}>Description</th>
                        <th style={{width: '200px'}}>Détails</th>
                        {profils.map(profil => (
                          <th key={profil.id} style={{width: '100px'}}>
                            {profil.name}
                          </th>
                        ))}
                        <th style={{width: '120px'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody ref={lineTableBodyRef}>
                      {lines.length === 0 ? (
                        <tr className="sortable-empty-row">
                          <td colSpan={8 + profils.length} className="text-center text-muted">
                            Aucune ligne pour le moment. Cliquez sur "Ajouter une ligne" pour commencer.
                          </td>
                        </tr>
                      ) : (
                        lines.map((line) => (
                          <tr key={line.id}>
                            {/* Cellule drag handle */}
                            <td className="line-drag-handle" style={{cursor: 'grab', userSelect: 'none', textAlign: 'center', color: '#aaa'}}>
                              ⋮⋮
                            </td>
                            <td className="text-center">{line.order}</td>
                            <td>{getPhaseNameById(line.phaseId)}</td>
                            <td>{line.epic || "—"}</td>
                            <td>{line.userStory || "—"}</td>
                            <td>{line.description || "—"}</td>
                            <td>{line.resultat || "—"}</td>
                            {profils.map(profil => (
                              <td 
                                key={profil.id} 
                                className="text-center backlog-profil-cell"
                                onClick={() => openLineProfilModal(line.id, profil.id)}
                                style={{cursor: 'pointer'}}
                                title="Cliquez pour modifier le volume"
                              >
                                {getLineProfilVolume(line.id, profil.id) || "—"}
                              </td>
                            ))}
                            <td>
                              <div className="d-flex gap-1 justify-content-center">
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => openEditLine(line)}
                                  title="Modifier"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteLine(line.id)}
                                  title="Supprimer"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Tab>

              {/* TAB LOTS */}
              <Tab eventKey="lots" title="Lots et Phases">
                <div className="d-flex justify-content-end mb-3">
                  <Button
                    label="Ajouter un lot"
                    icon={<FaPlus />}
                    onClick={openAddLot}
                  />
                </div>

                <div className="backlog-list" ref={listRef}>
                  {lots.length === 0 ? (
                    <div className="text-muted py-3 text-center">
                      Aucun lot pour le moment. Cliquez sur "Ajouter un lot" pour
                      commencer.
                    </div>
                  ) : (
                    lots.map((lot) => (
                      <div key={lot.id} className="backlog-item" data-lot-id={lot.id}>
                        <div className="drag-handle">⋮⋮</div>

                        <div className="backlog-content">
                          <div className="backlog-title">
                            <span className="backlog-order">{lot.order}. </span>
                            {lot.name}
                          </div>
                          <div className="backlog-desc">{lot.desc || "—"}</div>

                          {/* PHASES */}
                          <div className="phases-section mt-3">
                            <div className="phases-header d-flex justify-content-between align-items-center mb-2">
                              <strong>Phases :</strong>
                              <Button
                                label="Ajouter une phase"
                                variant="secondary"
                                icon={<FaPlus />}
                                onClick={() => openAddPhase(lot.id)}
                              />
                            </div>

                            {lot.phases && lot.phases.length > 0 ? (
                              <div className="phases-list-sortable">
                                {lot.phases
                                  .sort((a, b) => a.order - b.order)
                                  .map((phase) => (
                                    <div key={phase.id} className="phase-item">
                                      <div className="phase-drag-handle">⋮⋮</div>
                                      <div className="phase-content">
                                        <span className="phase-order">
                                          {phase.order}.{" "}
                                        </span>
                                        <span className="phase-name">
                                          {phase.name}
                                        </span>
                                      </div>
                                      <div className="phase-actions">
                                        <button
                                          className="btn-icon"
                                          onClick={() => openEditPhase(phase, lot.id)}
                                          title="Modifier"
                                        >
                                          <FaEdit />
                                        </button>
                                        <button
                                          className="btn-icon"
                                          onClick={() => deletePhase(phase.id, lot.id)}
                                          title="Supprimer"
                                        >
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-muted small">
                                Aucune phase. Cliquez sur "Ajouter une phase" pour
                                commencer.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="backlog-actions">
                          <Button
                            label="Modifier"
                            variant="secondary"
                            onClick={() => openEditLot(lot)}
                          />
                          <Button
                            label="Supprimer"
                            variant="outline"
                            onClick={() => deleteLot(lot.id)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Tab>

              {/* TAB PROFILS */}
              <Tab eventKey="profils" title="Profils">
                <div className="d-flex justify-content-end mb-3">
                  <Button
                    label="Ajouter un profil"
                    icon={<FaPlus />}
                    onClick={openAddProfil}
                  />
                </div>

                <div className="profil-list" ref={profilListRef}>
                  {profils.length === 0 ? (
                    <div className="text-muted py-3 text-center">
                      Aucun profil pour le moment. Cliquez sur "Ajouter un profil" pour
                      commencer.
                    </div>
                  ) : (
                    profils.map((profil) => (
                      <div key={profil.id} className="backlog-item">
                        <div className="drag-handle-profil">⋮⋮</div>

                        <div className="backlog-content">
                          <div className="backlog-title">
                            <span className="backlog-order">{profil.order}. </span>
                            {profil.name}
                          </div>
                          <div className="backlog-desc">{profil.desc || "—"}</div>
                          <div className="profil-tjm mt-2">
                            <strong>TJM:</strong> {fmtMnt(profil.tjm)}
                          </div>
                        </div>

                        <div className="backlog-actions">
                          <Button
                            label="Modifier"
                            variant="secondary"
                            onClick={() => openEditProfil(profil)}
                          />
                          <Button
                            label="Supprimer"
                            variant="outline"
                            onClick={() => deleteProfil(profil.id)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Tab>
            </Tabs>
          </div>
        </main>
      </div>

      {/* MODAL LOT */}
      <Modal
        show={showLotModal}
        onHide={() => !saving && setShowLotModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingLot ? "Modifier le lot" : "Ajouter un lot"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control
                value={newLot.name}
                onChange={(e) => setNewLot({ ...newLot, name: e.target.value })}
                placeholder="Entrez le nom du lot"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newLot.desc}
                onChange={(e) => setNewLot({ ...newLot, desc: e.target.value })}
                placeholder="Entrez la description du lot"
                disabled={saving}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            label="Annuler"
            variant="outline"
            onClick={() => setShowLotModal(false)}
          />
          <Button
            label={
              editingLot
                ? saving
                  ? "Enregistrement..."
                  : "Enregistrer"
                : saving
                ? "Ajout..."
                : "Ajouter"
            }
            onClick={saveLot}
          />
        </Modal.Footer>
      </Modal>

      {/* MODAL PHASE */}
      <Modal
        show={showPhaseModal}
        onHide={() => !saving && setShowPhaseModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPhase ? "Modifier la phase" : "Ajouter une phase"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nom *</Form.Label>
              <Form.Control
                value={newPhase.name}
                onChange={(e) => setNewPhase({ name: e.target.value })}
                placeholder="Entrez le nom de la phase"
                disabled={saving}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            label="Annuler"
            variant="outline"
            onClick={() => setShowPhaseModal(false)}
          />
          <Button
            label={
              editingPhase
                ? saving
                  ? "Enregistrement..."
                  : "Enregistrer"
                : saving
                ? "Ajout..."
                : "Ajouter"
            }
            onClick={savePhase}
          />
        </Modal.Footer>
      </Modal>

      {/* MODAL PROFIL */}
      <Modal
        show={showProfilModal}
        onHide={() => !saving && setShowProfilModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProfil ? "Modifier le profil" : "Ajouter un profil"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom *</Form.Label>
              <Form.Control
                value={newProfil.name}
                onChange={(e) => setNewProfil({ ...newProfil, name: e.target.value })}
                placeholder="Entrez le nom du profil"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newProfil.desc}
                onChange={(e) => setNewProfil({ ...newProfil, desc: e.target.value })}
                placeholder="Entrez la description du profil"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>TJM *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={newProfil.tjm}
                onChange={(e) => setNewProfil({ ...newProfil, tjm: parseFloat(e.target.value) || 0 })}
                placeholder="Entrez le tarif journalier moyen"
                disabled={saving}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            label="Annuler"
            variant="outline"
            onClick={() => setShowProfilModal(false)}
          />
          <Button
            label={
              editingProfil
                ? saving
                  ? "Enregistrement..."
                  : "Enregistrer"
                : saving
                ? "Ajout..."
                : "Ajouter"
            }
            onClick={saveProfil}
          />
        </Modal.Footer>
      </Modal>

      {/* MODAL LINE */}
      <Modal
        show={showLineModal}
        onHide={() => !saving && setShowLineModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingLine ? "Modifier la ligne" : "Ajouter une ligne"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Phase *</Form.Label>
              <Form.Select
                value={newLine.phaseId || ""}
                onChange={(e) => setNewLine({ ...newLine, phaseId: e.target.value ? parseInt(e.target.value) : null })}
                disabled={saving}
              >
                <option value="">Sélectionnez une phase</option>
                {getAllPhases().map(phase => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Epic</Form.Label>
              <Form.Control
                value={newLine.epic}
                onChange={(e) => setNewLine({ ...newLine, epic: e.target.value })}
                placeholder="Entrez l'epic"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>User Story</Form.Label>
              <Form.Control
                value={newLine.userStory}
                onChange={(e) => setNewLine({ ...newLine, userStory: e.target.value })}
                placeholder="Entrez la user story"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newLine.description}
                onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                placeholder="Entrez la description"
                disabled={saving}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Détails</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newLine.resultat}
                onChange={(e) => setNewLine({ ...newLine, resultat: e.target.value })}
                placeholder="Entrez les détails du résultat attendu"
                disabled={saving}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            label="Annuler"
            variant="outline"
            onClick={() => setShowLineModal(false)}
          />
          <Button
            label={
              editingLine
                ? saving
                  ? "Enregistrement..."
                  : "Enregistrer"
                : saving
                ? "Ajout..."
                : "Ajouter"
            }
            onClick={saveLine}
          />
        </Modal.Footer>
      </Modal>

      {/* MODAL LINE PROFIL */}
      <Modal
        show={showLineProfilModal}
        onHide={() => !saving && setShowLineProfilModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {editingLineProfil ? "Modifier le volume" : "Ajouter un volume"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Volume (jours-homme) *</Form.Label>
              <Form.Control
                type="number"
                step="0.5"
                min="0"
                value={newLineProfil.volume}
                onChange={(e) => setNewLineProfil({ volume: parseFloat(e.target.value) || 0 })}
                placeholder="Entrez le volume en jours-homme"
                disabled={saving}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          {editingLineProfil && (
            <Button
              label="Supprimer"
              variant="outline"
              onClick={deleteLineProfil}
            />
          )}
          <Button
            label="Annuler"
            variant="outline"
            onClick={() => setShowLineProfilModal(false)}
          />
          <Button
            label={
              editingLineProfil
                ? saving
                  ? "Enregistrement..."
                  : "Enregistrer"
                : saving
                ? "Ajout..."
                : "Ajouter"
            }
            onClick={saveLineProfil}
          />
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BacklogPage;