# Base image
FROM node:20.10.0

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port (default 3000 from config.PORT)
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
