import { useAuth } from "../../../context/AuthContext.tsx";
import { Techno } from "../../../types/lead/tech-fin/LeadTechFin.tsx";

export const useTechnoService = () => {
  const { api } = useAuth();

  const base = "/technos";

  const getAll = async (): Promise<Techno[]> => {
    const res = await api.get(base);
    return res.data;
  };

  const getById = async (id: number): Promise<Techno> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  const create = async (techno: Techno): Promise<Techno> => {
    const res = await api.post(base, techno);
    return res.data;
  };

  const update = async (techno: Techno): Promise<Techno> => {
    const res = await api.put(
      `${base}/${techno.id}`,
      techno
    );
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
