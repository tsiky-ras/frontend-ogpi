// src/pages/ListeUser/ListeUser.tsx
import React, { useState } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Table from "../../../components/table/Table.tsx";
import FilterBar from "../../../components/filters/FilterBar.tsx";
import { FaUser, FaPlus } from "react-icons/fa";
import StatCard from "../../../components/stat/StatCard.tsx";
import Title from "../../../components/title/Title.tsx";
import Button from "../../../components/button/Button.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeUser.css";
import MenuListeUser from "./MenuListeUser.tsx";

// Mock data
const mockUsers = [
  { id: 1, nom: "Rakoto", prenom: "Mamy", email: "mamy@example.com", role: "admin" },
  { id: 2, nom: "Rasoa", prenom: "Lala", email: "lala@example.com", role: "user" },
  { id: 3, nom: "Andry", prenom: "Tiana", email: "tiana@example.com", role: "user" },
  { id: 4, nom: "Hery", prenom: "Tsiky", email: "tsiky@example.com", role: "admin" },
  { id: 5, nom: "Fidy", prenom: "Jean", email: "jean@example.com", role: "user" },
  { id: 6, nom: "Miora", prenom: "Sitraka", email: "sitraka@example.com", role: "user" },
  { id: 7, nom: "Solo", prenom: "Rivo", email: "rivo@example.com", role: "user" },
];

const ListeUser: React.FC = () => {
  const [users] = useState(mockUsers);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");

  const columns = [
    { key: "id", label: "ID" },
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    { key: "email", label: "Email" },
    { key: "role", label: "Rôle" },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <MenuListeUser
          onDetails={() => alert(`Détails de ${row.nom}`)}
          onEdit={() => alert(`Modifier ${row.nom}`)}
        />
      ),
    },
  ];

  return (
    <div className="listeuser-layout">
      <Header />

      {/* === LAYOUT FLEX (sidebar + main) === */}
      <div className="listeuser-wrapper">

        {/* Sidebar fixe */}
        <aside className="listeuser-sidebar">
          <Sidebar />
        </aside>

        {/* Contenu principal */}
        <main className="listeuser-main">
          <div className="container-fluid">

            {/* Header page */}
            <div className="row align-items-center mb-4">
              <div className="col-12 col-md-8">
                <Title
                  title="Gestion des utilisateurs"
                  subtitle="Administrez les comptes utilisateurs de l'application"
                />
              </div>

              <div className="col-12 col-md-4 text-md-end mt-3 mt-md-0">
                <Button
                  label="Nouvel utilisateur"
                  icon={<FaPlus />}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <StatCard title="Total utilisateurs" value={users.length} />
              </div>
              <div className="col-12 col-md-4">
                <StatCard
                  title="Administrateurs"
                  value={users.filter(u => u.role === "admin").length}
                />
              </div>
              <div className="col-12 col-md-4">
                <StatCard
                  title="Utilisateurs"
                  value={users.filter(u => u.role !== "admin").length}
                />
              </div>
            </div>

            {/* Filters */}
            <FilterBar
              filters={[
                {
                  type: "text",
                  placeholder: "Rechercher un utilisateur...",
                  onChange: setSearch,
                },
                {
                  type: "select",
                  options: [
                    { value: "", label: "Tous" },
                    { value: "active", label: "Actif" },
                    { value: "inactive", label: "Inactif" },
                  ],
                  value: statut,
                  onChange: setStatut,
                },
              ]}
            />

            {/* Table */}
            <div className="table-responsive">
              <Table columns={columns} data={users} />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default ListeUser;
