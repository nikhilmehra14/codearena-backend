# CodeArena API Testing Guide

Complete guide for testing all API endpoints using Postman.

## Setup

### 1. Import Postman Collection
1. Open Postman
2. Click **Import** button
3. Select `CodeArena.postman_collection.json`
4. Collection will be imported with all endpoints

### 2. Configure Environment
The collection uses variables that are automatically set during test execution:
- `baseUrl`: `http://localhost:5000/api/v1`
- `accessToken`: Auto-set after login/verification
- `refreshToken`: Auto-set after login/verification
- `userId`: Auto-set after login/verification
- `testEmail`: Auto-set after registration
- `contestId`: Auto-set when fetching contests
- `reminderId`: Auto-set when creating reminders

### 3. Start Services
Ensure these services are running:
```bash
# PostgreSQL
# Redis
# Email SMTP (for OTP)

# Start the application
npm start
```

## Testing Flow

### Complete Registration & Login Flow

#### Step 1: Check Username Availability
**Endpoint:** `GET /auth/check-username?username=testuser123`

**Purpose:** Validate username before registration

**Expected:**
- ✅ Status: 200
- ✅ `available: true` if username is free
- ✅ Response time < 500ms

**Test Cases:**
```javascript
// Valid username
GET /auth/check-username?username=testuser123
// Expected: available: true

// Existing username
GET /auth/check-username?username=existinguser
// Expected: available: false

// Too short
GET /auth/check-username?username=ab
// Expected: 400 error

// Invalid characters
GET /auth/check-username?username=test@user
// Expected: 400 error
```

---

#### Step 2: Check Email Availability
**Endpoint:** `GET /auth/check-email?email=test@example.com`

**Purpose:** Validate email before registration

**Expected:**
- ✅ Status: 200
- ✅ `available: true` if email is free

**Test Cases:**
```javascript
// Valid email
GET /auth/check-email?email=newuser@example.com
// Expected: available: true

// Existing email
GET /auth/check-email?email=existing@example.com
// Expected: available: false

// Invalid format
GET /auth/check-email?email=invalidemail
// Expected: 400 error
```

---

#### Step 3: Register New User
**Endpoint:** `POST /auth/register`

**Body:**
```json
{
  "email": "test@example.com",
  "username": "testuser123",
  "password": "SecurePass123!",
  "fullName": "Test User"
}
```

**Expected:**
- ✅ Status: 201
- ✅ `requiresVerification: true`
- ✅ No access/refresh tokens (verification required)
- ✅ `isVerified: false`
- ✅ Email sent with 6-digit OTP
- ✅ `testEmail` variable auto-saved

**Test Cases:**
```javascript
// Valid registration
POST /auth/register
Body: { email, username, password, fullName }
// Expected: 201, requiresVerification: true

// Duplicate email
POST /auth/register
Body: { email: "existing@example.com", ... }
// Expected: 409 Conflict

// Weak password
POST /auth/register
Body: { ..., password: "weak" }
// Expected: 400 Bad Request

// Missing required fields
POST /auth/register
Body: { email: "test@example.com" }
// Expected: 400 Bad Request
```

---

#### Step 4: Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Body:**
```json
{
  "email": "{{testEmail}}",
  "otp": "123456"
}
```

**Expected:**
- ✅ Status: 200
- ✅ `isVerified: true`
- ✅ Access & refresh tokens provided
- ✅ Tokens auto-saved to variables
- ✅ Welcome email sent

**Test Cases:**
```javascript
// Valid OTP
POST /auth/verify-otp
Body: { email, otp: "correct_otp" }
// Expected: 200, tokens provided

// Invalid OTP
POST /auth/verify-otp
Body: { email, otp: "999999" }
// Expected: 400, Invalid OTP

// Expired OTP (after 10 minutes)
POST /auth/verify-otp
Body: { email, otp: "expired_otp" }
// Expected: 400, OTP expired

// Already verified
POST /auth/verify-otp
Body: { email: "verified@example.com", otp }
// Expected: 400, Email already verified

// User not found
POST /auth/verify-otp
Body: { email: "nonexistent@example.com", otp }
// Expected: 404, User not found
```

---

#### Step 5: Resend OTP (Optional)
**Endpoint:** `POST /auth/resend-otp`

**Body:**
```json
{
  "email": "{{testEmail}}"
}
```

**Expected:**
- ✅ Status: 200
- ✅ New OTP sent to email
- ✅ Rate limited (60 seconds cooldown)

**Test Cases:**
```javascript
// Valid resend
POST /auth/resend-otp
Body: { email }
// Expected: 200, OTP resent

// Too soon (within 60 seconds)
POST /auth/resend-otp (twice quickly)
// Expected: 400, Please wait X seconds

// Already verified
POST /auth/resend-otp
Body: { email: "verified@example.com" }
// Expected: 400, Email already verified
```

---

#### Step 6: Login
**Endpoint:** `POST /auth/login`

**Body:**
```json
{
  "email": "{{testEmail}}",
  "password": "SecurePass123!"
}
```

**Expected:**
- ✅ Status: 200
- ✅ Access & refresh tokens
- ✅ User must be verified
- ✅ Response time < 1000ms

**Test Cases:**
```javascript
// Successful login
POST /auth/login
Body: { email, password }
// Expected: 200, tokens provided

// Unverified user
POST /auth/login
Body: { email: "unverified@example.com", password }
// Expected: 401, Please verify your email

// Wrong password
POST /auth/login
Body: { email, password: "wrongpassword" }
// Expected: 401, Invalid credentials

// Non-existent user
POST /auth/login
Body: { email: "fake@example.com", password }
// Expected: 401, Invalid credentials

// OAuth user trying password login
POST /auth/login
Body: { email: "oauth@example.com", password }
// Expected: 401, Use Google/GitHub login
```

---

### Protected Endpoints Testing

All subsequent endpoints require authentication header:
```
Authorization: Bearer {{accessToken}}
```

#### Get Current User
**Endpoint:** `GET /auth/me`

**Expected:**
- ✅ Status: 200
- ✅ Complete user profile
- ✅ No password field
- ✅ Notification preferences included

**Test Cases:**
```javascript
// With valid token
GET /auth/me
Headers: { Authorization: "Bearer valid_token" }
// Expected: 200, user data

// Without token
GET /auth/me
// Expected: 401, Unauthorized

// With expired token
GET /auth/me
Headers: { Authorization: "Bearer expired_token" }
// Expected: 401, Token expired

// With invalid token
GET /auth/me
Headers: { Authorization: "Bearer invalid_token" }
// Expected: 401, Invalid token
```

---

#### Refresh Access Token
**Endpoint:** `POST /auth/refresh`

**Body:**
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected:**
- ✅ Status: 200
- ✅ New access token
- ✅ Refresh token remains valid

**Test Cases:**
```javascript
// Valid refresh token
POST /auth/refresh
Body: { refreshToken: "valid_refresh" }
// Expected: 200, new accessToken

// Expired refresh token
POST /auth/refresh
Body: { refreshToken: "expired_refresh" }
// Expected: 401, Token expired

// Revoked refresh token
POST /auth/refresh
Body: { refreshToken: "revoked_refresh" }
// Expected: 401, Token revoked

// Invalid refresh token
POST /auth/refresh
Body: { refreshToken: "invalid" }
// Expected: 401, Invalid token
```

---

### User Profile Management

#### Get User Profile
**Endpoint:** `GET /users/profile`

**Expected:**
- ✅ Status: 200
- ✅ Detailed profile with linked platforms
- ✅ Array of linked platforms

**Test Cases:**
```javascript
// Valid request
GET /users/profile
// Expected: 200, profile with linkedPlatforms array

// Unauthorized
GET /users/profile (no token)
// Expected: 401
```

---

#### Update User Profile
**Endpoint:** `PUT /users/profile`

**Body:**
```json
{
  "fullName": "Updated Name",
  "notificationEnabled": true,
  "notificationTime": 60
}
```

**Expected:**
- ✅ Status: 200
- ✅ Updated profile returned

**Test Cases:**
```javascript
// Valid update
PUT /users/profile
Body: { fullName: "New Name" }
// Expected: 200, updated data

// Update username (if unique)
PUT /users/profile
Body: { username: "newunique123" }
// Expected: 200

// Duplicate username
PUT /users/profile
Body: { username: "existinguser" }
// Expected: 409, Username taken

// Invalid notification time
PUT /users/profile
Body: { notificationTime: -5 }
// Expected: 400
```

---

#### Update FCM Token
**Endpoint:** `POST /auth/fcm-token`

**Body:**
```json
{
  "fcmToken": "firebase_cloud_messaging_token_here"
}
```

**Expected:**
- ✅ Status: 200
- ✅ FCM token saved

**Test Cases:**
```javascript
// Valid token
POST /auth/fcm-token
Body: { fcmToken: "valid_fcm_token" }
// Expected: 200

// Missing token
POST /auth/fcm-token
Body: {}
// Expected: 400, FCM token required
```

---

#### Update Phone Number
**Endpoint:** `POST /auth/phone-number`

**Body:**
```json
{
  "phoneNumber": "+919876543210"
}
```

**Expected:**
- ✅ Status: 200
- ✅ Phone number in E.164 format

**Test Cases:**
```javascript
// Valid E.164 format
POST /auth/phone-number
Body: { phoneNumber: "+919876543210" }
// Expected: 200

// Invalid format
POST /auth/phone-number
Body: { phoneNumber: "9876543210" }
// Expected: 400, Invalid format

// Missing country code
POST /auth/phone-number
Body: { phoneNumber: "9876543210" }
// Expected: 400
```

---

#### Update Notification Preferences
**Endpoint:** `PUT /auth/notification-preferences`

**Body:**
```json
{
  "notifyViaPush": true,
  "notifyViaWhatsApp": true,
  "notifyViaEmail": false
}
```

**Expected:**
- ✅ Status: 200
- ✅ Preferences updated

**Test Cases:**
```javascript
// Update all channels
PUT /auth/notification-preferences
Body: { notifyViaPush: true, notifyViaWhatsApp: true, notifyViaEmail: false }
// Expected: 200

// Update single channel
PUT /auth/notification-preferences
Body: { notifyViaWhatsApp: false }
// Expected: 200

// Invalid boolean values
PUT /auth/notification-preferences
Body: { notifyViaPush: "yes" }
// Expected: 400
```

---

#### Get Login History
**Endpoint:** `GET /auth/login-history?limit=10`

**Purpose:** View recent login activity with IP, device, browser, OS, and timestamp

**Expected:**
- ✅ Status: 200
- ✅ Array of login activities
- ✅ Each activity has: ipAddress, deviceInfo, browser, os, loginAt
- ✅ Ordered by most recent first

**Test Cases:**
```javascript
// Get last 10 logins
GET /auth/login-history
// Expected: 200, array with up to 10 activities

// Get last 5 logins
GET /auth/login-history?limit=5
// Expected: 200, array with up to 5 activities

// Get with large limit
GET /auth/login-history?limit=100
// Expected: 200, returns available activities

// Unauthorized access
GET /auth/login-history (no token)
// Expected: 401, Unauthorized

// Invalid limit
GET /auth/login-history?limit=abc
// Expected: Returns default 10 records
```

**Response Example:**
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
    },
    {
      "id": "uuid",
      "ipAddress": "203.0.113.45",
      "deviceInfo": "Safari on iOS 17.0",
      "browser": "Safari 17.0",
      "os": "iOS 17.0",
      "loginAt": "2025-11-18T10:15:00.000Z"
    }
  ]
}
```

**Verification Steps:**
1. Login from different devices/browsers
2. Check login history - should see multiple entries
3. Verify IP addresses are captured correctly
4. Verify device info is descriptive ("Chrome on Windows")
5. Verify timestamps are in descending order

**Security Checks:**
- ✅ IP addresses normalized (IPv6 → IPv4 if applicable)
- ✅ User-agent parsed correctly
- ✅ Only shows user's own login history
- ✅ Cannot access other users' history

---

### Platform Linking

#### Link Platform Account
**Endpoint:** `POST /users/link-platform`

**Body:**
```json
{
  "platform": "leetcode",
  "platformUsername": "your_leetcode_username"
}
```

**Supported Platforms:**
- leetcode
- codeforces
- codechef
- atcoder
- hackerrank
- hackerearth

**Expected:**
- ✅ Status: 201
- ✅ Platform linked with `isVerified: false`

**Test Cases:**
```javascript
// Valid platform link
POST /users/link-platform
Body: { platform: "leetcode", platformUsername: "testuser" }
// Expected: 201

// Already linked platform
POST /users/link-platform
Body: { platform: "leetcode", platformUsername: "another" }
// Expected: 409, Already linked

// Invalid platform
POST /users/link-platform
Body: { platform: "invalid", platformUsername: "test" }
// Expected: 400

// Missing username
POST /users/link-platform
Body: { platform: "leetcode" }
// Expected: 400
```

---

#### Get Linked Platforms
**Endpoint:** `GET /users/linked-platforms`

**Expected:**
- ✅ Status: 200
- ✅ Array of linked platforms
- ✅ Each has `platform`, `platformUsername`, `isVerified`

---

#### Update Platform Username
**Endpoint:** `PUT /users/platform/:platform`

**Body:**
```json
{
  "platformUsername": "updated_username"
}
```

**Expected:**
- ✅ Status: 200
- ✅ Username updated

---

#### Unlink Platform
**Endpoint:** `DELETE /users/unlink-platform/:platform`

**Expected:**
- ✅ Status: 200
- ✅ Platform unlinked

---

### Contests

#### Get All Contests
**Endpoint:** `GET /contests?page=1&limit=20&platform=leetcode&status=upcoming`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `platform` (optional): leetcode, codeforces, codechef, atcoder
- `status` (optional): upcoming, ongoing, completed
- `startDate` (optional): YYYY-MM-DD
- `endDate` (optional): YYYY-MM-DD

**Expected:**
- ✅ Status: 200
- ✅ Paginated contests array
- ✅ Pagination metadata

**Test Cases:**
```javascript
// Get all contests
GET /contests
// Expected: 200, paginated list

// Filter by platform
GET /contests?platform=leetcode
// Expected: 200, only leetcode contests

// Filter by status
GET /contests?status=upcoming
// Expected: 200, only upcoming

// Date range filter
GET /contests?startDate=2025-11-01&endDate=2025-12-31
// Expected: 200, contests in range

// Invalid page
GET /contests?page=0
// Expected: 400

// Invalid limit
GET /contests?limit=1000
// Expected: 400
```

---

#### Get Contest by ID
**Endpoint:** `GET /contests/:contestId`

**Expected:**
- ✅ Status: 200
- ✅ Complete contest details
- ✅ `contestId` saved to variable

**Test Cases:**
```javascript
// Valid contest ID
GET /contests/valid-uuid
// Expected: 200, contest details

// Invalid contest ID
GET /contests/invalid-id
// Expected: 404, Contest not found
```

---

#### Get Upcoming Contests
**Endpoint:** `GET /contests/upcoming?limit=10`

**Expected:**
- ✅ Status: 200
- ✅ Array of upcoming contests
- ✅ All startTime > now

---

#### Get Contests by Platform
**Endpoint:** `GET /contests/platform/:platform?limit=20`

**Expected:**
- ✅ Status: 200
- ✅ Platform-specific contests

---

#### Sync Contests (Manual)
**Endpoint:** `POST /contests/sync`

**Expected:**
- ✅ Status: 200
- ✅ `syncedCount` returned

---

### Reminders

#### Add Reminder
**Endpoint:** `POST /reminders`

**Body:**
```json
{
  "contestId": "{{contestId}}",
  "reminderTime": 30
}
```

**Expected:**
- ✅ Status: 201
- ✅ Reminder created
- ✅ `reminderId` saved to variable

**Test Cases:**
```javascript
// Valid reminder
POST /reminders
Body: { contestId, reminderTime: 30 }
// Expected: 201

// Duplicate reminder
POST /reminders (same contest)
// Expected: 409, Reminder already exists

// Invalid contestId
POST /reminders
Body: { contestId: "invalid", reminderTime: 30 }
// Expected: 404, Contest not found

// Invalid reminder time
POST /reminders
Body: { contestId, reminderTime: -10 }
// Expected: 400
```

---

#### Get User Reminders
**Endpoint:** `GET /reminders?page=1&limit=20&includeCompleted=false`

**Expected:**
- ✅ Status: 200
- ✅ Paginated reminders with contest data

---

#### Update Reminder
**Endpoint:** `PUT /reminders/:reminderId`

**Body:**
```json
{
  "reminderTime": 60
}
```

**Expected:**
- ✅ Status: 200
- ✅ Reminder time updated

---

#### Delete Reminder
**Endpoint:** `DELETE /reminders/:reminderId`

**Expected:**
- ✅ Status: 200
- ✅ Reminder deleted

---

#### Get Reminder Stats
**Endpoint:** `GET /reminders/stats`

**Expected:**
- ✅ Status: 200
- ✅ Total & active reminder counts

---

### Stats

#### Get Platform Stats
**Endpoint:** `GET /stats/:platform`

**Expected:**
- ✅ Status: 200
- ✅ Platform-specific stats
- ✅ Rating, problems solved, contests

---

#### Get All User Stats
**Endpoint:** `GET /stats`

**Expected:**
- ✅ Status: 200
- ✅ Array of all platform stats

---

#### Sync Platform Stats
**Endpoint:** `POST /stats/:platform/sync`

**Expected:**
- ✅ Status: 200
- ✅ Latest stats fetched

---

#### Get Stats Summary
**Endpoint:** `GET /stats/summary`

**Expected:**
- ✅ Status: 200
- ✅ Aggregated stats across platforms

---

## Running Complete Test Suite

### Option 1: Postman Collection Runner
1. Click **Runner** in Postman
2. Select **CodeArena Backend API** collection
3. Select environment (or use collection variables)
4. Click **Run CodeArena Backend API**
5. View test results

### Option 2: Newman (CLI)
```bash
# Install Newman
npm install -g newman

# Run collection
newman run CodeArena.postman_collection.json

# With environment
newman run CodeArena.postman_collection.json -e environment.json

# Generate HTML report
newman run CodeArena.postman_collection.json --reporters cli,html
```

---

## Test Coverage Summary

✅ **Authentication (12 endpoints)**
- Registration with OTP
- Email verification (verify OTP, resend OTP)
- Login/Logout
- Token refresh
- Username/Email availability
- FCM token update
- Phone number update
- Notification preferences
- WhatsApp test
- **Login history tracking**

✅ **User Profile (8 endpoints)**
- Get/Update profile
- Dashboard
- Link/Unlink platforms
- Update platform username
- Delete account

✅ **Contests (5 endpoints)**
- List all/upcoming/by platform
- Get by ID
- Manual sync

✅ **Reminders (6 endpoints)**
- Create/Read/Update/Delete
- List with pagination
- Statistics

✅ **Stats (4 endpoints)**
- Platform-specific
- All stats
- Sync
- Summary

✅ **Health Check (1 endpoint)**

**Total: 36 API endpoints tested**

---

## Common Issues & Debugging

### Authentication Failures
```javascript
// Check token validity
GET /auth/me
// If 401: Token expired or invalid

// Refresh token
POST /auth/refresh
Body: { refreshToken }
```

### OTP Not Received
1. Check email configuration in `.env`
2. Check spam/junk folder
3. Verify SMTP credentials
4. Check application logs: `logs/app.log`
5. Test email service:
```javascript
const emailService = require('./src/services/emailService');
console.log('Email configured:', emailService.isConfigured());
```

### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping
# Expected: PONG

# Check OTP in Redis
redis-cli
> GET otp:user@example.com
> TTL otp:user@example.com
```

### Database Issues
```bash
# Check migration status
npx prisma migrate status

# Reset database (dev only)
npx prisma migrate reset

# View database
npx prisma studio
```

---

## Performance Benchmarks

Expected response times:
- Auth endpoints: < 500ms
- Contest listing: < 300ms
- Reminder operations: < 200ms
- Stats fetching: < 400ms
- Health check: < 100ms

---

## Security Testing

### Test Cases
1. ✅ **No password exposure**: Check all responses
2. ✅ **Token validation**: Try invalid/expired tokens
3. ✅ **SQL Injection**: Test with `' OR '1'='1`
4. ✅ **XSS**: Test with `<script>alert('xss')</script>`
5. ✅ **Rate limiting**: Spam requests to check limits
6. ✅ **CORS**: Test from different origins

---

## Automated Testing Script

```javascript
// Save as test-runner.js
const newman = require('newman');

newman.run({
    collection: require('./CodeArena.postman_collection.json'),
    reporters: ['cli', 'htmlextra'],
    reporter: {
        htmlextra: {
            export: './test-reports/report.html'
        }
    }
}, function (err) {
    if (err) { throw err; }
    console.log('Collection run complete!');
});
```

Run: `node test-runner.js`

---

## Next Steps

1. ✅ Import collection
2. ✅ Test registration → OTP → login flow
3. ✅ Test all protected endpoints
4. ✅ Test error cases
5. ✅ Check performance metrics
6. ✅ Generate test report
7. ✅ Document any issues

For questions or issues, check the logs:
- Application: `logs/app.log`
- Errors: `logs/error.log`
