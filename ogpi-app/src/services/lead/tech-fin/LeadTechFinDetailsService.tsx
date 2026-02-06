import { useAuth } from "../../../context/AuthContext.tsx";
import { LeadTechFinDetails } from "../../../types/lead/tech-fin/LeadTechFin.tsx";

export const useLeadTechFinDetailsService = () => {
  const { api } = useAuth();

  const base = "/lead-tech-fin-details";

  /**
   * Création
   * POST /api/lead-tech-fin-details
   */
  const create = async (
    data: LeadTechFinDetails
  ): Promise<LeadTechFinDetails> => {
    const res = await api.post(base, data);
    return res.data;
  };

  /**
   * Récupération par ID
   * GET /api/lead-tech-fin-details/{id}
   */
  const getById = async (id: number): Promise<LeadTechFinDetails> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  /**
   * Récupération par lead (ou création auto si inexistant)
   * GET /api/lead-tech-fin-details/lead/{leadId}
   */
  const getByLeadId = async (
    leadId: number
  ): Promise<LeadTechFinDetails> => {
    const res = await api.get(`${base}/lead/${leadId}`);
    return res.data;
  };

  /**
   * Mise à jour
   * PUT /api/lead-tech-fin-details/{id}
   */
  const update = async (
    data: LeadTechFinDetails
  ): Promise<LeadTechFinDetails> => {
    const res = await api.put(`${base}/${data.idLeadTechFinDetails}`, data);
    return res.data;
  };

  /**
   * Suppression
   * DELETE /api/lead-tech-fin-details/{id}
   */
  const remove = async (id: number): Promise<void> => {
    await api.delete(`${base}/${id}`);
  };

  return {
    create,
    getById,
    getByLeadId,
    update,
    remove,
  };
};
