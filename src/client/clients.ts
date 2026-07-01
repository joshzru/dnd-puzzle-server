import type { ServerToClientEvents, ClientToServerEvents } from '../SocketTypes.js';
import { io, Socket } from 'socket.io-client';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();