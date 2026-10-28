import { Card, GameStatus } from '../../types/game';

export interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  ping: number;
}

export interface MultiplayerRoom {
  code: string;
  host: RoomParticipant;
  guest: RoomParticipant | null;
  status: 'waiting' | 'in_game' | 'finished';
  gameStatus?: GameStatus;
  createdAt: number;
}

export type NetworkMessage =
  | { type: 'CREATE_ROOM'; hostName: string; avatar: string }
  | { type: 'JOIN_ROOM'; roomCode: string; guestName: string; avatar: string }
  | { type: 'ROOM_UPDATED'; room: MultiplayerRoom }
  | { type: 'PLAYER_MOVE'; roomCode: string; playerId: string; cardId: string }
  | { type: 'SEND_EMOTE'; roomCode: string; playerId: string; emoji: string }
  | { type: 'RESTART_REQUEST'; roomCode: string }
  | { type: 'ERROR'; message: string };

export interface NetworkAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  createRoom(hostName: string, avatar: string): Promise<MultiplayerRoom>;
  joinRoom(code: string, guestName: string, avatar: string): Promise<MultiplayerRoom>;
  sendMove(roomCode: string, card: Card): void;
  sendEmote(roomCode: string, emoji: string): void;
  onMessage(callback: (msg: NetworkMessage) => void): void;
}
