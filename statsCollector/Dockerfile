FROM node:14

RUN apt-get update && apt-get install -y
    zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "/bin/bash", "./run.sh" ]
