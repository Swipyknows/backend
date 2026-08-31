# VideoTube - Backend API

A production-grade, feature-rich backend REST API for a YouTube-like video sharing platform built with **Node.js**, **Express.js**, **MongoDB**, **JWT Authentication**, and **Cloudinary** media storage.

---

## 🚀 Features

- 🔐 **Authentication & Authorization**: Secure User Registration, Login, Logout, JWT-based Access & Refresh Token rotation, HTTP-only cookies, and Password hashing using `bcrypt`.
- 👤 **User & Channel Management**: Profile updates, Avatar & Cover image uploads to Cloudinary, Channel profile metrics (Subscribers count, Subscribed channel count, and Subscription status using MongoDB Aggregation Pipelines).
- 📹 **Video Management**: Video upload with Thumbnail support, Video metadata updating, Deletion, Publishing/Unpublishing toggle, Search filtering, and Paginated listings using `mongoose-aggregate-paginate-v2`.
- 💬 **Comments System**: Add, View, and Delete comments on videos with populated user avatars and handles.
- 👍 **Likes System**: Toggle likes on videos and comments seamlessly.
- 🔔 **Subscriptions**: Subscribe/Unsubscribe to channels with self-subscription prevention.
- 📜 **Watch History**: Detailed user watch history with aggregation lookup.
- 🛡️ **Error Handling & Response Standardization**: Custom `ApiError` class and `Response` wrapper with global Express error handling middleware.

---

## 🛠️ Tech Stack

- **Runtime Environment:** [Node.js](https://nodejs.org/) (ES Modules)
- **Framework:** [Express.js v5](https://expressjs.com/)
- **Database & ODM:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) with [Mongoose v9](https://mongoosejs.com/)
- **Authentication:** [JSON Web Token (JWT)](https://jwt.io/), [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- **File Storage & Processing:** [Cloudinary SDK](https://cloudinary.com/), [Multer](https://github.com/expressjs/multer)
- **Utilities:** `cookie-parser`, `cors`, `dotenv`, `mongoose-aggregate-paginate-v2`, `nodemon`

---

## 📂 Directory Structure

```text
backend/
├── public/
│   └── temp/              # Temporary file uploads before Cloudinary processing
├── src/
│   ├── controllers/       # Controller logic for all features
│   │   ├── comment.controller.js
│   │   ├── like.controller.js
│   │   ├── subcription.controller.js
│   │   ├── user.controller.js
│   │   └── video.controller.js
│   ├── db/
│   │   └── dbi.js         # MongoDB database connection instance
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT verification middleware
│   │   └── multer.middleware.js # File handling middleware
│   ├── models/            # Mongoose Schemas & Models
│   │   ├── comment.model.js
│   │   ├── like.model.js
│   │   ├── subscription.model.js
│   │   ├── user.model.js
│   │   └── video.model.js
│   ├── routes/            # Express Routes
│   │   ├── comment.routes.js
│   │   ├── like.routes.js
│   │   ├── subscription.routes.js
│   │   ├── user.routes.js
│   │   └── video.routes.js
│   ├── utils/             # Helper classes & async handlers
│   │   ├── apierror.js
│   │   ├── apiresponse.js
│   │   ├── asynchandler.js
│   │   └── cloudinary.js
│   ├── app.js             # Express application setup
│   ├── constants.js       # App constants (DB Name)
│   └── index.js           # Server startup script
├── .env                   # Environment variables configuration
├── .gitignore
├── package.json
└── Readme.md
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=8000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net
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

3. **Configure Environment Variables:**
   Update your `.env` file with MongoDB and Cloudinary credentials.

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```

   The server will start at `http://localhost:8000`.

---

## 📡 API Endpoint Reference

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
- Cross-Origin Resource Sharing (CORS) is configured to only allow requests from specified origins.

---

## 📝 License

This project is licensed under the **ISC License**.
