import express, { type NextFunction, type Express, type Request, type Response} from 'express';
import session from 'express-session';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PuzzleQueue } from './PuzzleManagement.js'
import 'dotenv/config';

const __dirname: string = dirname(fileURLToPath(import.meta.url));
const __public: string = join(__dirname, "public");
const __views: string = join(__dirname, "views");

console.log(__dirname);

export function createApp(manager: PuzzleQueue): Express {
    const app = express()

    // Use Middleware
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
        secret: getEnv("SESSION_SECRET"),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 // 1 hour
        },
    }));
    app.use('/puzzle', (req: Request, res: Response, next: NextFunction) => {
        const puzzleId = manager.getCurrentId();
        if ( puzzleId === null ) {
            res.sendStatus(404);
            return;
        }
        express.static(getPuzzleRoute(puzzleId))(req, res, next);
    })
    app.use(express.static(__public));

    app.get('/', (req: Request, res: Response) => {
        const puzzleId = manager.getCurrentId();
        if ( puzzleId === null ) return res.sendFile(join(__public, 'index.html'));
        const root = getPuzzleRoute(puzzleId);
        res.sendFile(join(root, 'index.html'));
    });
    app.get('/admin', requireAuth, (req, res) => {
        res.sendFile(join(__views, "admin.html"));
    });
    app.get("/admin/login", (req: Request, res: Response) => {
        res.sendFile(join(__views, "login.html"));
    })

    app.post("/admin/login", (req: Request, res: Response) => {
        const password = req.body.password;
        if ( password === getEnv("ADMIN_PASSWORD") ) {
            req.session.isAuth = true;
            return res.redirect("/admin");
        }
        res.redirect("/admin/login?error=1");
    })

    return app;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if ( req.session.isAuth ) return next();
    res.redirect("/admin/login");
}

function getEnv(key: string, fallback?: string): string {
    const value = process.env[key] ?? fallback;
    if ( value === undefined )
        throw new Error(`Missing required env var: ${key}`);
    return value;
}

function getPuzzleRoute(id: string) {
    return join(__views, 'puzzles', id);
}