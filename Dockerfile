FROM node:22-alpine

COPY package.json yarn.lock ./
RUN yarn

COPY . .
EXPOSE 50100
CMD ["yarn", "nodemon"]
