// BacklogPage.tsx (version modifiée)
import React, { useEffect, useRef, useState } from "react";
import Sortable from "sortablejs";

import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import { FaPlus, FaSpinner } from "react-icons/fa";
import { Modal, Form, Alert } from "react-bootstrap";


import "./BacklogPage.css";
import { BacklogLot } from "./lot/BacklogLot.tsx";
import { BacklogLotService } from "../../../../services/lead/backlog/BacklogLotService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

const BacklogPage: React.FC = () => {
    const { api } = useAuth();
  const idBacklog = 1; // ID du backlog (pourrait venir des props ou d'un contexte)
  const backlogLotService = new BacklogLotService(api);

  const [lots, setLots] = useState<BacklogLot[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLot, setEditingLot] = useState<BacklogLot | null>(null);
  const [newLot, setNewLot] = useState({ name: "", desc: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const sortableInstance = useRef<Sortable | null>(null);

  /* ================= FETCH LOTS ================= */
  useEffect(() => {
    fetchLots();
  }, [idBacklog]);

  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLots = await backlogLotService.getByBacklogId(idBacklog);
      // S'assurer que les lots sont triés par ordre
      const sortedLots = [...fetchedLots].sort((a, b) => a.order - b.order);
      setLots(sortedLots);
    } catch (err) {
      console.error("Erreur lors du chargement des lots:", err);
      setError("Impossible de charger les lots. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= SORTABLE ================= */
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

        // Créer une nouvelle copie du tableau
        const newLots = [...lots];
        const [movedItem] = newLots.splice(evt.oldIndex, 1);
        newLots.splice(evt.newIndex, 0, movedItem);

        // Mettre à jour les ordres
        const reorderedLots = newLots.map((lot, index) => ({
          ...lot,
          order: index + 1,
        }));

        // Mettre à jour l'état local immédiatement
        setLots(reorderedLots);

        // Envoyer la mise à jour au serveur
        try {
          const orderUpdates = reorderedLots.map((lot) => ({
            id: lot.id,
            order: lot.order,
          }));
          await backlogLotService.updateOrder(orderUpdates);
        } catch (err) {
          console.error("Erreur lors de la mise à jour de l'ordre:", err);
          // Recharger les données depuis le serveur en cas d'erreur
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

  /* ================= ACTIONS ================= */
  const openAdd = () => {
    setEditingLot(null);
    setNewLot({ name: "", desc: "" });
    setShowModal(true);
  };

  const openEdit = (lot: BacklogLot) => {
    setEditingLot(lot);
    setNewLot({ name: lot.name, desc: lot.desc || "" });
    setShowModal(true);
  };

  const saveLot = async () => {
    if (!newLot.name.trim()) {
      alert("Le nom du lot est requis");
      return;
    }

    setSaving(true);
    try {
      if (editingLot) {
        // Mettre à jour le lot existant
        const updatedLot = await backlogLotService.update(editingLot.id, {
          name: newLot.name,
          desc: newLot.desc,
        });
        
        setLots(lots.map((l) => (l.id === editingLot.id ? updatedLot : l)));
      } else {
        // Créer un nouveau lot
        const nextOrder = Math.max(...lots.map(l => l.order), 0) + 1;
        const newLotData = {
          name: newLot.name,
          desc: newLot.desc,
          order: nextOrder,
          backlogId: idBacklog,
        };
        
        const createdLot = await backlogLotService.create(newLotData);
        setLots([...lots, createdLot]);
      }

      setShowModal(false);
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
      // Supprimer localement
      const updated = lots
        .filter((l) => l.id !== id)
        .map((l, i) => ({ ...l, order: i + 1 }));
      
      setLots(updated);
      
      // Mettre à jour l'ordre sur le serveur
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
            <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
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
                  subtitle="Organisez les lots par glisser-déposer"
                />
              </div>
              <div className="col-md-4 text-end">
                <Button
                  label="Ajouter un lot"
                  icon={<FaPlus />}
                  onClick={openAdd}
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
                  Aucun lot pour le moment. Cliquez sur "Ajouter un lot" pour commencer.
                </div>
              ) : (
                lots.map((lot) => (
                  <div key={lot.id} className="backlog-item">
                    <div className="drag-handle">⋮⋮</div>

                    <div className="backlog-content">
                      <div className="backlog-title">
                        <span className="backlog-order">{lot.order}. </span>
                        {lot.name}
                      </div>
                      <div className="backlog-desc">{lot.desc || "—"}</div>
                    </div>

                    <div className="backlog-actions">
                      <Button
                        label="Modifier"
                        variant="secondary"
                        onClick={() => openEdit(lot)}
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

      {/* MODAL */}
      <Modal show={showModal} onHide={() => !saving && setShowModal(false)} centered>
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
                onChange={(e) =>
                  setNewLot({ ...newLot, name: e.target.value })
                }
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
                onChange={(e) =>
                  setNewLot({ ...newLot, desc: e.target.value })
                }
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
            onClick={() => setShowModal(false)}
          />
          <Button
            label={editingLot ? (saving ? "Enregistrement..." : "Enregistrer") : (saving ? "Ajout..." : "Ajouter")}
            onClick={saveLot}
          />
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BacklogPage;