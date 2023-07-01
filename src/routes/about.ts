import express from 'express';
import { Header } from '../components/header';
import { Footer } from '../components/footer';
import { Navigation } from '../components/navigation';
import { renderToString } from 'react-dom/server';
import React from 'react';

const router = express.Router();

router.get('/about', (req, res) => {
  const header = renderToString(<Header />);
  const footer = renderToString(<Footer />);
  const navigation = renderToString(<Navigation />);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>About</title>
      </head>
      <body>
        ${header}
        ${navigation}
        <main>
          <h1>About Page</h1>
          <p>This is the about page of our TypeScript website.</p>
        </main>
        ${footer}
      </body>
    </html>
  `);
});

export { router as AboutRouter };