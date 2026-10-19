# Backend

Backend API for the CMF Design Assistant, supporting projects, authentication, and AI-powered conversations for automotive colour, material, and finish design.

## Tech Stack

- NestJS 11
- Fastify
- TypeScript
- Prisma ORM
- PostgreSQL
- Cookie-based authentication
- Swagger / OpenAPI
- Docker

## Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL, or Docker with Docker Compose
- Environment variables configured

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example environment file to `.env`:

```bash
cp .env.example .env
```

Important: The backend requires a Gemini API key for AI-powered features. Visit [Google AI Studio](https://aistudio.google.com/apikey) to get the API Key.
Please keep your API key private. Do not commit your .env file to version control.

### 3. Set up the database

Ensure PostgreSQL is running and the database exists.

Run Prisma migrations

```bash
pnpm prisma migrate dev
```

Generate the Prisma Client if required:

```bash
pnpm prisma generate
```

Use the migration commands appropriate to the project's existing workflow.

### 4. Start the development server

```bash
pnpm start:dev
```

The API should be available at:

```text
http://localhost:3000
```

## API Documentation

Swagger UI is configured at:

```text
http://localhost:3000/api/docs
```

The OpenAPI JSON document is available at:

```text
http://localhost:3000/api/docs-json
```

Use Swagger to inspect endpoints, request parameters, response schemas, and authentication requirements.

## Running with Docker

### Build and start

```bash
docker compose up -d --build
```

### View logs

```bash
docker compose logs -f
```

### Stop services

```bash
docker compose down
```
