import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname: string = dirname(fileURLToPath(import.meta.url));
const __public: string = join(__dirname, "public");

console.log(__dirname);

export function createApp() {
    const app = express()

    app.get('/', (req, res) => {
        res.sendFile(join(__public, "index.html"));
    })
    
    // Server from /public
    app.use(express.static(__public));

    return app;
}
