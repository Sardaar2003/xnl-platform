FROM node:18

WORKDIR /XNL_SOLUTIONS_PROJECT/services/user-service

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"] 