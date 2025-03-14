FROM node:18

WORKDIR /XNL_SOLUTIONS_PROJECT/services/transaction-service

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3003

CMD ["npm", "start"] 