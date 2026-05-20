export interface ProfilHardSkill {
  id: number;
  niveau: string;
  domaine: {
    id: number;
    label: string;
  };
}

export interface ProfilSoftSkill {
  id: number;
  domaine: {
    id: number;
    label: string;
  };
}
