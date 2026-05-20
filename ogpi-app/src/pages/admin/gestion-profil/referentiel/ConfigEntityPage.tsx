import React, { useEffect, useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import GenericForm from "../../../../components/form/GenericForm.tsx";
import Table from "../../../../components/table/Table.tsx";
import Title from "../../../../components/title/Title.tsx";
import DropdownActions from "../../../../components/dropdown/DropdownActions.tsx";
import Button from "../../../../components/button/Button.tsx";
import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";
import { Modal } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import "./ConfigPage.css";
import "../../../../components/message/CollecteMessages.css";

  type ConfigEntityPageProps<T> = {
    service: any;
    entityName: string;
    entityLabel: keyof T;
    title: string;
    extraColumns?: { key: string; label: string; render?: (row: T) => React.ReactNode }[];
    extraInputs?: { name: keyof T; label: string; type?: string }[]; // <-- ici
  };


  function ConfigEntityPage<T extends { id?: number | null }>({
    service,
    entityName,
    entityLabel,
    title,
    extraColumns = [],
    extraInputs = [],
  }: ConfigEntityPageProps<T>) {

  const [entities, setEntities] = useState<T[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // ===== Message modals state =====
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    service.getAll().then(setEntities).catch(console.error);
  }, [service]);

  /* =========================
     CREATE / UPDATE
  ========================= */
  const handleSave = async (data: T) => {
    try {
      setShowLoadingMessage(true);
      if (data.id) {
        const updated = await service.update(data);
        setEntities((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setShowLoadingMessage(false);
        setSuccessMessage("Entité mise à jour avec succès !");
      } else {
        const created = await service.create(data);
        setEntities((prev) => [...prev, created]);
        setShowLoadingMessage(false);
        setSuccessMessage("Entité créée avec succès !");
      }
      setShowSuccessMessage(true);

      setTimeout(() => {
        setShowSuccessMessage(false);
        setSelectedEntity(null);
        setShowModal(false);
      }, 2000);
    } catch (error: any) {
      setShowLoadingMessage(false);
      const errorMsg =
        error.response?.data?.message ||
        "Erreur lors de la sauvegarde";
      setErrorMessage(errorMsg);
      setShowErrorMessage(true);
      console.error("Erreur sauvegarde :", error);
    }
  };

  /* =========================
     DELETE
  ========================= */
  const handleDelete = async (id: number | null) => {
    if (!id) return;
    try {
      setShowLoadingMessage(true);
      await service.delete(id);
      setEntities((prev) => prev.filter((e) => e.id !== id));
      setShowLoadingMessage(false);
      setSuccessMessage("Entité supprimée avec succès !");
      setShowSuccessMessage(true);

      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
    } catch (error: any) {
      setShowLoadingMessage(false);
      const errorMsg =
        error.response?.data?.message ||
        "Erreur lors de la suppression";
      setErrorMessage(errorMsg);
      setShowErrorMessage(true);
      console.error("Erreur suppression :", error);
    }
  };

  /* =========================
     FILTER
  ========================= */
  const filteredEntities = entities.filter((e) =>
    String(e[entityLabel])
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* =========================
     TABLE COLUMNS
  ========================= */
    const columns = [
      {
        key: entityLabel as string,
        label: entityName,
        render: (row: T) => String(row[entityLabel] ?? "")
      },
      ...extraColumns.map(col => ({
        ...col,
        render: col.render || ((row: T) => String(row[col.key as keyof T] ?? "")) 
      })),
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

  /* =========================
     RENDER
  ========================= */
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
              <Button
                label={`Ajouter un(e) ${entityName}`}
                icon={<FaPlus />}
                onClick={() => {
                  setSelectedEntity(null);
                  setShowModal(true);
                }}
              />
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder={`Rechercher un ${entityName.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        className="config-entity-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedEntity ? `Modifier ${entityName}` : `Ajouter un(e) ${entityName}`}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
        <GenericForm<T>
          valueKey={entityLabel as "label" | "name"}
          initialData={selectedEntity}
          onSubmit={handleSave}
          onCancel={() => setShowModal(false)}
          submitLabel={selectedEntity ? "Mettre à jour" : "Créer"}
          title=""
          extraInputs={extraInputs} // <-- important !
        />
        </Modal.Body>
      </Modal>

      {/* Message modals */}
      <CollecteLoadingMessage
        visible={showLoadingMessage}
        message="Traitement en cours..."
      />
      <CollecteSuccessMessage
        visible={showSuccessMessage}
        message={successMessage}
        onClose={() => setShowSuccessMessage(false)}
      />
      <CollecteErrorMessage
        visible={showErrorMessage}
        message={errorMessage}
        onClose={() => setShowErrorMessage(false)}
      />
    </div>
  );
}

export default ConfigEntityPage;
