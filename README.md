# CookShare

CookShare is a social cooking platform where users can share recipes with photos, discover new dishes, and engage with the community through likes, comments, and saved recipes.

This project is built as a final Android course project and strictly follows the course architectural and technical requirements, including MVVM, LiveData, Room caching, Fragments, and Navigation Component with SafeArgs.

> Note: CookShare is **not** an Instagram-like clone. The focus is on structured recipe content, multi-step creation, and utility features (ingredients, steps, search, tags, saved recipes) with social engagement around cooking.

---

## Core Features (Must Have)

- **User Authentication**
  - Sign up / login with email, username, password
  - Auto-login on app restart
  - Logout

- **Home Feed**
  - Scrollable feed of recent recipes from all users
  - Each post contains image(s), title, short description, and social counters

- **Recipe Details**
  - Full recipe view with images, ingredients, and preparation steps

- **Create Recipe (Multi-step)**
  - Basic info → Images → Ingredients → Instructions → Details → Publish
  - Draft support (local)

- **Social Interaction**
  - Like/unlike recipes
  - Comment and view comments

- **Profile**
  - View user info and user’s posts
  - Edit profile (avatar + name/bio)

- **Data Storage**
  - Remote database for users/posts/comments (e.g., Firebase Firestore)
  - Local cache for objects and images using Room

- **External REST API Integration**
  - Explore screen presents content from a public external recipes API
  - Results cached locally in Room

---

## Enhancements (Should Have)

- Saved/Favorites
- Notifications for likes/comments
- Filtering by tags/cuisine/difficulty
- Dark/Light mode toggle

---

## Tech Stack

- **Kotlin**
- **MVVM + LiveData**
- **Room (SQLite) for local cache**
- **Fragments**
- **Navigation Component + SafeArgs**
- **Coroutines**
- **Firebase Authentication**
- **Firebase Firestore**
- **Firebase Storage (for images)**
- **Retrofit** (external REST API)
- **Coil/Picasso** (image loading)

---

## Architecture

Layered structure:

- `presentation/`
  - Fragments, ViewModels, UI state
- `domain/`
  - Use cases, repository interfaces, models
- `data/`
  - Repositories implementations
  - `local/` Room entities/DAOs
  - `remote/` Firestore/REST API sources
  - mappers

---

## Caching Strategy

- Remote data is fetched in a paged/gradual manner.
- **Objects cache**: Room stores key recipe/user/comment data.
- **Images cache**:
  - Image loader disk cache
  - Metadata/relationships cached in Room
- Firebase is **not** used as a local store.

---

## Screens & Navigation

Planned screens:

- Onboarding
- Login
- Sign Up
- Home Feed
- Recipe Details
- Create Recipe (multi-step)
- Profile
- Notifications
- Search/Explore
- Settings

Navigation is implemented using a single NavGraph and SafeArgs for typed parameter passing.

---

## Repository & Git

This project is managed with incremental commits from day one, with PRs for major milestones.

Recommended branch naming:
- `feature/auth`
- `feature/feed`
- `feature/create-recipe`
- `feature/explore-api`
- `feature/cache-room`

---

## Setup

1. Clone the repo.
2. Open in Android Studio.
3. Add `google-services.json`.
4. Enable Firebase Auth, Firestore, and Storage in your Firebase project.
5. Build and run.

---

## Documentation

- Requirements: `docs/requirements.md`
- Mockups: `docs/mockups.md` (add screenshots/exports)

---

## Roadmap

- [ ] Project skeleton + navigation
- [ ] Auth flow
- [ ] Firestore models & repositories
- [ ] Home feed + recipe details
- [ ] Create Recipe multi-step + draft
- [ ] Likes & comments
- [ ] Room caching
- [ ] External REST API Explore
- [ ] Notifications
- [ ] Polish UI & tests

---

## License

Educational use.
