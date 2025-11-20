# Login Activity Tracking

Complete documentation for the login activity tracking system in CodeArena backend.

## Overview

Every time a user logs in, the system automatically captures and stores:
1. **User ID** - Who logged in
2. **IP Address** - Where they logged in from
3. **Device & Browser Info** - What device/browser they used
4. **Login Timestamp** - When the login occurred

This enables security monitoring, fraud detection, and user convenience (showing "Last login from Chrome on Windows").

## Database Schema

### LoginActivity Model
```prisma
model LoginActivity {
  id          String    @id @default(uuid())
  userId      String
  ipAddress   String    @db.VarChar(45)     // IPv4 (15) or IPv6 (45)
  userAgent   String?   @db.VarChar(500)    // Full user agent string
  deviceInfo  String?   @db.VarChar(255)    // "Chrome on Windows"
  browser     String?   @db.VarChar(100)    // "Chrome 120.0"
  os          String?   @db.VarChar(100)    // "Windows 10"
  loginAt     DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([loginAt])
  @@index([ipAddress])
}
```

### User Model Relation
```prisma
model User {
  // ... existing fields
  loginActivities  LoginActivity[]
}
```

## Features

### 1. Automatic IP Extraction
Handles multiple scenarios:
- **Direct connections**: `req.socket.remoteAddress`
- **Proxy/Load Balancer**: `X-Forwarded-For` header
- **Nginx Proxy**: `X-Real-IP` header
- **Cloudflare**: `CF-Connecting-IP` header

**IPv6 Normalization:**
```javascript
// Input:  ::ffff:192.168.1.1
// Output: 192.168.1.1

// Input:  ::1
// Output: ::1 (localhost)
```

### 2. Device & Browser Detection
Automatically parses User-Agent string to extract:
- **Browser**: Chrome, Firefox, Safari, Edge, Opera, IE
- **Version**: 120.0, 119.5, etc.
- **Operating System**: Windows 11/10/8/7, macOS, Linux, Android, iOS
- **Device Type**: Desktop, Mobile, Tablet

**Example User Agents Parsed:**
```javascript
// Chrome on Windows
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
→ Browser: Chrome 120.0
→ OS: Windows 10
→ Device: Desktop

// Safari on iPhone
"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"
→ Browser: Safari 17.0
→ OS: iOS 17.0
→ Device: Mobile

// Firefox on Linux
"Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0"
→ Browser: Firefox 119.0
→ OS: Linux
→ Device: Desktop
```

### 3. Privacy & Security
- **IPv6 Support**: Full support for IPv4 and IPv6 addresses
- **Localhost Detection**: Identifies local development logins
- **Private IP Detection**: Recognizes 10.x.x.x, 192.168.x.x, 172.16-31.x.x
- **IP Masking** (optional): `192.168.1.100` → `192.168.1.***` (GDPR compliance)

## API Endpoints

### Get Login History
**Endpoint**: `GET /api/v1/auth/login-history`

**Authentication**: Required (Bearer token)

**Query Parameters:**
- `limit` (optional, default: 10) - Number of records to return

**Request:**
```bash
GET /api/v1/auth/login-history?limit=10
Authorization: Bearer <accessToken>
```

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

**Test Cases:**
```javascript
// Get last 10 logins
GET /auth/login-history
Expected: 200, array of 10 activities

// Get last 5 logins
GET /auth/login-history?limit=5
Expected: 200, array of 5 activities

// Unauthorized access
GET /auth/login-history (no token)
Expected: 401, Unauthorized

// Invalid limit
GET /auth/login-history?limit=abc
Expected: Returns default 10 records
```

## Implementation Details

### Utilities

#### 1. IPUtils (`src/utils/ipUtils.js`)
Handles all IP address operations:

```javascript
const IPUtils = require('../utils/ipUtils');

// Extract IP from request
const ip = IPUtils.extractIP(req);
// Result: "192.168.1.100"

// Normalize IPv6
const normalized = IPUtils.normalizeIP("::ffff:192.168.1.1");
// Result: "192.168.1.1"

// Check if localhost
const isLocal = IPUtils.isLocalhost("127.0.0.1");
// Result: true

// Check if private IP
const isPrivate = IPUtils.isPrivateIP("192.168.1.1");
// Result: true

// Mask IP for privacy
const masked = IPUtils.maskIP("192.168.1.100");
// Result: "192.168.1.***"
```

#### 2. UserAgentParser (`src/utils/userAgentParser.js`)
Parses User-Agent strings:

```javascript
const UserAgentParser = require('../utils/userAgentParser');

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0";

const parsed = UserAgentParser.parse(userAgent);
// Result:
// {
//   browser: "Chrome 120.0",
//   os: "Windows 10",
//   deviceInfo: "Chrome on Windows 10",
//   device: "Desktop"
// }
```

### Login Flow with Activity Tracking

**1. User submits login credentials**
```javascript
POST /api/v1/auth/login
Body: { email, password }
```

**2. Controller extracts IP and User-Agent**
```javascript
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Extract IP (handles proxies, load balancers)
  const ip = IPUtils.extractIP(req);
  
  // Extract user agent
  const userAgent = req.headers['user-agent'];
  
  // Pass to service
  const result = await authService.login(email, password, ip, userAgent);
});
```

**3. Service validates credentials**
```javascript
async login(email, password, ip, userAgent) {
  // ... validate email, password, verification status
  
  // Track login activity
  await this.trackLoginActivity(user.id, ip, userAgent);
  
  // Return tokens
}
```

**4. Login activity recorded**
```javascript
async trackLoginActivity(userId, ip, userAgent) {
  const ipAddress = IPUtils.normalizeIP(ip);
  const deviceData = UserAgentParser.parse(userAgent);
  
  await prisma.loginActivity.create({
    data: {
      userId,
      ipAddress,
      userAgent,
      deviceInfo: deviceData.deviceInfo,  // "Chrome on Windows"
      browser: deviceData.browser,        // "Chrome 120.0"
      os: deviceData.os,                  // "Windows 10"
      loginAt: new Date(),
    },
  });
}
```

## Use Cases

### 1. Security Monitoring
**Detect suspicious logins:**
```javascript
// Find logins from new IP addresses
const recentActivities = await prisma.loginActivity.findMany({
  where: { userId: user.id },
  orderBy: { loginAt: 'desc' },
  take: 10,
});

// Check if current IP is new
const isNewIP = !recentActivities.some(a => a.ipAddress === currentIP);

if (isNewIP) {
  // Send security alert email
  await sendSecurityAlert(user.email, currentIP, deviceInfo);
}
```

### 2. Show Last Login Info
**Display on dashboard:**
```javascript
const lastLogin = await prisma.loginActivity.findFirst({
  where: { userId: user.id },
  orderBy: { loginAt: 'desc' },
  skip: 1, // Skip current login, get previous
});

// Show: "Last login: 2 hours ago from Chrome on Windows"
```

### 3. Fraud Detection
**Detect impossible travel:**
```javascript
// User logged in from US, then 10 minutes later from India
// Flag as suspicious and require additional verification
```

### 4. Multi-Device Management
**Show active sessions:**
```javascript
const activeSessions = await prisma.loginActivity.findMany({
  where: {
    userId: user.id,
    loginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  },
  orderBy: { loginAt: 'desc' },
});

// Show: "Chrome on Windows", "Safari on iPhone", "Firefox on Mac"
```

## Configuration

No additional configuration needed! The system works automatically on every login.

**Optional Enhancements:**
1. **IP Geolocation**: Integrate with ipapi.co or MaxMind for location data
2. **Email Alerts**: Send notifications on new device/IP logins
3. **Session Management**: Allow users to revoke access from specific devices
4. **Analytics**: Track login patterns, popular browsers, etc.

## Testing

### Manual Testing

**1. Test IP extraction:**
```bash
# Login from different networks
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 203.0.113.45" \
  -d '{"email": "test@example.com", "password": "Password123!"}'

# Check login history
curl http://localhost:5000/api/v1/auth/login-history \
  -H "Authorization: Bearer <token>"
```

**2. Test different devices:**
```bash
# Chrome on Windows
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'

# Safari on iPhone
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'
```

**3. Check database:**
```sql
SELECT * FROM login_activities 
WHERE "userId" = 'your-user-id'
ORDER BY "loginAt" DESC
LIMIT 10;
```

### Postman Tests
Already included in `CodeArena.postman_collection.json`:

```javascript
// Test: Get Login History
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns login history array', function () {
    const response = pm.response.json();
    pm.expect(response.data).to.be.an('array');
});

pm.test('Activities have required fields', function () {
    const response = pm.response.json();
    if (response.data.length > 0) {
        const activity = response.data[0];
        pm.expect(activity).to.have.property('ipAddress');
        pm.expect(activity).to.have.property('deviceInfo');
        pm.expect(activity).to.have.property('browser');
        pm.expect(activity).to.have.property('os');
        pm.expect(activity).to.have.property('loginAt');
    }
});
```

## Performance Considerations

### Database Indexes
Efficient queries with indexes on:
- `userId` - Fast lookups by user
- `loginAt` - Ordered retrieval
- `ipAddress` - Security checks by IP

### Automatic Cleanup (Optional)
Keep database lean by removing old records:

```javascript
// Add to cron job: Delete login activities older than 90 days
const deleteOldActivities = async () => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  await prisma.loginActivity.deleteMany({
    where: { loginAt: { lt: ninetyDaysAgo } }
  });
};
```

### Non-Blocking
Login activity tracking is wrapped in try-catch - failures won't prevent login:

```javascript
try {
  await this.trackLoginActivity(userId, ip, userAgent);
} catch (error) {
  logger.error('Failed to track login activity:', error);
  // Login continues successfully
}
```

## Privacy & GDPR Compliance

### Data Stored
- ✅ IP addresses (necessary for security)
- ✅ Device information (user convenience)
- ✅ Timestamps (security audit)

### User Rights
Users can:
1. **View** their login history (GET /login-history)
2. **Delete** account (deletes all login activities via CASCADE)

### IP Masking (Optional)
For stricter privacy, mask IPs:
```javascript
const maskedIP = IPUtils.maskIP(activity.ipAddress);
// 192.168.1.100 → 192.168.1.***
```

## Troubleshooting

### Issue: All IPs showing as localhost (::1 or 127.0.0.1)
**Cause**: Running in development without proxy

**Solution**: Set `X-Forwarded-For` header in development:
```javascript
// In development middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development' && !req.headers['x-forwarded-for']) {
    req.headers['x-forwarded-for'] = '203.0.113.45'; // Test IP
  }
  next();
});
```

### Issue: Browser showing as "Unknown"
**Cause**: Unusual or custom user agent string

**Solution**: User agent parser handles major browsers. Unknown browsers logged as "Unknown".

### Issue: Login activity not saving
**Check logs:**
```bash
tail -f logs/app.log | grep "Login activity"
```

**Check database connection:**
```javascript
const activity = await prisma.loginActivity.findFirst();
console.log('Test activity:', activity);
```

## Summary

✅ **What We Track:**
1. User ID
2. IP Address (normalized)
3. Device & Browser info
4. Login timestamp

✅ **Features:**
- Automatic IP extraction (handles proxies)
- User-Agent parsing (browser, OS, device)
- Privacy-friendly (optional IP masking)
- Non-blocking (won't fail login)
- Indexed for performance
- GDPR compliant

✅ **Use Cases:**
- Security monitoring
- Fraud detection
- Show "Last login from..."
- Multi-device management
- Login analytics

✅ **API:**
- `GET /auth/login-history?limit=10`
- Automatic tracking on every login

The system is production-ready and requires zero configuration! 🎉
