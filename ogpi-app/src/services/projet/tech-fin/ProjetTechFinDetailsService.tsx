import { useAuth } from "../../../context/AuthContext.tsx";
import { ProjetTechFinDetails } from "../../../types/projet/tech-fin/ProjetTechFin.tsx";

export const useProjetTechFinDetailsService = () => {
  const { api } = useAuth();

  const base = "/projet-tech-fin-details";

  /**
   * Création
   * POST /api/projet-tech-fin-details
   */
  const create = async (
    data: ProjetTechFinDetails
  ): Promise<ProjetTechFinDetails> => {
    const res = await api.post(base, data);
    return res.data;
  };

  /**
   * GET /api/projet-tech-fin-details/{id}
   */
  const getById = async (
    id: number
  ): Promise<ProjetTechFinDetails> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  /**
   * GET /api/projet-tech-fin-details/projet/{projetId}
   */
  const getByProjetId = async (
    projetId: number
  ): Promise<ProjetTechFinDetails> => {
    const res = await api.get(`${base}/projet/${projetId}`);
    return res.data;
  };

  /**
   * PUT /api/projet-tech-fin-details/{id}
   */
  const update = async (
    data: ProjetTechFinDetails
  ): Promise<ProjetTechFinDetails> => {
    const res = await api.put(
      `${base}/${data.idProjetTechFinDetails}`,
      data
    );
    return res.data;
  };

  /**
   * DELETE
   */
  const remove = async (id: number): Promise<void> => {
    await api.delete(`${base}/${id}`);
  };

  return {
    create,
    getById,
    getByProjetId,
    update,
    remove,
  };
};