export interface ProfilCertification {
  id: number;
  label: string;
  obtention: string;
  validite?: string;
  score: number;
  badge?: string;

  organisme: {
    id: number;
    label?: string;
  };
}
