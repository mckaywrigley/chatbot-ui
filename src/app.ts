import express from 'express';
import homeRoutes from './routes/home';
import aboutRoutes from './routes/about';
import contactRoutes from './routes/contact';
import header from './components/header';
import footer from './components/footer';
import navigation from './components/navigation';

const app = express();

app.use('/', homeRoutes);
app.use('/about', aboutRoutes);
app.use('/contact', contactRoutes);

app.use(header);
app.use(footer);
app.use(navigation);

export default app;