# CookShare – Requirements (Final Project)

This document combines the official course requirements with the CookShare functional specification.

---

## 1. Course Requirements (Mandatory)

### 1.1 Threshold Requirements (Fail if missing)

1. **Sharing**
   - One user uploads content (text + image).
   - Another user can view it.

2. **External REST API**
   - The app must present content from an external REST API (not our own backend).

---

### 1.2 Architecture & Code

- **MVVM architecture**
- **ViewModel + LiveData**
- **Clean, modular code**
- **No code duplication**
- **Short, readable functions**

---

### 1.3 UI & Navigation

- **Fragments**
- **Navigation Component**
  - Single NavGraph
  - Typed parameter passing with **SafeArgs**
- **Material Design guidelines**

---

### 1.4 Networking Rules

- **No synchronous network calls**
- Use coroutines + proper loading indicators (spinners)

---

### 1.5 Data & Caching

- **Remote database**
  - Read & write **text and images**
- **Local storage using Room**
  - Must implement caching for:
    - **Objects**
    - **Images**
- **Firebase cannot be used as local store**
  - Firebase is allowed for:
    - Auth
    - Remote database
- Image libraries such as Picasso/Coil may be used for image loading.

---

### 1.6 Users

- User registration via **Firebase Authentication**
- Profile screen must exist
- Edit profile (name + image) is required
- Users can:
  - View their own posts
  - Edit a post (text + image)
  - Delete a post
- Auto-recognize logged-in user on next app launch
- Logout support

---

### 1.7 Git

- Project must be managed in Git from the start (not a last-minute upload).

---

## 2. CookShare – Application Goal

CookShare is a social cooking platform where users share structured recipes with photos, ingredients, and preparation steps, and engage through likes, comments, and saved recipes.

The app emphasizes cooking utility and structured content rather than being an Instagram-like experience.

---

## 3. Functional Requirements

### 3.1 Must Have (Core)

1. **Authentication**
   - Register with email, username, password
   - Login + validation
   - Password recovery (if feasible)
   - Auto-login
   - Logout

2. **Recipe Posting**
   - Upload one or more images
   - Title + short description
   - Ingredients list
   - Step-by-step instructions
   - Optional tags (e.g., Vegan, Dessert, Pasta)

3. **Multi-step Create Flow**
   - Step 1: Basic Info
   - Step 2: Images
   - Step 3: Ingredients
   - Step 4: Instructions
   - Step 5: Details
   - Publish

4. **Feed**
   - Global feed of recent recipes
   - Each item shows image, title, likes, comments

5. **Recipe Details**
   - Full recipe view
   - Display comments and like count

6. **Social Interaction**
   - Like/unlike
   - Add and view comments

7. **Profile**
   - Show user info (avatar, username, bio)
   - Show user's recipes
   - Edit profile

8. **Data Storage**
   - Firestore (or equivalent) for remote data
   - Storage service for images

9. **Local Cache**
   - Room caches:
     - Users
     - Recipes
     - Comments
     - Explore API results
   - Image loader cache + Room metadata

10. **External REST API Screen**
   - Explore screen showing:
     - Random/Trending recipes
     - Cuisines/categories
   - Cached in Room

---

### 3.2 Should Have (Enhancements)

- Saved/Favorites
- Notifications (likes/comments)
- Search by title/tag/user
- Filtering by category/cuisine/difficulty
- Dark/Light mode toggle

---

### 3.3 Future Improvements

- Follow system
- Rating system
- Shopping list generator
- Multilingual full support (English/Hebrew)
- Short video recipes

---

## 4. Non-Functional Requirements

- Responsive UI on common phone sizes
- Smooth scrolling in feed
- Clear loading and error states
- Stable offline/poor-network behavior using cached data

---

## 5. Acceptance Checklist

- [ ] MVVM + LiveData used across main flows
- [ ] Room used for objects + image-related caching
- [ ] Firebase Auth implemented
- [ ] Remote DB read/write for text + images
- [ ] Fragments + NavGraph
- [ ] SafeArgs used for navigation parameters
- [ ] No synchronous network calls
- [ ] External REST API screen implemented
- [ ] User can create/edit/delete their posts
- [ ] Profile edit implemented
- [ ] Git history shows incremental work

---
