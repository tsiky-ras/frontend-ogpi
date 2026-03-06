import { useAuth } from "../../../context/AuthContext.tsx";

// Type réel retourné par le controller Java :
// { idProjetTechno, idProjetTechFinDetails, techno: { idTechno, nomTechno, descTechno } }
export type ProjetTechnoItem = {
  idProjetTechno?: number;
  idProjetTechFinDetails?: number;
  techno?: {
    idTechno: number;
    nomTechno: string;
    descTechno?: string;
  };
};

export const useProjetTechnoService = () => {
  const { api } = useAuth();

  const base = "/projet-technos";

  /**
   * GET /api/projet-technos/by-details/{id}
   * Retourne des ProjetTechnoItem[] (et non Techno[])
   */
  const getByDetailsId = async (
    id: number
  ): Promise<ProjetTechnoItem[]> => {
    const res = await api.get(`${base}/by-details/${id}`);
    return res.data;
  };


  const create = async (data: {
    idProjetTechFinDetails: number;
    techno: { idTechno: number };
  }) => {
    const res = await api.post(base, data);
    return res.data;
  };

  /**
   * DELETE /api/projet-technos/by-details/{id}
   */
  const deleteByDetailsId = async (
    id: number
  ): Promise<void> => {
    await api.delete(`${base}/by-details/${id}`);
  };

  return {
    getByDetailsId,
    create,
    deleteByDetailsId,
  };
};