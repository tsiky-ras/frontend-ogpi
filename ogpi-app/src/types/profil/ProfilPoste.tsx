export interface ProfilPoste {
  profilPosteId: number;
  startDate: string;
  endDate?: string;

  poste: {
    posteId: number;
    label: string;
  };

  bu: {
    buId: number;
    name: string;
  };
}
