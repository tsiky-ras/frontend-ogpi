import React, { useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";

import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import { FaPlus, FaSpinner, FaEdit, FaTrash } from "react-icons/fa";
import { Modal, Form, Alert } from "react-bootstrap";

import "./BacklogPage.css";
import { BacklogLotService } from "../../../../services/lead/backlog/BacklogLotService.tsx";
import { BacklogPhaseService } from "../../../../services/lead/backlog/BacklogPhaseService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { BacklogLot, BacklogPhase } from "../../../../types/lead/Backlog/Backlog.tsx";

const BacklogPage: React.FC = () => {
  const { api } = useAuth();
  const idBacklog = 1;
  const backlogLotService = new BacklogLotService(api);
  const backlogPhaseService = new BacklogPhaseService(api);

  const [lots, setLots] = useState<BacklogLot[]>([]);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingLot, setEditingLot] = useState<BacklogLot | null>(null);
  const [editingPhase, setEditingPhase] = useState<BacklogPhase | null>(null);
  const [currentLotId, setCurrentLotId] = useState<number | null>(null);
  const [newLot, setNewLot] = useState({ name: "", desc: "" });
  const [newPhase, setNewPhase] = useState({ name: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const phaseSortableInstances = useRef<Map<number, Sortable>>(new Map());

  /* ================= FETCH LOTS ================= */
  useEffect(() => {
    fetchLots();
  }, [idBacklog]);

  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLots = await backlogLotService.getByBacklogId(idBacklog);
      const sortedLots = [...fetchedLots].sort((a, b) => a.order - b.order);
      setLots(sortedLots);
    } catch (err) {
      console.error("Erreur lors du chargement des lots:", err);
      setError("Impossible de charger les lots. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

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
          fetchLots();
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

  /* ================= SORTABLE PHASES ================= */
  useEffect(() => {
    // Nettoyer les anciennes instances
    phaseSortableInstances.current.forEach((instance) => instance.destroy());
    phaseSortableInstances.current.clear();

    // Créer une instance Sortable pour chaque lot qui a des phases
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

          // Mettre à jour l'état local
          setLots(
            lots.map((l) =>
              l.id === lot.id ? { ...l, phases: reorderedPhases } : l
            )
          );

          // Mettre à jour sur le serveur
          try {
            const orderUpdates = reorderedPhases.map((phase) => ({
              id: phase.id,
              order: phase.order,
            }));
            await backlogPhaseService.updateOrder(orderUpdates);
          } catch (err) {
            console.error("Erreur lors de la mise à jour de l'ordre des phases:", err);
            fetchLots();
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
      alert("Le nom du lot est requis");
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
      alert("Une erreur est survenue lors de la sauvegarde.");
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
      alert("Impossible de supprimer le lot.");
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
      alert("Le nom de la phase est requis");
      return;
    }

    if (currentLotId === null) return;

    setSaving(true);
    try {
      if (editingPhase) {
        // Mise à jour
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
        // Création
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
      alert("Une erreur est survenue lors de la sauvegarde.");
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

      // Mettre à jour l'état local
      setLots(
        lots.map((lot) => {
          if (lot.id !== lotId) return lot;

          const updatedPhases = lot.phases
            ?.filter((p) => p.id !== phaseId)
            .map((p, i) => ({ ...p, order: i + 1 }));

          return { ...lot, phases: updatedPhases };
        })
      );

      // Mettre à jour l'ordre sur le serveur
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
      alert("Impossible de supprimer la phase.");
    }
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
              <span>Chargement des lots...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
                  title="Backlog"
                  subtitle="Organisez les lots et phases par glisser-déposer"
                />
              </div>
              <div className="col-md-4 text-end">
                <Button
                  label="Ajouter un lot"
                  icon={<FaPlus />}
                  onClick={openAddLot}
                />
              </div>
            </div>

            {/* ERREUR */}
            {error && (
              <Alert variant="danger" className="mb-3">
                {error}
              </Alert>
            )}

            {/* LISTE DRAGGABLE */}
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
    </div>
  );
};

export default BacklogPage;