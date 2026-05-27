# SehatSetara

SehatSetara uses a self-managed PostgreSQL backend on your VPS and can run with Docker for a consistent deployment environment. Articles written by doctors are stored as HTML so formatting and embedded media are preserved.

## Architecture

```mermaid
flowchart LR
  U[Browser / Frontend React + Vite] -->|HTTP API| B[Backend Node.js + Express]
  B -->|SQL| P[(PostgreSQL on VPS)]
  B -->|BYTEA media_assets| P
  B -->|Media URLs| U
  subgraph Docker Compose on VPS
    B
    P
  end
```

Container roles:

1. `frontend` runs the React/Vite UI and talks to the backend API.
2. `backend` runs Express, auth, article publishing, media uploads, and database access.
3. `db` runs PostgreSQL and stores users, articles, and media binary data.

Docker helps deployment by keeping the runtime consistent across machines, reducing host-specific dependency issues, and making the whole stack reproducible with a single `docker compose up --build`.

## Data Storage

Articles are stored as HTML in `articles.content`, so bold, italic, underline, headings, links, and embedded media can be preserved. Media uploads are stored in PostgreSQL as binary data in `media_assets.data`.

If the backend is connected directly to your VPS PostgreSQL at `10.0.2.15`, use:

```bash
DATABASE_URL=postgresql://sehatsetara:sehatsetara@10.0.2.15:5432/sehatsetara
```

If the frontend runs outside Docker while the backend is on the VPS, set the API base URL to the VPS address so `/login`, `/articles`, `/profile`, and `/media` do not go to localhost:

```bash
VITE_API_BASE_URL=http://10.0.2.15:8080 npm run dev
```

If you run the stack with Docker Compose, that value is already wired to the `backend` service.

## Run Locally

```bash
npm install
cd backend
npm install
```

Start the backend and frontend in separate terminals:

```bash
cd backend
npm start
```

```bash
npm run dev
```

## Docker Compose

```bash
docker compose up --build
```

Open ports:

1. `5173` for frontend.
2. `8080` for backend API.
3. `5432` for PostgreSQL.

## Demo Login

On a fresh database, the backend seeds this account automatically:

```text
username: dokter
password: rahasia123
role: dokter
```

## Verify Data in PostgreSQL

There are three quick checks:

1. Publish an article from the doctor account, then refresh the home feed.
2. Query the backend debug endpoint:

```bash
curl http://localhost:8080/debug/database
```

3. Check the PostgreSQL tables directly:

```bash
docker compose exec db psql -U sehatsetara -d sehatsetara
SELECT id, username, role FROM users;
SELECT id, title, created_at FROM articles ORDER BY id DESC LIMIT 5;
SELECT id, filename, mime_type, byte_size FROM media_assets ORDER BY id DESC LIMIT 5;
```

## References

1. PostgreSQL Documentation - Data Types: https://www.postgresql.org/docs/current/datatype.html
2. PostgreSQL Documentation - Binary Data Types (`bytea`): https://www.postgresql.org/docs/current/datatype-binary.html
3. Docker Documentation - Compose: https://docs.docker.com/compose/
4. MDN Web Docs - `contenteditable`: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable
