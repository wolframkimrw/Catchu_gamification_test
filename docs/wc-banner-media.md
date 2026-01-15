# WC Banner Media - Design Notes

## Goal
Add an admin banner editor for rotating banners on the main page.
Each banner has an image and a link target:
- GAME: link to a game start route
- URL: link to an internal or external URL

## Data Model (backend)
Banner
- id: number
- name: string
- position: string (e.g. "TOP_GLOBAL")
- image_url: string (final URL used in frontend)
- link_type: "GAME" | "URL"
- game_id: number | null
- link_url: string | null
- is_active: boolean
- priority: number (lower = higher)
- start_at: datetime | null
- end_at: datetime | null
- created_at: datetime
- updated_at: datetime

Storage:
- Banner uploads stored under `media/wc-banner-media/` (reuse worldcup upload helper).
- If `image_file` is uploaded, server saves and returns `image_url`.
- If `image_url` is provided directly, server uses it as-is.

## API Design
Public (frontend):
GET `/api/games/banners/?position=TOP_GLOBAL`
- Returns active banners filtered by:
  - is_active = true
  - start_at <= now (or null)
  - end_at >= now (or null)
- Sorted by priority ASC, created_at DESC
- Response shape:
  - data: { banners: Banner[] }

Admin (admin UI):
GET `/api/admin/banners/`
POST `/api/admin/banners/`
PATCH `/api/admin/banners/{id}/`
DELETE `/api/admin/banners/{id}/`

Request fields:
- name
- position
- image_file (multipart) OR image_url
- link_type ("GAME" | "URL")
- game_id (required if link_type=GAME)
- link_url (required if link_type=URL)
- is_active
- priority
- start_at
- end_at

Validation:
- image_file or image_url required
- link_type=GAME => game_id required, link_url optional/ignored
- link_type=URL => link_url required, game_id null
- link_url must be http(s) or internal path (starts with "/")

## Frontend Behavior
Main page:
- Fetch banners list.
- Rotate banners (e.g. every 4-6 seconds).
- If list empty, fallback to existing default.

Linking:
- If link_type=GAME:
  - worldcup => `/worldcup/{gameId}/play`
  - psycho => `/psycho/{gameSlug}`
- If link_type=URL:
  - navigate to link_url directly

## Admin UI (summary)
Fields:
- Image: file upload + URL input (same UX as worldcup create)
- Link type: GAME / URL
- Game select (when GAME)
- Link URL input (when URL)
- is_active toggle
- priority
- start/end datetime (optional)

List view:
- Table with preview, name, position, link target, active, priority, dates
- Edit/delete actions
