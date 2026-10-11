# VideoTube - Backend API

A production-grade, feature-rich backend REST API for a YouTube-like video sharing platform built with **Node.js**, **Express.js**, **MongoDB**, **JWT Authentication**, **Cloudinary** media storage, **Redis/BullMQ**, and an **AI-powered Video Recommendation Engine**.

---

## 🚀 Features

- 🔐 **Authentication & Authorization**: Secure User Registration, Login, Logout, JWT-based Access & Refresh Token rotation, HTTP-only cookies, and Password hashing using `bcrypt`.
- 👤 **User & Channel Management**: Profile updates, Avatar & Cover image uploads to Cloudinary, Channel profile metrics (Subscribers count, Subscribed channel count, and Subscription status using MongoDB Aggregation Pipelines).
- 📹 **Video Management**: Video upload with Thumbnail support, Video metadata updating, Deletion, Publishing/Unpublishing toggle, Search filtering, and Paginated listings using `mongoose-aggregate-paginate-v2`.
- 🤖 **AI Video Recommendation System**: Content-based semantic filtering using `@xenova/transformers` (384-d dense vectors), user interest vector aggregation, hybrid scoring model (Semantic Similarity + Recency + Popularity), and background processing via **BullMQ & Redis**.
- 💬 **Comments System**: Add, View, and Delete comments on videos with populated user avatars and handles.
- 👍 **Likes System**: Toggle likes on videos and comments seamlessly with automatic preference vector recalculation.
- 🔔 **Subscriptions**: Subscribe/Unsubscribe to channels with self-subscription prevention.
- 📜 **Watch History**: Detailed user watch history with automatic AI recommendation feed refinement.
- 🛡️ **Error Handling & Response Standardization**: Custom `ApiError` class and `Response` wrapper with global Express error handling middleware.

---

## 🛠️ Tech Stack

- **Runtime Environment:** [Node.js](https://nodejs.org/) (ES Modules)
- **Framework:** [Express.js v5](https://expressjs.com/)
- **Database & ODM:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) with [Mongoose v9](https://mongoosejs.com/)
- **In-Memory Cache & Message Broker:** [Redis](https://redis.io/) via `ioredis`
- **Asynchronous Task Queues:** [BullMQ](https://docs.bullmq.io/)
- **AI & NLP Embeddings:** [@xenova/transformers](https://huggingface.co/docs/transformers.js) (`Xenova/all-MiniLM-L6-v2` 384-dimensional feature extraction)
- **Authentication:** [JSON Web Token (JWT)](https://jwt.io/), [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- **File Storage & Processing:** [Cloudinary SDK](https://cloudinary.com/), [Multer](https://github.com/expressjs/multer)
- **Utilities:** `cookie-parser`, `cors`, `dotenv`, `mongoose-aggregate-paginate-v2`, `nodemon`

---

## 📂 Directory Structure

```text
backend/
├── public/
│   └── temp/                  # Temporary file uploads before Cloudinary processing
├── src/
│   ├── controllers/           # Controller logic for all features
│   │   ├── comment.controller.js
│   │   ├── like.controller.js
│   │   ├── recommendation.controller.js # AI Recommendation endpoints
│   │   ├── subcription.controller.js
│   │   ├── user.controller.js
│   │   └── video.controller.js
│   ├── db/
│   │   ├── dbi.js             # MongoDB connection instance
│   │   └── redis.js           # Redis client connection instance
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT verification middleware
│   │   ├── cache.middleware.js  # Redis caching middleware
│   │   └── multer.middleware.js # File handling middleware
│   ├── models/                # Mongoose Schemas & Models
│   │   ├── comment.model.js
│   │   ├── like.model.js
│   │   ├── subscription.model.js
│   │   ├── user.model.js       # Includes interestVector & lastVectorUpdate
│   │   └── video.model.js      # Includes descriptionVector & tags
│   ├── queues/                # BullMQ Queue Definitions
│   │   ├── notification.queue.js
│   │   └── recommendation.queue.js # Video & User Interest task queues
│   ├── routes/                # Express Routes
│   │   ├── comment.routes.js
│   │   ├── like.routes.js
│   │   ├── recommendation.routes.js # Personalized & Similar video routes
│   │   ├── subscription.routes.js
│   │   ├── user.routes.js
│   │   └── video.routes.js
│   ├── utils/                 # Helper classes & AI services
│   │   ├── apierror.js
│   │   ├── apiresponse.js
│   │   ├── asynchandler.js
│   │   ├── cache.invalidate.js
│   │   ├── cloudinary.js
│   │   └── embedding.service.js # Xenova Transformers & vector utilities
│   ├── workers/               # BullMQ Worker Consumers
│   │   ├── notification.worker.js
│   │   └── recommendation.worker.js # Async vector generation workers
│   ├── app.js                 # Express application setup
│   ├── constants.js           # App constants
│   └── index.js               # Server startup script
├── scratch/
│   └── test_recommendation.js # Automated verification test script
├── .env                       # Environment variables configuration
├── package.json
└── Readme.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=8000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Ensure Redis is running:**
   ```bash
   redis-server
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

   The server will start at `http://localhost:8000`.

---

## 🤖 AI Video Recommendation System Architecture

The recommendation system implements a **Hybrid AI Architecture** combining content-based vector embeddings, user preference aggregation, and hybrid ranking with asynchronous background workers.

```text
[ Video Upload / Edit ] ──> [ videoEmbeddingQueue ] ──> [ Worker ] ──> [@xenova/transformers] ──> Store descriptionVector (384-d)
                                                                                                            │
[ User Watch / Like ]   ──> [ userInterestQueue ]  ──> [ Worker ] ──> [ Vector Aggregation ]   ──> Store interestVector (384-d)
                                                                                                            │
[ GET /recommendations ] ─────────────────────────────────────────────────────────────────────────> [ Hybrid Scoring Engine ]
                                                                                                      (60% Sim + 25% Rec + 15% Pop)
```

### 1. Vector Embedding Pipeline (`video-embeddings`)
1. **Trigger**: When a video is published, uploaded, or updated via `video.controller.js`, a job is added to `videoEmbeddingQueue`.
2. **Processing**: The BullMQ worker (`recommendation.worker.js`) extracts metadata (`title`, `description`, `tags`).
3. **Model**: Uses `@xenova/transformers` with `Xenova/all-MiniLM-L6-v2` locally on Node.js worker threads.
4. **Output**: Computes a normalized 384-dimensional dense float array saved to `video.descriptionVector`.

### 2. User Interest Aggregation Pipeline (`user-interests`)
1. **Trigger**: When a user watches a video (`getVideoById`) or likes a video (`likeVideoOrComment`), a job is added to `userInterestQueue`.
2. **Processing**: The worker collects the user's 20 most recent watched videos and liked videos with existing embeddings.
3. **Aggregation**: Applies linear recency decay weighting:
   $$\text{Weight}_i = 0.5 + 0.5 \times \frac{i}{N}$$
4. **Output**: Normalizes the aggregated vector and updates `user.interestVector` and `user.lastVectorUpdate`.

### 3. Hybrid Ranking Algorithm
When a user requests recommendations via `GET /api/v1/recommendations/personalized`:
- **Cosine Similarity Calculation**:
  $$\text{Similarity}(V_{\text{user}}, V_{\text{video}}) = \frac{V_{\text{user}} \cdot V_{\text{video}}}{\|V_{\text{user}}\| \|V_{\text{video}}\|}$$
- **Recency Score**: Exponential time-decay over 30 days:
  $$\text{RecencyScore} = e^{-\frac{\text{AgeInDays}}{30}}$$
- **Popularity Score**: Normalized view count relative to max candidate views.
- **Hybrid Recommendation Score**:
  $$\text{Score} = (0.60 \times \text{Similarity}) + (0.25 \times \text{RecencyScore}) + (0.15 \times \text{PopularityScore})$$
- **Cold-Start Handling**: If a new user has no interest vector yet, the feed falls back to $65\% \text{ RecencyScore} + 35\% \text{ PopularityScore}$.

---

## 📡 API Endpoint Reference

### 🤖 Recommendation Endpoints (`/api/v1/recommendations`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/personalized` | Yes | Get personalized video feed (supports `page`, `limit`) |
| `GET` | `/similar/:videoId` | No | Get similar videos for "Up Next" feed based on vector similarity |

---

### 👤 User Endpoints (`/api/v1/users`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | No | Register user (requires `avatar` and optional `coverImage` multipart files) |
| `POST` | `/login` | No | Login with username/email & password |
| `POST` | `/logout` | Yes | Logout user & clear cookies |
| `POST` | `/refresh_token` | No | Refresh expired Access Token |
| `POST` | `/change_password` | Yes | Change current password |
| `GET` | `/current_user` | Yes | Get logged-in user profile |
| `PATCH` | `/update_user` | Yes | Update full name and email |
| `PATCH` | `/update_avatar` | Yes | Update avatar image file |
| `PATCH` | `/update_coverimage` | Yes | Update cover image file |
| `GET` | `/c/:username` | Yes | Get channel details & subscriber metrics |
| `GET` | `/watch_history` | Yes | Get user's video watch history |

---

### 🎥 Video Endpoints (`/api/v1/videos`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | No | Get paginated video list (supports `query`, `userId`, `sortBy`, `sortType`, `page`, `limit`) |
| `POST` | `/upload` | Yes | Upload video and thumbnail (`video`, `thumbnail` files) |
| `POST` | `/` | Yes | Publish a video |
| `GET` | `/:videoId` | No | Fetch video details by ID |
| `PATCH` | `/:videoId` | Yes | Update video title & description |
| `DELETE` | `/:videoId` | Yes | Delete video |
| `PATCH` | `/:videoId/toggle_publish` | Yes | Toggle video publish/unpublish status |

---

### 💬 Comment Endpoints (`/api/v1/comments`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/:videoId` | Yes | Add comment to a video |
| `GET` | `/:videoId` | No | Fetch all comments for a video |
| `DELETE` | `/:commentId` | Yes | Delete comment (author only) |

---

### 👍 Like Endpoints (`/api/v1/likes`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/:videoId` | Yes | Toggle like on a video |
| `POST` | `/:commentId` | Yes | Toggle like on a comment |

---

### 🔔 Subscription Endpoints (`/api/v1/subscriptions`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/:channelId` | Yes | Toggle subscribe / unsubscribe to a channel |

---

## 🔒 Security Best Practices Implemented

- Passwords are saved hashed using `bcrypt` via pre-save Mongoose hooks.
- Sensitive fields like `password` and `refreshToken` are explicitly excluded from database queries using `.select("-password -refreshToken")`.
- Access and Refresh tokens are served via `httpOnly` and `secure` cookies to prevent XSS-based token theft.
- Vector calculations and heavy NLP models are offloaded to isolated background queues to protect HTTP main event loop performance.
- Cross-Origin Resource Sharing (CORS) is configured to only allow requests from specified origins.

---

## 📝 License

This project is licensed under the **ISC License**.
