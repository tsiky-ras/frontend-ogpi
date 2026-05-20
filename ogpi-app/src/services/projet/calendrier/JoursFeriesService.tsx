// src/services/calendrier/JoursFeriesService.ts

import { AxiosInstance } from 'axios';
import {
  JourFerie,
  JourFerieForm,
  ProchainOuvrableResponse,
  VerifierDateResponse,
} from '../../types/calendrier/JourFerie';

export class JoursFeriesService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  // ── Lecture ──────────────────────────────────────────────────────────────

  async getAll(): Promise<JourFerie[]> {
    const { data } = await this.api.get('/jours-feries');
    return data;
  }

  async getAllActifs(): Promise<JourFerie[]> {
    const { data } = await this.api.get('/jours-feries/actifs');
    return data;
  }

  async getForYear(annee: number): Promise<JourFerie[]> {
    const { data } = await this.api.get(`/jours-feries/annee/${annee}`);
    return data;
  }

  async getById(id: number): Promise<JourFerie> {
    const { data } = await this.api.get(`/jours-feries/${id}`);
    return data;
  }

  // ── Vérification métier ───────────────────────────────────────────────────

  /**
   * Vérifie si une date (yyyy-MM-dd) est un jour férié malgache.
   */
  async verifierDate(date: string): Promise<VerifierDateResponse> {
    const { data } = await this.api.get('/jours-feries/verifier', { params: { date } });
    return data;
  }

  /**
   * Retourne le prochain jour ouvrable à partir d'une date.
   * Si la date n'est pas fériée, elle est retournée inchangée.
   */
  async prochainOuvrable(date: string): Promise<ProchainOuvrableResponse> {
    const { data } = await this.api.get('/jours-feries/prochain-ouvrable', { params: { date } });
    return data;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(form: JourFerieForm): Promise<JourFerie> {
    const { data } = await this.api.post('/jours-feries', form);
    return data;
  }

  async update(id: number, form: JourFerieForm): Promise<JourFerie> {
    const { data } = await this.api.put(`/jours-feries/${id}`, form);
    return data;
  }

  async setActif(id: number, actif: boolean): Promise<void> {
    await this.api.patch(`/jours-feries/${id}/actif`, null, { params: { actif } });
  }

  async delete(id: number): Promise<void> {
    await this.api.delete(`/jours-feries/${id}`);
  }

  /**
   * Génère les 4 fériés mobiles Pâques pour une année.
   * Idempotent — ne duplique pas si déjà présents.
   */
  async genererPaques(annee: number): Promise<JourFerie[]> {
    const { data } = await this.api.post(`/jours-feries/generer-paques/${annee}`);
    return data;
  }
}
