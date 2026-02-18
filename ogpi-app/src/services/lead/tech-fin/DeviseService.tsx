import { useAuth } from "../../../context/AuthContext.tsx";
import { Devise } from "../../../types/lead/tech-fin/LeadTechFin.tsx";

export const useDeviseService = () => {
  const { api } = useAuth();

  const base = "/devises";

  const getAll = async (): Promise<Devise[]> => {
    const res = await api.get(base);
    return res.data;
  };

  const getById = async (id: number): Promise<Devise> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  const create = async (devise: Devise): Promise<Devise> => {
    const res = await api.post(base, devise);
    return res.data;
  };

  const update = async (devise: Devise): Promise<Devise> => {
    const res = await api.put(`${base}/${devise.id}`, devise);
    return res.data;
  };

  const remove = async (id: number): Promise<void> => {
    await api.delete(`${base}/${id}`);
  };

  return {
    getAll,
    getById,
    create,
    update,
    remove,
  };
};
