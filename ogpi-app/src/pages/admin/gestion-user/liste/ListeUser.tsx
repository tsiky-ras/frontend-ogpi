// src/pages/ListeUser/ListeUser.tsx
import React, { useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Table from "../../../../components/table/Table.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { FaUser, FaPlus } from "react-icons/fa";
import StatCard from "../../../../components/stat/StatCard.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeUser.css";
import MenuListeUser from "../menu/MenuListeUser.tsx";
import FormUser from "../form/FormUser.tsx";
import { Profil } from "../../../../types/profil/Profil.tsx";

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

// Mock collaborateurs (pour le formulaire)
const mockCollaborateurs: Profil[] = [
  {
    profil_id: 1,
    matricule: "EMP-001",
    nom: "Rakoto",
    prenom: "Mamy",
    appelation: "Développeur",
    sexe: 1,
    email_pro: "mamy@entreprise.com",
    email_perso: "mamy@gmail.com",
    telephone: "0340000000",
    type_profil: 1,
    type_contrat: 1,
    date_embauche: "2022-01-10",
    experience_avant: 2,
    postes: [],
    etudes: [],
    certifications: [],
    hard_skills: [],
    soft_skills: [],
  },
  {
    profil_id: 2,
    matricule: "EMP-002",
    nom: "Rasoa",
    prenom: "Lala",
    appelation: "RH",
    sexe: 2,
    email_pro: "lala@entreprise.com",
    email_perso: "lala@gmail.com",
    telephone: "0320000000",
    type_profil: 2,
    type_contrat: 1,
    date_embauche: "2021-06-01",
    experience_avant: 0,
    postes: [],
    etudes: [],
    certifications: [],
    hard_skills: [],
    soft_skills: [],
  },
];

const ListeUser: React.FC = () => {
  const [users] = useState(mockUsers);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [showFormUser, setShowFormUser] = useState(false);

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
          onEdit={() => setShowFormUser(true)}
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
                  onClick={() => setShowFormUser(true)}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-4">
                <StatCard title="Total utilisateurs" value={users.length} variant={["tomato","tuscan"]} />
              </div>
              <div className="col-12 col-md-4">
                <StatCard
                  title="Administrateurs"
                  value={users.filter(u => u.role === "admin").length}
                  variant="charcoal"
                />
              </div>
              <div className="col-12 col-md-4">
                <StatCard
                  title="Utilisateurs"
                  value={users.filter(u => u.role !== "admin").length}
                  variant="tuscan"
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

      {/* Formulaire utilisateur */}
      <FormUser
        show={showFormUser}
        onClose={() => setShowFormUser(false)}
        collaborateurs={mockCollaborateurs}
        onSubmit={(user) => {
          console.log("Nouvel utilisateur créé :", user);
          setShowFormUser(false);
        }}
      />
    </div>
  );
};

export default ListeUser;
