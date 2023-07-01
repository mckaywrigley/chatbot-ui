import * as express from 'express';
import { Request, Response } from 'express';
import * as path from 'path';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

router.get('/about', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../public/about.html'));
});

router.get('/contact', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../public/contact.html'));
});

export default router;