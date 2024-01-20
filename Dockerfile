# Use the Node.js official image as a parent image
# FROM node:20
FROM node:21.5.0-bookworm

# Create a non-root user and switch to it
# RUN adduser --disabled-password myuser
# USER myuser

# Set the working directory in the container
WORKDIR /usr/src/app

# # Set ownership of the working directory to the non-root user
# RUN chown -R myuser:myuser /usr/src/app

# # Set appropriate permissions
# RUN chmod -R 755 /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) to the container working directory
COPY package*.json ./

# Install dependencies in production mode (without dev dependencies)
RUN npm cache clean -f
RUN npm ci

# Copy the rest of the application to the container working directory
COPY . .

# Build the Next.js application
RUN npm run build

# Set the environment to production to reduce Next.js application size
ENV NODE_ENV production

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "start"]
