export interface ProfilEtude {
  profilEtudeId: number;
  obtention?: string;
  diplomePdf?: string;

  diplome: {
    id: number;
    label: string;
  };

  filiere: {
    id: number;
    label: string;
  };

  etablissement: {
    id: number;
    label?: string;
  };
}
