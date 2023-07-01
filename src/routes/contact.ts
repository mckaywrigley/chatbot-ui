import express from 'express';
import { renderContact } from '../components/contact';

const router = express.Router();

router.get('/contact', (req, res) => {
    res.send(renderContact());
});

export default router;