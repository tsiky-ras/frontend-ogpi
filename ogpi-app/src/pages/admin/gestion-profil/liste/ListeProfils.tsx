import React, { useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Table from "../../../../components/table/Table.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { FaUser, FaPlus } from "react-icons/fa";
import StatCard from "../../../../components/stat/StatCard.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import MenuListeProfils from "../menu/MenuListeProfils.tsx";
import { Profil } from "../../../../types/profil/Profil.tsx";
import FicheProfil from "../../gestion-profil/fiche/FicheProfil.tsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeProfils.css";
import FormProfil from "../../gestion-profil/form/FormProfil.tsx";

/* ================= UTIL ================= */
const getPosteActuel = (profil: Profil) =>
  profil.postes.find(p => !p.endDate);

/* Helpers */
const getContractLabel = (c?: number) => {
  switch (c) {
    case 1:
      return "CDI";
    case 2:
      return "CDD";
    case 3:
      return "STAGE";
    default:
      return "—";
  }
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

/* ================= MOCK DATA ================= */
const mockProfils: Profil[] = [
  {
    profil_id: 1,
    matricule: "EMP-001",
    nom: "Rakoto",
    prenom: "Mamy",
    appelation: "Développeur",
    sexe: 1,
    date_naissance: "1995-05-12",

    email_pro: "mamy@entreprise.com",
    email_perso: "mamy@gmail.com",
    telephone: "0340000000",

    type_profil: 1,
    type_contrat: 1,
    date_embauche: "2022-01-10",
    date_integration: "2022-02-01",
    date_debauche: undefined,
    experience_avant: 2,

    postes: [
      {
        profilPosteId: 1,
        startDate: "2023-01-01",
        poste: {
          posteId: 1,
          label: "Développeur Frontend",
        },
        bu: {
          buId: 1,
          name: "DSI",
        },
      },
    ],

    etudes: [
      {
        profilEtudeId: 1,
        obtention: "2018-07-01",
        diplome: {
          id: 1,
          label: "Licence Informatique",
        },
        filiere: {
          id: 1,
          label: "Informatique",
        },
        etablissement: {
          id: 1,
          label: "Université d’Antananarivo",
        },
      },
    ],

    certifications: [
      {
        id: 1,
        label: "React Advanced",
        obtention: "2023-06-10",
        score: 85,
        organisme: {
          id: 1,
          label: "Udemy",
        },
        badge: "https://example.com/badges/react-advanced.png",
      },
    ],

    hard_skills: [
      {
        id: 1,
        niveau: "Avancé",
        domaine: {
          id: 1,
          label: "React.js",
        },
      },
      {
        id: 2,
        niveau: "Intermédiaire",
        domaine: {
          id: 2,
          label: "TypeScript",
        },
      },
    ],

    soft_skills: [
      {
        id: 1,
        domaine: {
          id: 1,
          label: "Travail en équipe",
        },
      },
      {
        id: 2,
        domaine: {
          id: 2,
          label: "Communication",
        },
      },
    ],
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
    date_integration: "2021-06-15",
    date_debauche: undefined,

    postes: [
      {
        profilPosteId: 2,
        startDate: "2021-06-01",
        poste: {
          posteId: 2,
          label: "Responsable RH",
        },
        bu: {
          buId: 2,
          name: "Ressources Humaines",
        },
      },
    ],

    etudes: [],
    certifications: [],
    hard_skills: [],
    soft_skills: [],
  },
];

/* ================= COMPONENT ================= */
const ListeProfils: React.FC = () => {
  const [profils] = useState(mockProfils);
  const [search, setSearch] = useState("");
  const [bu, setBu] = useState("");
  const [selectedProfil, setSelectedProfil] = useState<Profil | null>(null);
  const [showFormProfil, setShowFormProfil] = useState(false);

  /* ===== Options BU ===== */
  const buOptions = [
    { value: "", label: "Toutes les BU" },
    ...Array.from(
      new Set(
        profils
          .map(p => getPosteActuel(p)?.bu.name)
          .filter(Boolean)
      )
    ).map(name => ({
      value: name as string,
      label: name as string,
    })),
  ];

  /* ===== Filtrage ===== */
  const filteredProfils = profils.filter(p => {
    const matchSearch =
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.prenom.toLowerCase().includes(search.toLowerCase()) ||
      p.matricule.toLowerCase().includes(search.toLowerCase());

    const currentBu = getPosteActuel(p)?.bu.name;
    const matchBu = bu ? currentBu === bu : true;

    return matchSearch && matchBu;
  });

  const columns = [
    { key: "matricule", label: "Matricule" },
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    {
      key: "contrat",
      label: "Contrat",
      render: (row: Profil) => getContractLabel((row as any).type_contrat ?? (row as any).typeContrat ?? (row as any).type_contrat),
    },
    {
      key: "date_integration",
      label: "Date intégration",
      render: (row: Profil) => fmt((row as any).date_integration ?? (row as any).dateIntegration ?? (row as any).date_embauche),
    },
    {
      key: "date_debauche",
      label: "Date débauche",
      render: (row: Profil) => fmt((row as any).date_debauche ?? (row as any).dateDebauche ?? null),
    },

    {
      key: "poste",
      label: "Poste",
      render: (row: Profil) =>
        getPosteActuel(row)?.poste.label ?? "—",
    },
    {
      key: "bu",
      label: "Business Unit",
      render: (row: Profil) =>
        getPosteActuel(row)?.bu.name ?? "—",
    },

    { key: "email_pro", label: "Email professionnel" },
    {
      key: "badge",
      label: "Badge numérique",
      render: (row: Profil) => {
        const certWithBadge = (row as any).certifications?.find((c: any) => c.badge);
        if (certWithBadge) {
          return (
            <a href={certWithBadge.badge} target="_blank" rel="noreferrer" className="badge-link">
              <img src={certWithBadge.badge} alt="badge" style={{ height: 26, borderRadius: 4 }} />
            </a>
          );
        }
        return "—";
      },
    },

    {
      key: "actions",
      label: "Actions",
      render: (row: Profil) => (
      <MenuListeProfils
        onView={() => {
          setSelectedProfil(row);
          setMode("view");
        }}
        onEdit={() => {
          setSelectedProfil(row);
          setMode("edit");
          setShowFormProfil(true);
        }}
      />
      ),
    },
  ];

  const handleEditProfil = (profil: Profil) => {
    setSelectedProfil(profil);   
    setShowFormProfil(true);    
  };
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  return (
    <div className="listeprofils-layout">
      <Header />

      <div className="listeprofils-wrapper">
        <aside className="listeprofils-sidebar">
          <Sidebar />
        </aside>

        <main className="listeprofils-main">
          <div className="container-fluid">

            <div className="row align-items-center mb-4">
              <div className="col-md-8">
                <Title
                  title="Gestion des collaborateurs"
                  subtitle="Postes, BU et compétences"
                />
              </div>

              <div className="col-md-4 text-end">
                <Button
                  label="Nouveau collaborateur"
                  icon={<FaPlus />}
                  onClick={() => {
                    setSelectedProfil(null);
                    setMode("edit");
                    setShowFormProfil(true);
                  }}
                />
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-4">
                <StatCard title="Total collaborateurs" value={profils.length} variant={["tomato","charcoal"]} />
              </div>
            </div>

            <FilterBar
              filters={[
                {
                  type: "text",
                  placeholder: "Nom, prénom ou matricule...",
                  onChange: setSearch,
                },
                {
                  type: "select",
                  options: buOptions,
                  value: bu,
                  onChange: setBu,
                },
              ]}
            />

            <div className="table-responsive mt-3">
              <Table columns={columns} data={filteredProfils} />
            </div>

          </div>
        </main>
      </div>
      {mode === "view" && (
        <FicheProfil
          profil={selectedProfil}
          onClose={() => {
            setSelectedProfil(null);
            setMode(null);
          }}
        />
      )}

      {mode === "edit" && (
        <FormProfil
          show={showFormProfil}
          profil={selectedProfil}
          onClose={() => {
            setShowFormProfil(false);
            setSelectedProfil(null);
            setMode(null);
          }}
          onSubmit={(updatedProfil) => {
            console.log("Profil modifié :", updatedProfil);
            setShowFormProfil(false);
            setSelectedProfil(null);
            setMode(null);
          }}
        />
      )}
    </div>
    
  );
  
};

export default ListeProfils;