# Recipe Manager

A full-stack recipe management app with a public-facing site and a private backoffice. Users authenticate via Google OAuth and can create, edit, and publish recipes. The public site displays recipes organized by cuisine category with filtering, search, and slug-based URLs.

**Live site:** https://recipe-manager-woad-one.vercel.app

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3, TypeScript, Vite, Tailwind CSS, Pinia, Vue Router |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 |
| Auth | Google OAuth (server-side redirect flow), JWT |
| Storage | Cloudflare R2 (cover images) |
| Dev DB | Docker Compose |

## Features

**Public site**
- Homepage with configurable category sections (grid or slider layout)
- Recipe listing with search, difficulty filter, and category filter pills
- Category pages with subcategory drill-down and recursive recipe queries (shows all descendant cuisine recipes)
- Recipe detail pages with slug-based URLs, servings scaler, ingredient sections, similar recipes carousel, and most-viewed carousel
- Configurable navigation menu managed from the backoffice

**Backoffice** (authenticated users)
- Recipe CRUD with sectioned ingredients/instructions, category tagging, cover image upload, and visibility control
- Category tree management (up to 3 levels deep) with homepage section configuration
- Homepage section manager: configure Featured Recipes and Most Viewed sections (style, item count, position)
- Navigation item manager: category links, recipe links, custom URLs, featured/most-viewed shortcuts, parent/child dropdowns with subcategory selection
- Admin-only user management: create users, assign roles, enable/disable accounts

## Architecture

```
recipe-manager-vue-node/
  backend/          Express API (TypeScript, compiled with tsc)
    src/
      controllers/  Request handlers
      services/     Business logic and DB queries
      routes/       Route definitions
      middleware/   Auth, error handling, file upload
      validators/   Zod schemas
      db/           migrate.ts, seed.ts, connection pool
      types/        Shared TypeScript interfaces
  frontend/         Vue 3 SPA (Vite)
    src/
      views/        Page components (public/ and backoffice)
      components/   Shared UI (RecipeCard, SliderRow, modals)
      api/          publicApi.ts (unauthenticated), recipeApi.ts, categoryApi.ts, etc.
      stores/       Pinia auth store
      types/        Recipe, Category, NavItem interfaces
      router/       Vue Router with auth guards
  docker-compose.yml  PostgreSQL 16 on port 5433
```

## API Endpoints

All authenticated routes require `Authorization: Bearer <token>`.

### Auth — `/api/v1/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/google` | Exchange Google ID token for JWT |
| GET | `/me` | Current user |
| POST | `/logout` | Invalidate session |

### Recipes — `/api/v1/recipes` (auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List own recipes (search, sort, paginate) |
| POST | `/` | Create recipe |
| GET | `/:id` | Get recipe by ID |
| PATCH | `/:id` | Update recipe |
| DELETE | `/:id` | Delete recipe |

### Public — `/api/v1/public` (no auth)
| Method | Path | Description |
|---|---|---|
| GET | `/recipes` | List public recipes (search, filter, paginate) |
| GET | `/recipes/featured` | Featured recipes |
| GET | `/recipes/most-viewed` | Most viewed recipes |
| GET | `/recipes/:slug` | Recipe detail (increments view count) |
| GET | `/homepage` | Category sections for homepage |
| GET | `/categories` | Full category tree |
| GET | `/categories/:slug` | Category page with recursive recipes |
| GET | `/nav` | Active navigation items |

### Categories — `/api/v1/categories` (auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Flat list with recipe counts |
| POST | `/` | Create category |
| GET | `/:id` | Single category with ancestors |
| PATCH | `/:id` | Update category |
| DELETE | `/:id` | Delete category |

### Navigation — `/api/v1/nav-items` (auth required)
Standard CRUD: `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`

### Homepage Specials — `/api/v1/homepage-specials` (auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/` | List featured and most-viewed section config |
| PATCH | `/:type` | Update section (type: `featured` or `most_viewed`) |

### Upload — `/api/v1/upload` (auth required)
| Method | Path | Description |
|---|---|---|
| POST | `/cover-image` | Upload image to R2, returns URL |

### Admin — `/api/v1/admin` (admin role required)
| Method | Path | Description |
|---|---|---|
| GET | `/users` | List users |
| POST | `/users` | Create user |
| PATCH | `/users/:id` | Edit user |
| PATCH | `/users/:id/toggle-active` | Enable/disable user |

## Setup

### Prerequisites
- Node.js 18+
- Docker (for local PostgreSQL)

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in JWT_SECRET, GOOGLE_CLIENT_ID, R2 credentials
npm install
npm run migrate
npm run dev            # runs on port 4003
```

### 3. Seed data (optional — 75 recipes across 12 cuisines)
```bash
cd backend
npx tsx src/db/seed.ts
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev            # runs on port 5173
```

### Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | API port (default 4003) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `ADMIN_EMAIL` | Email to seed as the first admin user |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public CDN URL for the R2 bucket |

## Security

- Passwords are never stored — authentication is Google OAuth only
- JWTs are short-lived with server-side revocation on logout
- Rate limiting on authentication and API endpoints
- HTTP security headers on all responses (via Helmet)
- Admin endpoints require both authentication and the `admin` role
- File uploads are validated by MIME type and size before reaching R2
- Zod validates all incoming request bodies; raw SQL uses parameterized queries throughout
- Audit log records authentication events and destructive actions with IP and user context
