export interface IModel {
  id: string;
  name: string;
  endpoint: string;
  /**
   *
   * @param secret client's api secret key for thier choosen api
   * @param data Array of objects containing role and content key along with string values
   * @example [
      {
        role: 'system',
        content: 'Follow users instruction carefully. Respond properly',
      },
      {
        role: 'user',
        content: 'What is 1 + 1?'
      },
    ]
   * @returns
   */
  requestBuilder: (secret: string, data: any) => RequestInit;
  /**
   *
   * @param json gets response's json as param
   * @returns string that will be passed down to client chat
   */
  responseExtractor: (json: any) => string;
  /**
   *
   * @param triggered on response.status !== 200 json gets response's json as param
   * @returns string that will be passed down to client chat as error message
   */
  errorExtractor: (json: any) => string;
  defaultPrompt: string;
}
