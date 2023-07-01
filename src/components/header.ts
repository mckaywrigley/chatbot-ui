import * as express from 'express';
import { Request, Response } from 'express';
import * as path from 'path';

export class Header {
    public router = express.Router();

    constructor() {
        this.router.get('/', this.sendHeader);
    }

    public sendHeader = (req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../../styles/header.css'));
    }
}