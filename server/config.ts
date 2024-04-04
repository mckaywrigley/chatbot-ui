require('dotenv').config();

export const projectId = process.env.PROJECT_ID;
export const clientEmail = process.env.CLIENT_EMAIL;
export const privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'); // Correctly format new lines
export  const bucketName = process.env.BUCKET_NAME;
export const port = process.env.PORT || 3001;