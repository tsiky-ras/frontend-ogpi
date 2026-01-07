import React, { useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import GenericForm from "../../../../components/form/GenericForm.tsx";
import Table from "../../../../components/table/Table.tsx";
import Title from "../../../../components/title/Title.tsx";
import DropdownActions from "../../../../components/dropdown/DropdownActions.tsx";
import Button from "../../../../components/button/Button.tsx";
import { Modal } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import "./ConfigPage.css";

interface ConfigEntityPageProps<T extends { id: number | null; [key: string]: any }> {
  title: string;               // Titre de la page
  entityLabel: keyof T;         // Champ à afficher et modifier (ex: "label" ou "name")
  initialData?: T[];            // Valeurs initiales
  entityName: string;           // Nom de l'entité pour les boutons / modals (ex: "Diplôme")
}

const ConfigEntityPage = <T extends { id: number | null }>({
  title,
  entityLabel,
  initialData = [],
  entityName,
}: ConfigEntityPageProps<T>) => {
  const [entities, setEntities] = useState<T[]>(initialData);
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  /* CREATE / UPDATE */
  const handleSave = (data: T) => {
    if (data.id) {
      setEntities(prev =>
        prev.map(e => (e.id === data.id ? data : e))
      );
    } else {
      setEntities(prev => [...prev, { ...data, id: Date.now() }]);
    }
    setSelectedEntity(null);
    setShowModal(false);
  };

  /* DELETE */
  const handleDelete = (id: number | null) => {
    if (!id) return;
    setEntities(prev => prev.filter(e => e.id !== id));
  };

  /* FILTER */
  const filteredEntities = entities.filter(e =>
    String(e[entityLabel]).toLowerCase().includes(search.toLowerCase())
  );

  /* TABLE COLUMNS */
  const columns = [
    { key: entityLabel as string, label: entityName },
    {
      key: "actions",
      label: "Actions",
      render: (row: T) => (
        <DropdownActions
          onEdit={() => {
            setSelectedEntity(row);
            setShowModal(true);
          }}
          onDelete={() => handleDelete(row.id)}
        />
      ),
    },
  ];

  return (
    <div className="config-layout">
      <Header />
      <div className="config-wrapper">
        <aside className="config-sidebar">
          <Sidebar />
        </aside>
        <main className="config-main">
          <div className="container-fluid">

            {/* Title + bouton */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Title
                title={title}
                subtitle={`Créer, modifier et supprimer des ${entityName.toLowerCase()}s`}
              />
              <div className="col-md-4 text-end">
                <Button
                  label={`Nouvelle ${entityName}`}
                  icon={<FaPlus />}
                  onClick={() => {
                    setSelectedEntity(null);
                    setShowModal(true);
                  }}
                />
              </div>
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder={`Rechercher un ${entityName.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Table */}
            <div className="table-responsive">
              <Table columns={columns} data={filteredEntities} />
            </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="config-entity-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedEntity
              ? `Modifier ${entityName}`
              : `Ajouter un ${entityName}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GenericForm<T>
            valueKey={entityLabel as "label" | "name"}
            initialData={selectedEntity}
            onSubmit={handleSave}
            onCancel={() => setShowModal(false)}
            submitLabel={selectedEntity ? "Mettre à jour" : "Créer"}
            title="" // titre déjà présent dans modal
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ConfigEntityPage;
