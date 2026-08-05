import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocket } from './socket.js';
import { PuzzleQueue, PuzzleManager } from './PuzzleManagement.js';

const queue = new PuzzleQueue();
const server = createServer(createApp(queue));
const io = initSocket(server);
const manager = new PuzzleManager(queue, io);

server.listen(80, '0.0.0.0', () => {
    console.log("server running at http://192.168.0.105");
})
