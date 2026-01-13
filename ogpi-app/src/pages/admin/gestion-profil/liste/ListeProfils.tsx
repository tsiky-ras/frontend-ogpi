import { useEffect, useState } from "react";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Table from "../../../../components/table/Table.tsx";
import FilterBar from "../../../../components/filters/FilterBar.tsx";
import { FaPlus } from "react-icons/fa";
import StatCard from "../../../../components/stat/StatCard.tsx";
import Title from "../../../../components/title/Title.tsx";
import Button from "../../../../components/button/Button.tsx";
import MenuListeProfils from "../menu/MenuListeProfils.tsx";
import { Profil } from "../../../../types/profil/Profil.tsx";
import FicheProfil from "../../gestion-profil/fiche/FicheProfil.tsx";
import FormProfil from "../../gestion-profil/form/FormProfil.tsx";
import { useProfilService } from "../../../../services/profil/ProfilService.tsx";
import { BusinessUnitService } from "../../../../services/profil/poste/BusinessUnitService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "./ListeProfils.css";

/* ================= UTIL ================= */
const getPosteActuel = (profil: Profil) =>
  profil.profilPostes?.find(p => !p.endDate);

const getBusinessUnitName = (profil: Profil) =>
  getPosteActuel(profil)?.businessUnit?.name ?? "—";

const getPosteLabel = (profil: Profil) =>
  getPosteActuel(profil)?.poste?.label ?? "—";

/* Helpers */
const getContractLabel = (c?: number) => {
  switch (c) {
    case 1: return "CDI";
    case 2: return "CDD";
    case 3: return "STAGE";
    default: return "—";
  }
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString() : "—";

/* ================= COMPONENT ================= */
const ListeProfils: React.FC = () => {
  const { getAll } = useProfilService();
  const { api } = useAuth();

  const [profils, setProfils] = useState<Profil[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [bu, setBu] = useState("");
  const [bus, setBus] = useState<{ id: number; name: string }[]>([]);

  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [showFormProfil, setShowFormProfil] = useState(false);
  const [selectedProfilId, setSelectedProfilId] = useState<number | null>(null);

  const [contrat, setContrat] = useState(""); // nouvel état pour le filtre contrat


  const selectedProfil =
    selectedProfilId !== null
      ? profils.find(p => p.id === selectedProfilId) ?? null
      : null;

  /* ===== Chargement BU ===== */
  const fetchBU = async () => {
    try {
      const buService = new BusinessUnitService(api);
      const data = await buService.getAll();
      setBus(data.map(b => ({ id: b.id, name: b.name })));
    } catch (err) {
      console.error("Erreur chargement BU", err);
    }
  };

  /* ===== Chargement profils ===== */
  const fetchProfils = async () => {
    try {
      const data = await getAll();
      console.log("Data profils fetched:", data);
      setProfils(data);
    } catch (err) {
      console.error("Erreur chargement profils", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfils();
    fetchBU();
  }, []);

  /* ===== Options BU ===== */
  const buOptions = [
    { value: "", label: "Toutes les BU" },
    ...bus.map(b => ({
      value: String(b.id),
      label: b.name,
    })),
  ];

  const contratOptions = [
  { value: "", label: "Tous les contrats" },
  { value: "1", label: getContractLabel(1) },
  { value: "2", label: getContractLabel(2) },
  { value: "3", label: getContractLabel(3) },
];

  /* ===== Filtrage ===== */
  const filteredProfils = profils.filter(p => {
    const searchLower = search.toLowerCase();

    const matchSearch =
      p.nom?.toLowerCase().includes(searchLower) ||
      p.prenom?.toLowerCase().includes(searchLower) ||
      p.matricule?.toLowerCase().includes(searchLower);

    const currentBuId = getPosteActuel(p)?.businessUnit?.id;
    const matchBu = bu ? String(currentBuId) === bu : true;

    const matchContrat = contrat ? String(p.contrat) === contrat : true;

    return matchSearch && matchBu && matchContrat;
  });


  /* ===== Colonnes tableau ===== */
  const columns = [
    { key: "matricule", label: "Matricule" },
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom(s)" },
    {
      key: "contrat",
      label: "Contrat",
      render: (row: Profil) =>
        getContractLabel((row as any).type_contrat ?? (row as any).contrat),
    },
    {
      key: "dateEmbauche",
      label: "Date d'embauche",
      render: (row: Profil) =>
        fmt((row as any).dateEmbauche ?? (row as any).dateEmbauche),
    },
    {
      key: "poste",
      label: "Poste",
      render: (row: Profil) => getPosteLabel(row),
    },
    {
      key: "businessUnit",
      label: "Business Unit",
      render: (row: Profil) => getBusinessUnitName(row),
    },
    { key: "emailPro", label: "Email professionnel" },
    { key: "telephone", label: "Téléphone" },
    {
      key: "actions",
      label: "Actions",
      render: (row: Profil) => (
        <MenuListeProfils
          onView={() => {
            setSelectedProfilId(row.id);
            setMode("view");
          }}
          onEdit={() => {
            setSelectedProfilId(row.id);
            setMode("edit");
            setShowFormProfil(true);
          }}
        />
      ),
    },
  ];

  if (loading) {
    return <div className="p-4">Chargement des collaborateurs...</div>;
  }

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
                    setSelectedProfilId(null);
                    setMode("edit");
                    setShowFormProfil(true);
                  }}
                />
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-4">
                <StatCard
                  title="Total collaborateurs"
                  value={profils.length}
                  variant={["tomato", "charcoal"]}
                />
              </div>
              <div className="col-md-4">
                <StatCard
                  title="Collaborateurs internes"
                  value={profils.filter(p => p.type === 1).length}
                  variant={["dim", "linen"]}
                />
              </div>
              <div className="col-md-4">
                <StatCard
                  title="Collaborateurs externes"
                  value={profils.filter(p => p.type === 2).length}
                  variant={["tuscan", "linen"]}
                />
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
                {
                  type: "select",
                  options: contratOptions,
                  value: contrat,
                  onChange: setContrat,
                },
              ]}
            />

            <div className="table-responsive mt-3">
              <Table columns={columns} data={filteredProfils} />
            </div>

          </div>
        </main>
      </div>

      {mode === "view" && selectedProfil && (
        <FicheProfil
          profil={selectedProfil}
          onClose={() => {
            setSelectedProfilId(null);
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
            setSelectedProfilId(null);
            setMode(null);
          }}
          onSubmit={() => {
            fetchProfils();
            setShowFormProfil(false);
            setSelectedProfilId(null);
            setMode(null);
          }}
        />
      )}
    </div>
  );
};

export default ListeProfils;
