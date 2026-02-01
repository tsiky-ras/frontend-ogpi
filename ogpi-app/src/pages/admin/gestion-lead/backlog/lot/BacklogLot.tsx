export type BacklogLot = {
    id: number;
    order: number;
    name: string;
    desc: string;
    backlogId: number;
  };
export interface BacklogLotOrderUpdate {
    id: number;
    order: number;
}