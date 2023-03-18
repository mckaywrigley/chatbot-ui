# Use the official Node.js image as the base image for the build stage
FROM node:16-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Build the Next.js app
RUN npm run build

# Use the official Node.js image as the base image for the runtime stage
FROM node:16-alpine AS runtime

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the build output from the build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]