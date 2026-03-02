import { useAuth } from "../../../context/AuthContext.tsx";
import { Techno } from "../../../types/lead/tech-fin/LeadTechFin.tsx";

export const useProjetTechnoService = () => {
  const { api } = useAuth();

  const base = "/projet-technos";

  /**
   * GET technos par details
   */
  const getByDetailsId = async (
    id: number
  ): Promise<Techno[]> => {
    const res = await api.get(`${base}/by-details/${id}`);
    return res.data;
  };

  /**
   * CREATE
   */
  const create = async (data: {
    idProjetTechFinDetails: number;
    techno: { id: number };
  }) => {
    const res = await api.post(base, data);
    return res.data;
  };

  /**
   * DELETE by details
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