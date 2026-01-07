import React, { useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import GenericForm from "../../../../components/form/GenericForm.tsx";
import Table from "../../../../components/table/Table.tsx";
import Title from "../../../../components/title/Title.tsx";
import { BusinessUnit } from "../../../../types/profil/poste/BusinessUnit.tsx";
import "./ConfigPage.css";
import DropdownActions from "../../../../components/dropdown/DropdownActions.tsx";
import { FaPlus } from "react-icons/fa";
import Button from "../../../../components/button/Button.tsx";
import { Modal } from "react-bootstrap";

const BusinessUnitPage: React.FC = () => {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [selectedBU, setSelectedBU] = useState<BusinessUnit | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  /* ================= CREATE / UPDATE ================= */
  const handleSave = (data: BusinessUnit) => {
    if (data.id) {
      setBusinessUnits((prev) =>
        prev.map((bu) => (bu.id === data.id ? data : bu))
      );
    } else {
      setBusinessUnits((prev) => [...prev, { ...data, id: Date.now() }]);
    }
    setSelectedBU(null);
    setShowModal(false); // fermer le modal
  };

  /* ================= DELETE ================= */
  const handleDelete = (id: number | null) => {
    if (!id) return;
    setBusinessUnits((prev) => prev.filter((bu) => bu.id !== id));
  };

  /* ================= FILTRAGE ================= */
  const filteredBU = businessUnits.filter((bu) =>
    bu.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= COLUMNS TABLE ================= */
  const columns = [
    { key: "name", label: "Nom" },
    {
      key: "actions",
      label: "Actions",
      render: (row: BusinessUnit) => (
        <DropdownActions
          onEdit={() => {
            setSelectedBU(row);
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
            {/* ===== Title ===== */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <Title
                  title="Gestion des Business Units"
                  subtitle="Créer, modifier et supprimer les Business Units"
                />
                <div className="col-md-4 text-end">
                  <Button
                    label="Nouveau BU"
                    icon={<FaPlus />}
                    onClick={() => {
                      setSelectedBU(null);
                      setShowModal(true);
                    }}
                  />
                </div>
              </div>
            {/* ===== Barre de recherche ===== */}
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Rechercher une Business Unit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* ===== Table ===== */}
            <div className="table-responsive">
              <Table columns={columns} data={filteredBU} />
            </div>
          </div>
        </main>
      </div>

      {/* ===== Modal Formulaire ===== */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedBU ? "Modifier un Business Unit" : "Ajouter un nouveau Business Unit"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GenericForm<BusinessUnit>
            valueKey="name"
            initialData={selectedBU}
            onSubmit={handleSave}
            onCancel={() => setShowModal(false)}
            submitLabel={selectedBU ? "Mettre à jour" : "Créer"}
            title="" // titre dans modal header déjà présent
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default BusinessUnitPage;
