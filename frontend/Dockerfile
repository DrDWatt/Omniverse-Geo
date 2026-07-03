FROM node:22-alpine

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY . /app

EXPOSE 19010
CMD ["npm", "run", "dev"]
