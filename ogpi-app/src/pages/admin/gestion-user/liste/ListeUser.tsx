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
import { Modal, Form, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeUser.css";
import MenuListeUser from "../menu/MenuListeUser.tsx";
import FormUser from "../form/FormUser.tsx";
import FicheUser from "../fiche/FicheUser.tsx";
import { Profil } from "../../../../types/profil/Profil.tsx";

// Mock data
const mockUsers = [
  { id: 1, username: "mamy.rakoto", nom: "Rakoto", prenom: "Mamy", email: "mamy@example.com", role_id: 1, role_label: "Admin", is_active: true },
  { id: 2, username: "lala.rasoa", nom: "Rasoa", prenom: "Lala", email: "lala@example.com", role_id: 5, role_label: "Collaborateur", is_active: true },
  { id: 3, username: "tiana.andry", nom: "Andry", prenom: "Tiana", email: "tiana@example.com", role_id: 5, role_label: "Collaborateur", is_active: false },
  { id: 4, username: "tsiky.hery", nom: "Hery", prenom: "Tsiky", email: "tsiky@example.com", role_id: 1, role_label: "Admin", is_active: true },
  { id: 5, username: "jean.fidy", nom: "Fidy", prenom: "Jean", email: "jean@example.com", role_id: 5, role_label: "Collaborateur", is_active: true },
  { id: 6, username: "sitraka.miora", nom: "Miora", prenom: "Sitraka", email: "sitraka@example.com", role_id: 3, role_label: "Manager", is_active: true },
  { id: 7, username: "rivo.solo", nom: "Solo", prenom: "Rivo", email: "rivo@example.com", role_id: 5, role_label: "Collaborateur", is_active: false },
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
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [showFormUser, setShowFormUser] = useState(false);
  const [selectedUserEdit, setSelectedUserEdit] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showFicheUser, setShowFicheUser] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);

  // Fonction pour basculer l'activation d'un utilisateur
  const toggleUserStatus = (userId: number) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, is_active: !u.is_active } : u
    ));
  };

  // Ouvrir la fiche détails utilisateur
  const openFicheUser = (user: any) => {
    setSelectedUserDetail(user);
    setShowFicheUser(true);
  };

  // Ouvrir le modal d'édition avec autocomplétion
  const openEditModal = (user: any) => {
    setSelectedUserEdit(user);
    setEditFormData({ ...user });
    setShowEditModal(true);
  };

  // Fermer le modal d'édition
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUserEdit(null);
    setEditFormData(null);
    setShowResetPassword(false);
    setNewPassword("");
  };

  // Fermer la fiche
  const closeFicheUser = () => {
    setShowFicheUser(false);
    setSelectedUserDetail(null);
  };

  // Sauvegarder depuis la fiche
  const handleSaveFromFiche = (updatedUser: any) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    closeFicheUser();
  };

  // Sauvegarder les modifications
  const saveUserChanges = () => {
    if (!editFormData) return;
    setUsers(users.map(u => u.id === editFormData.id ? editFormData : u));
    closeEditModal();
  };

  // Réinitialiser le mot de passe
  const resetUserPassword = () => {
    if (!newPassword) {
      alert("Veuillez entrer un nouveau mot de passe");
      return;
    }
    setEditFormData({ ...editFormData, password: newPassword });
    setNewPassword("");
    setShowResetPassword(false);
    alert("Mot de passe réinitialisé avec succès");
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
      render: (row: any) => (
        <span className={`badge ${row.is_active ? "bg-success" : "bg-danger"}`}>
          {row.is_active ? "Actif" : "Inactif"}
        </span>
      ),
    },
    {
      key: "toggle_status",
      label: "Activation",
      render: (row: any) => (
        <button
          className={`btn btn-sm ${row.is_active ? "btn-outline-danger" : "btn-outline-success"}`}
          onClick={() => toggleUserStatus(row.id)}
        >
          {row.is_active ? "Désactiver" : "Activer"}
        </button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <MenuListeUser
          onDetails={() => openFicheUser(row)}
          onEdit={() => openEditModal(row)}
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
                  title="Actifs"
                  value={users.filter(u => u.is_active).length}
                  variant="charcoal"
                />
              </div>
              <div className="col-12 col-md-4">
                <StatCard
                  title="Inactifs"
                  value={users.filter(u => !u.is_active).length}
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
                    { value: "", label: "Tous les statuts" },
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

      {/* Modal détails utilisateur (Fiche) - LECTURE SEULE */}
      <Modal show={showFicheUser} onHide={closeFicheUser} size="lg" centered scrollable>
        <Modal.Body>
          {selectedUserDetail && (
            <FicheUser
              user={selectedUserDetail}
              profil={mockCollaborateurs.find(c => c.nom === selectedUserDetail.nom && c.prenom === selectedUserDetail.prenom)}
              onClose={closeFicheUser}
              onSave={handleSaveFromFiche}
              isEditMode={false}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Modal d'édition utilisateur */}
      <Modal show={showEditModal} onHide={closeEditModal} size="lg" centered scrollable>
        <Modal.Body>
          {editFormData && (
            <FicheUser
              user={editFormData}
              profil={mockCollaborateurs.find(c => c.nom === editFormData.nom && c.prenom === editFormData.prenom)}
              onClose={closeEditModal}
              onSave={(updatedUser) => {
                setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
                closeEditModal();
              }}
              isEditMode={true}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ListeUser;
