import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { VideoProgress } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  joinRoom: (userId: string) => void;
  leaveRoom: (userId: string) => void;
}

interface SocketEvents {
  onVideoProgress?: (progress: VideoProgress) => void;
  onVideoCompleted?: (data: { videoId: string; status: string }) => void;
  onVideoFailed?: (data: { videoId: string; status: string; error: string }) => void;
}

export const useSocket = (events?: SocketEvents): UseSocketReturn => {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    
    socketRef.current = io(wsUrl, {
      transports: ['websocket'],
      timeout: 5000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    // Register event handlers
    if (events?.onVideoProgress) {
      socket.on('video-progress', events.onVideoProgress);
    }

    if (events?.onVideoCompleted) {
      socket.on('video-completed', events.onVideoCompleted);
    }

    if (events?.onVideoFailed) {
      socket.on('video-failed', events.onVideoFailed);
    }

    return () => {
      socket.disconnect();
    };
  }, [events]);

  const joinRoom = (userId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', userId);
      console.log(`Joined room: user-${userId}`);
    }
  };

  const leaveRoom = (userId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', userId);
      console.log(`Left room: user-${userId}`);
    }
  };

  return {
    socket: socketRef.current,
    connected,
    joinRoom,
    leaveRoom,
  };
};