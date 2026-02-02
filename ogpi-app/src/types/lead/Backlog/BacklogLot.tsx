export type BacklogPhase = {
  id: number;
  name: string;
  order: number;
  lotId: number;
  lines: any[] | null;
};

export type BacklogLot = {
  id: number;
  order: number;
  name: string;
  desc: string;
  backlogId: number;
  phases?: BacklogPhase[];
};

export interface BacklogLotOrderUpdate {
  id: number;
  order: number;
}