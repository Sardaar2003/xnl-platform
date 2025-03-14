FROM node:18

WORKDIR /XNL_SOLUTIONS_PROJECT/services/account-service

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["npm", "start"] 