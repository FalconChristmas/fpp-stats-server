FROM node:24-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 7654

CMD [ "node", "./index.js" ]
