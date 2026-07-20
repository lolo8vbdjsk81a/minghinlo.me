FROM node:22-alpine
WORKDIR /app
COPY src/package.json src/yarn.lock ./
RUN yarn install
COPY src/ .
EXPOSE 3000
CMD ["yarn", "start"]
