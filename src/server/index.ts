import { createServer } from 'node:http';
import { createApp } from './app.js';
import { initSocket } from './socket.js';

const server = createServer(createApp());
initSocket(server);

server.listen(80, '0.0.0.0', () => {
    console.log("server running at http://192.168.0.105:3000");
})
