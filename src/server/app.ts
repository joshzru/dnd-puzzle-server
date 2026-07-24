import express, { type Express, type Request, type Response} from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname: string = dirname(fileURLToPath(import.meta.url));
const __public: string = join(__dirname, "public");

console.log(__dirname);

export function createApp(): Express {
    const app = express()

    app.get('/', (req: Request, res: Response) => {
        res.sendFile(join(__public, "index.html"));
    });
    app.get('/admin', (req, res) => {
        res.sendFile(join(__public, "admin.html"));
    });
    
    // Serve from /public
    app.use(express.static(__public));

    return app;
}
