FROM node:18

WORKDIR /app

# Copy only package files first
COPY package.json package-lock.json ./

# 🔥 Install dependencies (THIS FIXES EVERYTHING)
RUN npm install

# Copy rest of the app
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]