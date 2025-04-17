FROM node:20

COPY package.json yarn.lock ./
RUN yarn

COPY . .
EXPOSE 50100
CMD ["yarn", "nodemon"]
