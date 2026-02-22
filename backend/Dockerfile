FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Create uploads directory
RUN mkdir -p public/uploads/profiles

EXPOSE 5001

CMD ["node", "index.js"]
