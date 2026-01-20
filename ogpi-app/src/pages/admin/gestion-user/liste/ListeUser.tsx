import React, { use, useEffect, useState } from "react";
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
import { useUserService } from "../../../../services/user/UserService.tsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeUser.css";
import FormUser from "../form/FormUser.tsx";
import { User } from "../../../../types/user/User";

/* ================= COMPONENT ================= */
const ListeUser: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [showFormUser, setShowFormUser] = useState(false);
  const { getAll } = useUserService();

  const fetchUsers = async () => {
    try {
      const data = await getAll();
      console.log("Utilisateurs chargés :", data);
      setUsers(data);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs :", error);
    }
  };


    // ----------- Fetch utilisateurs ----------- 
    useEffect(() => {
      fetchUsers();
    }, []);

  const openUser = (user: any, mode: "view" | "edit") => {
    setSelectedUser(user.userId); 
    setMode(mode);
  };

  const saveUser = async () => {
    await fetchUsers();   
    setSelectedUser(null);
    setMode(null);
  };

  const columns = [
    {
      key: "username",
      label: "Utilisateur",
    },
    {
      key: "nom",
      label: "Nom",
      render: (row: any) => row.profil?.nom || "",
    },
    {
      key: "prenom",
      label: "Prénom",
      render: (row: any) => row.profil?.prenom || "",
    },
    {
      key: "sexe",
      label: "Genre",
      render: (row: any) => {
        if (!row.profil) return "";
        return row.profil.sexe === 1 ? "Homme" : row.profil.sexe === 2 ? "Femme" : "-";
      },
    },
    {
      key: "role_label",
      label: "Rôle",
      render: (row: any) => row.role?.roleLabel || "",
    },
    {
      key: "isActive",
      label: "Statut",
      render: (row: any) => (
        <span className={`badge ${row.isActive ? "bg-success" : "bg-danger"}`}>
          {row.isActive ? "Actif" : "Inactif"}
        </span>
      ),
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


  const filteredUsers = users.filter(u => {
    // Filtre par recherche textuelle
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.profil?.nom?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (u.profil?.prenom?.toLowerCase().includes(search.toLowerCase()) ?? false);

    // Filtre par statut
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "inactive" && !u.isActive);

    return matchesSearch && matchesStatus;
  });

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
                <StatCard
                  title="Tous les utilisateurs"
                  value={users.length}
                  variant={["tomato", "charcoal"]}
                />
              </div>
              <div className="col-md-4">
                <StatCard
                  title="Utilisateurs actifs"
                  value={users.filter(u => u.isActive).length}
                  variant={["dim", "linen"]}
                />
              </div>
              <div className="col-md-4">
                <StatCard
                  title="Utilisateurs inactifs"
                  value={users.filter(u => !u.isActive).length}
                  variant={["tuscan", "linen"]}
                />
              </div>
            </div>
            <FilterBar
              filters={[
                { type: "text", placeholder: "Rechercher...", onChange: setSearch },
                { 
                  type: "select", 
                  placeholder: "Filtrer par statut...",
                  options: [
                    { value: "all", label: "Tous les statuts" },
                    { value: "active", label: "Actif" },
                    { value: "inactive", label: "Inactif" }
                  ],
                  onChange: (value: any) => setStatusFilter(value as "all" | "active" | "inactive")
                },
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
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={saveUser}
          isEditMode={mode === "edit"}
          modalTitle={mode === "edit" ? `Modifier l'utilisateur` : `Fiche utilisateur`}
        />
      )}

      {/* Formulaire utilisateur */}
      <FormUser
        show={showFormUser}
        onClose={() => setShowFormUser(false)}
        collaborateurs={[]} // mock si nécessaire
        onSubmit={() => {
          fetchUsers();
          setShowFormUser(false);
        }}
      />
    </div>
  );
};

export default ListeUser;
