# CodeArena Backend API

🚀 Backend API for CodeArena - A mobile application that notifies users about upcoming coding contests and provides live stats from multiple platforms.

## 📋 Features

- **User Management**: Registration, login with email/password and OAuth (Google/GitHub)
- **Contest Management**: Fetch and display contests from LeetCode, Codeforces, CodeChef, AtCoder
- **Reminder System**: Set personalized reminders for contests
- **User Stats**: Track coding performance across platforms
- **Push Notifications**: Firebase Cloud Messaging integration
- **Caching**: Redis-based caching for optimal performance
- **Scalable Architecture**: Modular service structure

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: JWT, Passport.js (OAuth)
- **Notifications**: Firebase Cloud Messaging
- **Task Scheduling**: Node-Cron
- **Logging**: Winston
- **Validation**: Express-Validator

## 📁 Project Structure

```
codeArena-backend/
├── prisma/
│   └── schema.prisma    # Database schema
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation
│   └── server.js        # Entry point
├── logs/                # Application logs
├── tests/               # Test files
├── .env.example         # Environment variables template
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Redis (v6 or higher)
- Firebase account (for push notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd codeArena-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env
   ```
   Edit `.env` with your configuration.

4. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE codearena;
   ```

5. **Configure database connection**
   Update the `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/codearena"
   ```

6. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev
   ```
   Or use the npm script:
   ```bash
   npm run prisma:migrate
   ```

7. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

8. **Start Redis server**
   ```bash
   redis-server
   ```

9. **Set up Firebase**
   - Download your Firebase Admin SDK key (JSON file)
   - Save it as `firebase-admin-key.json` in the root directory
   - Update `FIREBASE_*` variables in `.env`

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
${BACKEND_URL}/api/v1

# Development example:
http://localhost:5000/api/v1

# Production example:
https://api.yourdomain.com/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| GET | `/auth/google` | Google OAuth | No |
| GET | `/auth/github` | GitHub OAuth | No |
| POST | `/auth/logout` | Logout user | Yes |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/profile` | Get user profile | Yes |
| PUT | `/users/profile` | Update user profile | Yes |
| POST | `/users/link-platform` | Link coding platform | Yes |
| DELETE | `/users/unlink-platform/:platform` | Unlink platform | Yes |

### Contest Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/contests` | Get all upcoming contests | No |
| GET | `/contests/:id` | Get contest details | No |
| GET | `/contests/platform/:platform` | Get contests by platform | No |

### Reminder Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/reminders` | Add contest reminder | Yes |
| GET | `/reminders` | Get user reminders | Yes |
| DELETE | `/reminders/:id` | Remove reminder | Yes |
| PUT | `/reminders/:id` | Update reminder settings | Yes |

### Stats Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/stats/:platform/:username` | Get user stats | Yes |
| GET | `/stats/all` | Get all linked platform stats | Yes |
| POST | `/stats/sync` | Force sync stats | Yes |

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- SQL injection prevention (Prisma ORM)

## 📊 Performance Optimization

- Redis caching for frequently accessed data
- Database query optimization with indexes
- Connection pooling
- Response compression
- Efficient API response structure

## 🔔 Background Jobs

- **Contest Fetcher**: Runs every hour to fetch latest contests
- **Notification Scheduler**: Checks every 5 minutes for pending reminders
- **Stats Updater**: Daily sync of user statistics

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

See `.env.example` for development and `.env.production.example` for production setup.

**Critical Variables:**
- `BACKEND_URL` - Your API base URL (required)
- `FRONTEND_URL` - Your frontend URL (required)
- `CORS_ORIGIN` - Allowed origins (required)
- `JWT_SECRET` - Strong secret for tokens (required)
- `DATABASE_URL` - PostgreSQL connection string (required)

## 🚢 Deployment

For production deployment, see the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

**Quick Deploy Options:**
- Traditional VPS (DigitalOcean, AWS EC2, Linode)
- Docker with docker-compose
- Platform-as-a-Service (Railway, Render, Heroku)

**Important:** All hardcoded URLs have been removed. Configure URLs via environment variables only.

## 📈 Monitoring

- Logs are stored in `logs/` directory
- Use Winston for structured logging
- Monitor Redis cache hit/miss ratio
- Track API response times

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Nikhil Mehra**

## 🔗 Related Projects

- CodeArena Mobile App (React Native)

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Made with ❤️ by Nikhil Mehra
