# World Cup Game Creation Spec

## Scope
Allow users to create a WORLD_CUP game with topic, title/description, and items
name + image. Thumbnail is optional; if missing, use the first item image.

## Required Inputs (user)
- Topic: WorldcupTopic id (parent_topic_id)
- Title
- Description
- Items: [{ name, image }]

## Server-Generated Fields
- slug: unique slug generated from title + random suffix
- storage_prefix: unique folder prefix for all images in this game
- status: ACTIVE (default)
- visibility: PRIVATE (default)
- created_by: request.user (nullable)
- thumbnail_image_url: explicit thumbnail or first item image

## Data Model Mapping
- Game
  - title, description, slug, type = WORLD_CUP
  - parent_topic_id, created_by_id
  - storage_prefix, thumbnail_image_url
  - status, visibility
- GameItem
  - game_id
  - name (optional)
  - file_name (image URL or object key)
  - sort_order

## Media Storage Strategy
### Option A: Object Storage (Recommended)
1) Client requests a presigned upload URL from backend.
2) Client uploads image directly to storage (S3/R2).
3) Client sends image URLs/keys to game create API.
Pros: scalable, safe, no large uploads through backend.

### Option B: Backend Upload (Simple, Riskier)
1) Client uploads images to backend.
2) Backend stores files under `backend/media/` and returns URLs.
Pros: simple; Cons: scaling, storage growth, security risk.

### Security Controls (Either Option)
- Validate file type (MIME + extension), size limit
- Enforce max items count per game
- Strip EXIF metadata if needed
- Use content scanning or allowlist image types only

## API Shape (Multipart)
- POST /api/games/worldcup/create/
  - Content-Type: multipart/form-data
  - Fields:
    - title (required)
    - description (optional)
    - parent_topic_id (optional)
    - thumbnail (optional file)
    - items[0].name, items[0].image (file)
    - items[1].name, items[1].image (file)
    - ...
- Response:
  - { game_id, slug, thumbnail_image_url }

## UX Flow
1) User fills topic/title/description.
2) User uploads item images + names.
3) Optional thumbnail upload.
4) Submit -> game created, items saved.
