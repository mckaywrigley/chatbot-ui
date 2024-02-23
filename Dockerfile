FROM node:20.11.1-bookworm-slim

COPY --chown=node:node . /home/node/app

USER node

WORKDIR /home/node/app

RUN npm install

EXPOSE 3000


# There is a major problem:
# When running `npm dev build` all environment variables are replaced in the code with the real values
# This is a problem because if the values are made available at build time, would mean that the sensitive values are then in the image.
# So for now, I stick to "npm run dev", because this way, variables can be passed with `docker container run --env-file=.env.local ...`

CMD ["npm", "run", "dev"]
