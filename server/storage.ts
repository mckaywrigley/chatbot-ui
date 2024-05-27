import { Storage } from '@google-cloud/storage';
import {clientEmail, privateKey, projectId} from "@/server/config";


const storage = new Storage({
    projectId,
    credentials: {
        client_email: clientEmail,
        private_key: privateKey,
    },
});

export default storage;