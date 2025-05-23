# Scaling Websockets with Turborepo

This repository demonstrates a scalable architecture for a monorepo-based project using Turborepo. It includes multiple applications and shared packages to build a real-time chat system with WebSocket and HTTP backends.

## Table of Contents

- [Overview](#overview)
- [Apps and Packages](#apps-and-packages)
- [Getting Started](#getting-started)
- [Development](#development)
- [Build](#build)
- [Features](#features)
- [Architecture](#architecture)
- [Useful Links](#useful-links)

---

## Overview

This project is a monorepo built with [Turborepo](https://turborepo.com/), designed to scale real-time applications using WebSocket and HTTP backends. It includes:

- A WebSocket backend for real-time communication.
- An HTTP backend for RESTful APIs.
- A Next.js frontend for the web application.
- Shared packages for database access, validation, and configuration.

---

## Apps and Packages

### Apps

- **`web`**: A [Next.js](https://nextjs.org/) app for the frontend.
- **`http-backend`**: An Express-based HTTP backend for user authentication and room management.
- **`websocket-backend`**: A WebSocket server for real-time chat functionality.

### Packages

- **`@repo/db`**: Prisma-based database access layer.
- **`@repo/common`**: Shared utilities, including Zod-based validation.
- **`@repo/eslint-config`**: Shared ESLint configurations.
- **`@repo/typescript-config`**: Shared TypeScript configurations.

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 10
- PostgreSQL database

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/your-repo/scaling-websockets.git
   cd scaling-websockets
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Set up the database:

   - Configure the database connection in `packages/db/.env`.
   - Run Prisma migrations:

     ```sh
     npx prisma migrate dev
     ```

4. Build the project:

   ```sh
   npm run build
   ```

---

## Development

To start the development servers for all apps:

```sh
npm run dev
```

### Individual Apps

- **Web**: `cd apps/web && npm run dev`
- **HTTP Backend**: `cd apps/http-backend && npm run dev`
- **WebSocket Backend**: `cd apps/websocket-backend && npm run dev`

---

## Build

To build all apps and packages:

```sh
npm run build
```

---

## Features

### Web App (`apps/web`)

- Built with Next.js.
- Dynamic theming with CSS variables.
- Integration with the WebSocket backend for real-time updates.

### HTTP Backend (`apps/http-backend`)

- User authentication with JWT.
- Room creation and chat management.
- Zod-based request validation.

### WebSocket Backend (`apps/websocket-backend`)

- Real-time communication using WebSocket.
- Room-based user management.
- Broadcast messages to room participants.

### Shared Packages

- **`@repo/db`**: Prisma ORM for database operations.
- **`@repo/common`**: Zod validation for user input.
- **`@repo/eslint-config`**: Centralized ESLint rules.
- **`@repo/typescript-config`**: Shared TypeScript configurations.

---

## Architecture

### Database Schema

The database schema is defined in `packages/db/prisma/schema.prisma`. It includes:

- **User**: Stores user credentials.
- **Room**: Represents chat rooms.
- **Chats**: Stores messages sent in rooms.

### WebSocket Flow

1. Users connect to the WebSocket server with a JWT token.
2. The server verifies the token and associates the user with a room.
3. Messages are broadcasted to all users in the room.

### HTTP API Endpoints

- **POST `/user/signup`**: User registration.
- **POST `/user/signin`**: User login.
- **POST `/user/createroom`**: Create a new chat room.
- **GET `/user/getchats`**: Fetch room chats.

---

## Useful Links

- [Turborepo Documentation](https://turborepo.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Zod Documentation](https://zod.dev/)

---

## License

This project is licensed under the MIT License.
