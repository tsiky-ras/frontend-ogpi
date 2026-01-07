import React, { useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Table from "../../../../components/table/Table.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { FaPlus } from "react-icons/fa";
import StatCard from "../../../../components/stat/StatCard.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import MenuListeUser from "../menu/MenuListeUser.tsx";
import FicheUser from "../fiche/FicheUser.tsx";
import { Profil } from "../../../../types/profil/Profil";

import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeUser.css";
import FormUser from "../form/FormUser.tsx";

/* ================= MOCK DATA ================= */
const mockUsers = [
  { id: 1, username: "mamy.rakoto", nom: "Rakoto", prenom: "Mamy", email: "mamy@example.com", role_id: 1, role_label: "Admin", is_active: true },
  { id: 2, username: "lala.rasoa", nom: "Rasoa", prenom: "Lala", email: "lala@example.com", role_id: 5, role_label: "Collaborateur", is_active: true },
  { id: 3, username: "tiana.andry", nom: "Andry", prenom: "Tiana", email: "tiana@example.com", role_id: 5, role_label: "Collaborateur", is_active: false },
];

/* ================= COMPONENT ================= */
const ListeUser: React.FC = () => {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [showFormUser, setShowFormUser] = useState(false);

  const openUser = (user: any, mode: "view" | "edit") => {
    setSelectedUser(user);
    setMode(mode);
  };

  const saveUser = (updatedUser: any) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setSelectedUser(null);
    setMode(null);
  };

  const columns = [
    { key: "username", label: "Utilisateur" },
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    { key: "email", label: "Email" },
    { key: "role_label", label: "Rôle" },
    {
      key: "is_active",
      label: "Statut",
      render: (row: any) => <span className={`badge ${row.is_active ? "bg-success" : "bg-danger"}`}>{row.is_active ? "Actif" : "Inactif"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <MenuListeUser
          onDetails={() => openUser(row, "view")}
          onEdit={() => openUser(row, "edit")}
        />
      ),
    },
  ];

  const filteredUsers = users.filter(u =>
    u.nom.toLowerCase().includes(search.toLowerCase()) ||
    u.prenom.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="listeuser-layout">
      <Header />
      <div className="listeuser-wrapper">
        <aside className="listeuser-sidebar"><Sidebar /></aside>
        <main className="listeuser-main">
          <div className="container-fluid">
            <div className="row align-items-center mb-4">
              <div className="col-md-8">
                <Title title="Gestion des utilisateurs" subtitle="Administrez les comptes utilisateurs" />
              </div>
              <div className="col-md-4 text-end">
                <Button label="Nouvel utilisateur" icon={<FaPlus />} onClick={() => setShowFormUser(true)} />
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-4">
                <StatCard title="Total utilisateurs" value={users.length} variant={["tomato","charcoal"]} />
              </div>
            </div>

            <FilterBar
              filters={[
                { type: "text", placeholder: "Rechercher...", onChange: setSearch },
              ]}
            />

            <div className="table-responsive mt-3">
              <Table columns={columns} data={filteredUsers} />
            </div>
          </div>
        </main>
      </div>

      {/* Fiche User */}
      {selectedUser && (
        <FicheUser
          user={selectedUser}
          profil={undefined} // ou associer profil si dispo
          onClose={() => setSelectedUser(null)}
          onSave={saveUser}
          isEditMode={mode === "edit"}
          modalTitle={mode === "edit" ? `Modifier ${selectedUser.nom} ${selectedUser.prenom}` : `Fiche de ${selectedUser.nom} ${selectedUser.prenom}`}
        />
      )}

      {/* Formulaire utilisateur */}
      <FormUser
        show={showFormUser}
        onClose={() => setShowFormUser(false)}
        collaborateurs={[]} // mock si nécessaire
        onSubmit={(user) => setShowFormUser(false)}
      />
    </div>
  );
};

export default ListeUser;
