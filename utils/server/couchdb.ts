import { COUCHDB_USER, COUCHDB_PASSWORD, COUCHDB_HOST, COUCHDB_PORT, COUCHDB_DATABASE } from "../app/const";

const url = `${COUCHDB_HOST}:${COUCHDB_PORT}/${COUCHDB_DATABASE}`;
const auth = `${COUCHDB_USER}:${COUCHDB_PASSWORD}`;
const headers = {
  'Authorization': `Basic ${btoa(auth)}`,
  'Content-Type': 'application/json'
};

export const getRequest = async (endpoint: string): Promise<Response> => {
    try {
      const response = await fetch(`${url}/${endpoint}`, {headers: headers});
  
      if (response.ok) {
        return await response;
      } else {
        throw new Error(`Failed to get records ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(error);
      return new Response('Error', { status: 500 });
    }
};

export const putRequest = async (endpoint: string, body: string): Promise<Response> => {
    try {
      const response = await fetch(`${url}/${endpoint}`, {
        method: 'PUT',
        headers: headers,
        body: body,
      });
  
      if (response.ok) {
        return await response;
      } else {
        throw new Error(`Failed to update record ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(error);
      return new Response('Error', { status: 500 });
    }
  };
