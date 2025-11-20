# API Documentation - CodeArena Backend

> **Environment Aware:** This documentation uses `http://localhost:5000` for development examples.  
> **Production:** Replace with your `BACKEND_URL` environment variable.  
> See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup.

## Base URL
```
Development: http://localhost:5000/api/v1
Production:  ${BACKEND_URL}/api/v1
```

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123!",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "username": "johndoe",
      "isVerified": false
    },
    "requiresVerification": true
  }
}
```

**Note:** After registration, user must verify email with OTP before logging in.

### 2. Verify OTP
**POST** `/auth/verify-otp`

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Features:**
- OTP stored in Redis with 10-minute TTL
- Welcome email sent after verification
- Tokens issued only after verification

### 3. Resend OTP
**POST** `/auth/resend-otp`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Rate Limiting:** 1 request per 60 seconds

### 4. Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Login Activity Tracking:**
- Automatically captures IP address (IPv4/IPv6 normalized)
- Detects device, browser, and OS from User-Agent
- Stores login timestamp
- View history with `/auth/login-history`

**Requirements:**
- Email must be verified
- Account must be active

### 5. Refresh Token
**POST** `/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### 6. Logout
**POST** `/auth/logout` (Protected)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

### 7. Get Current User
**GET** `/auth/me` (Protected)

### 8. Get Login History
**GET** `/auth/login-history?limit=10` (Protected)

**Query Parameters:**
- `limit` (optional, default: 10): Number of login records to return

**Response:**
```json
{
  "success": true,
  "message": "Login history retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "ipAddress": "192.168.1.100",
      "deviceInfo": "Chrome on Windows 10",
      "browser": "Chrome 120.0",
      "os": "Windows 10",
      "loginAt": "2025-11-19T14:30:00.000Z"
    }
  ]
}
```

**Features:**
- IP extraction handles proxies (`X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`)
- IPv6 normalization (e.g., `::ffff:192.168.1.1` → `192.168.1.1`)
- User-Agent parsing for browser/OS detection
- Ordered by most recent first
- Security monitoring & fraud detection

**Use Cases:**
- Show "Last login from Chrome on Windows"
- Detect suspicious logins from new IPs/devices
- Multi-device session management
- Login analytics

### 9. Check Username Availability
**GET** `/auth/check-username?username=johndoe`

### 10. Check Email Availability
**GET** `/auth/check-email?email=john@example.com`

### 11. Update FCM Token
**POST** `/auth/fcm-token` (Protected)

**Request Body:**
```json
{
  "fcmToken": "firebase_token_here"
}
```

### 12. Update Phone Number
**POST** `/auth/phone-number` (Protected)

**Request Body:**
```json
{
  "phoneNumber": "+919876543210"
}
```

**Format:** E.164 format required (`+country_code + number`)

### 13. Update Notification Preferences
**PUT** `/auth/notification-preferences` (Protected)

**Request Body:**
```json
{
  "notifyViaPush": true,
  "notifyViaWhatsApp": true,
  "notifyViaEmail": false
}
```

### 14. Test WhatsApp Notification
**POST** `/auth/test-whatsapp` (Protected)

Sends a test WhatsApp message to verify integration (requires phone number).

### 5. Get Current User
**GET** `/auth/me` (Protected)

### 6. Update FCM Token
**POST** `/auth/fcm-token` (Protected)

**Request Body:**
```json
{
  "fcmToken": "firebase_token_here"
}
```

---

## Contest Endpoints

### 1. Get All Contests
**GET** `/contests`

**Query Parameters:**
- `platform` (optional): leetcode, codeforces, codechef, atcoder
- `status` (optional): upcoming, ongoing, completed
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Example:**
```
GET /contests?platform=leetcode&status=upcoming&page=1&limit=10
```

### 2. Get Contest by ID
**GET** `/contests/:id`

### 3. Get Upcoming Contests
**GET** `/contests/upcoming?limit=10`

### 4. Get Contests by Platform
**GET** `/contests/platform/:platform?limit=20`

### 5. Sync Contests (Admin)
**POST** `/contests/sync`

---

## User Endpoints

### 1. Get User Profile
**GET** `/users/profile` (Protected)

### 2. Update User Profile
**PUT** `/users/profile` (Protected)

**Request Body:**
```json
{
  "username": "newusername",
  "fullName": "New Name",
  "timezone": "America/New_York",
  "notificationEnabled": true,
  "notificationTime": 30,
  "darkMode": true
}
```

### 3. Get User Dashboard
**GET** `/users/dashboard` (Protected)

### 4. Link Platform Account
**POST** `/users/link-platform` (Protected)

**Request Body:**
```json
{
  "platform": "codeforces",
  "platformUsername": "tourist"
}
```

### 5. Unlink Platform
**DELETE** `/users/unlink-platform/:platform` (Protected)

### 6. Get Linked Platforms
**GET** `/users/linked-platforms` (Protected)

### 7. Update Platform Username
**PUT** `/users/platform/:platform` (Protected)

**Request Body:**
```json
{
  "platformUsername": "new_username"
}
```

### 8. Delete Account
**DELETE** `/users/account` (Protected)

---

## Reminder Endpoints

### 1. Add Reminder
**POST** `/reminders` (Protected)

**Request Body:**
```json
{
  "contestId": "uuid-here",
  "reminderTime": 30
}
```

### 2. Get User Reminders
**GET** `/reminders` (Protected)

**Query Parameters:**
- `includeCompleted` (optional): true/false
- `page` (optional): Page number
- `limit` (optional): Items per page

### 3. Get Reminder Stats
**GET** `/reminders/stats` (Protected)

### 4. Get Reminder by ID
**GET** `/reminders/:id` (Protected)

### 5. Update Reminder
**PUT** `/reminders/:id` (Protected)

**Request Body:**
```json
{
  "reminderTime": 60
}
```

### 6. Delete Reminder
**DELETE** `/reminders/:id` (Protected)

---

## Stats Endpoints

### 1. Get All User Stats
**GET** `/stats` (Protected)

### 2. Get Stats Summary
**GET** `/stats/summary` (Protected)

### 3. Get Platform Stats
**GET** `/stats/:platform` (Protected)

**Example:**
```
GET /stats/codeforces
```

### 4. Sync Platform Stats
**POST** `/stats/:platform/sync` (Protected)

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Error Codes

- **400** - Bad Request (Validation errors)
- **401** - Unauthorized (Invalid or missing token)
- **403** - Forbidden (Insufficient permissions)
- **404** - Not Found (Resource not found)
- **409** - Conflict (Duplicate resource)
- **429** - Too Many Requests (Rate limit exceeded)
- **500** - Internal Server Error

---

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Registration**: 3 requests per hour

---

## Supported Platforms

- LeetCode (`leetcode`)
- Codeforces (`codeforces`)
- CodeChef (`codechef`)
- AtCoder (`atcoder`)
- HackerRank (`hackerrank`)
- HackerEarth (`hackerearth`)

---

## WebSocket Support (Future)

Real-time notifications and contest updates will be added in a future version.

---

## Testing

Use tools like Postman, Insomnia, or cURL to test the API endpoints.

**Example cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test123"}'
```
