import express from 'express';
import cors from "cors";
import uploadRoute from "./uploadRoute";

const app = express();

app.use(cors());
app.use(express.json());
app.use('/', uploadRoute);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});