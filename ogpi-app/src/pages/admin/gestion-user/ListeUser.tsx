// src/pages/ListeUser/ListeUser.tsx
import React, { useState, useEffect } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Table from "../../../components/table/Table.tsx";
import FilterBar from "../../../components/filters/FilterBar.tsx";
import { FaUser } from "react-icons/fa";
import StatCard from "../../../components/stat/StatCard.tsx";
import "./ListeUser.css";
// Exemple de données utilisateurs
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
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState<string>('');
  const [statut, setStatut] = useState<string>('');

  // Définir les colonnes du tableau
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
        <button onClick={() => alert(`Voir ${row.nom}`)}>
          <FaUser />
        </button>
      ),
    },
  ];

  return (
    <div className="listeuser-layout">
      <Header />

      <div className="listeuser-body">
        <aside className="listeuser-sidebar">
          <Sidebar />
        </aside>

        <main className="listeuser-main">
          <div className="listeuser-content">
            <div className="container">
              <h2>Liste des utilisateurs</h2>

              {/* Stat cards */}
              <div className="stats-cards">
                <StatCard title="Total utilisateurs" value={users.length} />
                <StatCard title="Administrateurs" value={users.filter(u => (u as any).role === 'admin').length} />
                <StatCard title="Utilisateurs" value={users.filter(u => (u as any).role !== 'admin').length} />
              </div>

              <FilterBar
                filters={[
                  {
                    type: "text",
                    placeholder: "Rechercher un utilisateur...",
                    onChange: setSearch,
                  },
                  {
                    type: "select",
                    label: "Statut",
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

              {/* Filtrage local simple */}
              {(() => {
                const s = search.trim().toLowerCase();
                const filtered = users.filter((u) => {
                  if (statut && (u as any).statut && statut !== (u as any).statut) return false;
                  if (!s) return true;
                  return (
                    (u.nom || '').toLowerCase().includes(s) ||
                    (u.prenom || '').toLowerCase().includes(s) ||
                    (u.email || '').toLowerCase().includes(s) ||
                    (u.role || '').toLowerCase().includes(s)
                  );
                });

                return <Table columns={columns} data={filtered} />;
              })()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ListeUser;
