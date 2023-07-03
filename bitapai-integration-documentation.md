### We have successfull implemented [BitAPAI](https://bitapai.io) into ChatUI

Here are the key changes that were made during this integration.

The changes that were made will be categorized into two parts:

1. Frontend
2. Backend

### Frontend

On the frontend we had to remove all the OpenAI integrations like entering the OpenAI api key, disclosure of affiliation with OpenAI etc.

- paused GetModels query
  - While OpenAI had several model options to choose for according to the API key provided, we didn't have to do that for BitAPAI
- replace chatgpt integrations with BitAPAI on frontend
  - Remove OpenAI, chatgpt words form frontend
- creating folder when no prompts were available didn't showed the folder
  - this issue was fixed by checking for if folders exists and removing old logic of checking if prompts exists to show folders
- We have added models select option
  - To provide models select option go to `~/utils/config/models.ts`
    - And provide the name for model

### Backend

One the backend we removed OpenAI's API integration and added constants, configs for BitAPAI

- added BitAPAI converstaion api call
  - Added a new api call to the BitAPAI's conversation api
  - Note: OpenAI's api supported stream data for response, while BitAPAI currently doesn't have stream it returns JSON and the JSON's response from assitant is sent back to client
- the BitAPAI conversation api call function was used to integrate it with the `/api/chat` api
- remove logic for models, tokens, temprature and encoding
  - Remove OpenAI specific implementations like models, tokens, temprature etc.
- OpenAI's api call was removed
- On the backend after adding the model to the `~/utils/config/models.ts` file we need to add api implementation for that model
  - On the `~/api/chat.ts` route add the logic for the model to return response to the frontend

_Note: not all commits are documented as they are self explanatory and consise. Please refer to commit log for any missing information about commits here_

### Important Notes

1. BitAPAI's api key can be either set by individual user for thier use on the UI or the developer can set a key as a environment variable in the `.env` files

2. If there are any changes of BitAPAI's request parameters, you can edit those parameters send on the `~/pages/api/chat.ts` file. Send any required parameters to `BitAPAIConversation` function call.

3. BitAPAI's implementation is on file `~/utils/server/index.ts`
   - Constant `BITAPAI_API_HOST` can be configured under `~/utils/app/const.ts`
   - Environment Variable for BITAPAI's api key must be set under name `BITAPAI_API_KEY`
   - Refer to [BitAPAI's docs](https://bitapai.io/docs/language-examples/node-js/) for details about integration
   - Response from BitAPAI comes in the assistant field of the json body and that is returned from the function.
