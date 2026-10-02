# node:24-slim (Debian) already ships everything run.sh needs: bash, GNU tar
# (for --null/--files-from), gzip, findutils and coreutils.
FROM node:24-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

CMD [ "/bin/bash", "./run.sh" ]
