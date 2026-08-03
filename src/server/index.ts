import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocket } from './socket.js';
import { PuzzleManager } from './PuzzleManagement.js';

const manager = new PuzzleManager();
const server = createServer(createApp(manager));
const io = initSocket(server);
manager.attachSocket(io.default);

server.listen(80, '0.0.0.0', () => {
    console.log("server running at http://192.168.0.105");
})
