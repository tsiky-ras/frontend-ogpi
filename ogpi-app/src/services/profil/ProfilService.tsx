import { useAuth } from "../../context/AuthContext.tsx";
import { Profil } from "../../types/profil/Profil.tsx";

export const useProfilService = () => {
  const { api } = useAuth();

  const base = "/profils";

  const getAll = async (): Promise<Profil[]> => {
    const res = await api.get(`${base}/all`);
    return res.data;
  };

  const getById = async (id: number): Promise<Profil> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  const create = async (profil: Profil): Promise<Profil> => {
    const res = await api.post(`${base}/create`, profil);
    return res.data;
  };

  const update = async (profil: Profil): Promise<Profil> => {
    const res = await api.put(`/profils/update/${profil.id}`, profil);
    return res.data;
  };

  const remove = async (id: number): Promise<void> => {
    await api.delete(`${base}/delete/${id}`);
  };

  return {
    getAll,
    getById,
    create,
    update,
    remove,
  };
};
