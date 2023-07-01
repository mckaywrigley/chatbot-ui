import * as express from 'express';
import path from 'path';

export const footer = express.Router();

footer.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/footer.html'));
});