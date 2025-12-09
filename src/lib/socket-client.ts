// ============================================
// QR ATTENDANCE SYSTEM - SOCKET CLIENT
// Cliente Socket.io para React
// ============================================

import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export const getSocket = (): TypedSocket => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket first.');
  }
  return socket;
};

export const initSocket = (
  token: string,
  userId: string,
  role: string
): TypedSocket => {
  if (socket?.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

  socket = io(serverUrl, {
    auth: {
      token,
      userId,
      role,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Conectado al servidor');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Desconectado:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Error de conexión:', error);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};
