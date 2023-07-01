import express from 'express';
import { renderHome } from '../components/header.ts';
import { renderFooter } from '../components/footer.ts';
import { renderNavigation } from '../components/navigation.ts';
import { HOME_TITLE } from '../utils/constants.ts';

const router = express.Router();

router.get('/', (req, res) => {
    const header = renderHome();
    const footer = renderFooter();
    const navigation = renderNavigation();
    const title = HOME_TITLE;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            ${header}
            ${navigation}
            <main>
                <h1>Welcome to our home page!</h1>
            </main>
            ${footer}
        </body>
        </html>
    `);
});

export default router;