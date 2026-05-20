import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import TacheForm from "../form/TacheForm.tsx";
import TacheStatusForm, { Tache, TacheStatus } from "../status/TacheStatusForm.tsx";
import "./TacheList.css";

type Props = {
  type: "LEAD" | "PROJET";
};

const TacheList: React.FC<Props> = ({ type }) => {
  const [showForm, setShowForm] = useState(false);

  const [taches, setTaches] = useState<Tache[]>([
    {
      id: 1,
      titre: "Préparer devis",
      statut: "En cours",
      attribuee: true,
      description: "Préparer le devis pour le client",
      responsable: "Tsiky",
    },
    {
      id: 2,
      titre: "Validation budget",
      statut: "À faire",
      attribuee: false,
      description: "Validation du budget avec finance",
      responsable: "Manager",
    },
  ]);

  const handleUpdateStatus = (id: number, newStatus: TacheStatus) => {
    setTaches(prev => prev.map(t => t.id === id ? { ...t, statut: newStatus } : t));
  };

  const handleToggleAttribuee = (id: number, attribuee: boolean) => {
    setTaches(prev => prev.map(t => t.id === id ? { ...t, attribuee } : t));
  };

  const handleAddTache = (newTache: Omit<Tache, "id">) => {
    const id = Math.max(0, ...taches.map(t => t.id)) + 1;
    setTaches(prev => [...prev, { ...newTache, id }]);
    setShowForm(false);
  };

  return (
    <div className="tache-list-wrapper">
      <div className="tache-list-header">
        <h4>Tâches - {type}</h4>
        <Button className="btn-add-tache" onClick={() => setShowForm(true)}>
          <FaPlus className="me-2" />
          Nouvelle tâche
        </Button>
      </div>

      {taches.length === 0 ? (
        <div className="tache-empty-state">
          <p>Aucune tâche pour le moment</p>
          <Button className="btn-add-tache-outline" onClick={() => setShowForm(true)}>
            <FaPlus className="me-2" />
            Créer votre première tâche
          </Button>
        </div>
      ) : (
        <div className="tache-list-container">
          {taches.map((t) => (
            <TacheStatusForm
              key={t.id}
              tache={t}
              onUpdateStatus={(status) => handleUpdateStatus(t.id, status)}
              onToggleAttribuee={(attribuee) => handleToggleAttribuee(t.id, attribuee)}
            />
          ))}
        </div>
      )}

      <TacheForm 
        show={showForm} 
        onHide={() => setShowForm(false)}
        onSubmit={handleAddTache}
      />
    </div>
  );
};

export default TacheList;