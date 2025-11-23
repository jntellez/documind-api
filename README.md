# Documind API

Official backend for the **Documind** mobile application. Its main function is to receive a URL from any web article and return a clean version, free of ads and distractions, ready for reading (Reader Mode).

Built with **Bun** and **Hono** for maximum performance and low latency.

## 🚀 Quick Start

### 1. Installation

Ensure you have [Bun](https://bun.sh/) installed.

```bash
# Clone the repository
git clone https://github.com/jntellez/documind-api.git
cd documind-api

# Install dependencies
bun install
```

### 2\. Run Server

```bash
bun dev
```

The server will start at: `http://localhost:3000`

## 🔌 Endpoints

| Method | Endpoint           | Description                                  | Auth? |
| :----- | :----------------- | :------------------------------------------- | :---- |
| `POST` | `/api/process-url` | Extracts and cleans content from a web page. | ❌    |

### Endpoint Details: `POST /api/process-url`

**Request Body:**

```json
{
  "url": "https://en.wikipedia.org/wiki/Bun_(software)"
}
```

**Success Response (200 OK):**

```json
{
  "title": "Bun (software) - Wikipedia",
  "content": "<div><h3>History</h3><p>Clean HTML content...</p></div>",
  "original_url": "https://en.wikipedia.org/wiki/Bun_(software)"
}
```

## 🛠️ Tech Stack

- **[Bun](https://bun.sh/):** JavaScript Runtime (fast Node.js replacement).
- **[Hono](https://hono.dev/):** Web Framework (lightweight and fast).
- **[Zod](https://zod.dev/):** Schema validation for API inputs.
- **Readability & JSDOM:** The engine that parses and cleans HTML.
