# Email Verification with OTP

This document explains the email verification system implemented in the CodeArena backend.

## Overview

New users registering with email/password must verify their email address using a One-Time Password (OTP) before they can log in. This adds an additional layer of security and ensures email ownership.

## Features

- **6-digit OTP**: Random numeric code generated for each registration
- **10-minute validity**: OTP expires after 10 minutes for security
- **Rate limiting**: Users can resend OTP only once per minute
- **Professional emails**: HTML-formatted emails with gradient headers and styled templates
- **Welcome email**: Sent automatically after successful verification
- **OAuth bypass**: Google/GitHub users are auto-verified

## Registration Flow

### 1. User Registration
**Endpoint**: `POST /api/v1/auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePassword123!",
  "fullName": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "username": "johndoe",
      "isVerified": false
    },
    "requiresVerification": true
  }
}
```

**What happens**:
- User account is created with `isVerified: false`
- 6-digit OTP is generated and saved to database
- OTP expiry time is set to current time + 10 minutes
- Email is sent with OTP
- **No JWT tokens are issued** (user cannot log in yet)

### 2. Email Verification
**Endpoint**: `POST /api/v1/auth/verify-otp`

**Request**:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "username": "johndoe",
      "isVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**What happens**:
- OTP is validated against database
- Expiry time is checked
- User's `isVerified` is set to `true`
- OTP fields are cleared from database
- Welcome email is sent
- JWT tokens are issued
- User can now log in

**Error cases**:
- `400`: Invalid OTP
- `400`: OTP expired (resend required)
- `400`: Email already verified
- `404`: User not found

### 3. Resend OTP
**Endpoint**: `POST /api/v1/auth/resend-otp`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP has been resent. Please check your email."
}
```

**Rate limiting**:
- Users must wait 60 seconds between resend requests
- If attempted too soon, response will indicate remaining wait time

**Error cases**:
- `400`: Please wait X seconds before requesting a new OTP
- `400`: Email already verified
- `404`: User not found

## Login Flow

**Endpoint**: `POST /api/v1/auth/login`

If user tries to log in without verifying email:
```json
{
  "success": false,
  "message": "Please verify your email before logging in. Check your inbox for the OTP."
}
```

## Email Templates

### OTP Email
- **Subject**: "Verify Your Email - CodeArena"
- **Contains**:
  - Gradient header with logo
  - Large, styled 6-digit OTP
  - 10-minute validity warning
  - Support contact information

### Welcome Email
- **Subject**: "Welcome to CodeArena!"
- **Sent after**: Successful email verification
- **Contains**:
  - Welcome message
  - Feature highlights
  - Getting started tips

## Database Schema

### User Model
```prisma
model User {
  // ... existing fields
  isVerified             Boolean   @default(false)
  // OTPs are stored in Redis, not in database
}
```

### Redis Keys

**OTP Storage:**
- Key: `otp:{email}`
- Value: 6-digit OTP string
- TTL: 600 seconds (10 minutes)
- Example: `otp:user@example.com` → `"123456"`

**Rate Limiting:**
- Key: `otp:ratelimit:{email}`
- Value: Timestamp of last OTP sent
- TTL: 60 seconds
- Example: `otp:ratelimit:user@example.com` → `"1700412345678"`

## Why Redis?

**Performance:**
- ⚡ Faster lookups (in-memory vs disk)
- 🔥 Reduced database load (no writes for temporary data)
- 🚀 Built-in TTL (automatic expiration)

**Scalability:**
- 📈 Better for high-volume registrations
- 🔄 Easy to scale horizontally
- 💾 Less database storage used

**Clean Architecture:**
- 🎯 Separation of concerns (temporary vs persistent data)
- 🧹 No database cleanup needed (Redis handles expiration)
- 🔒 Industry-standard pattern for OTP storage

## Configuration

### Required Environment Variables

Add these to your `.env` file:

```env
# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@codearena.com
EMAIL_FROM_NAME=CodeArena
```

### Gmail Setup

1. **Enable 2-Factor Authentication**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → Turn On

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
   - Use this as `EMAIL_PASSWORD` in `.env`

3. **Update .env**:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=yourname@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=noreply@codearena.com
EMAIL_FROM_NAME=CodeArena
```

### Other SMTP Providers

**Outlook/Hotmail**:
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
```

**Yahoo Mail**:
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
```

**SendGrid**:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

**AWS SES**:
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_username
EMAIL_PASSWORD=your_smtp_password
```

## Testing

### Manual Testing

1. **Register a new user**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test1234!",
    "fullName": "Test User"
  }'
```

2. **Check your email for OTP** (6-digit code)

3. **Verify OTP**:
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

4. **Login** (should now work):
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### Test Resend OTP
```bash
# Wait 60 seconds, then:
curl -X POST http://localhost:5000/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Security Features

1. **OTP Expiration**: 10-minute validity prevents long-term attacks
2. **Rate Limiting**: 1-minute cooldown on resend prevents spam
3. **Single Use**: OTP is cleared after successful verification
4. **Hashed Storage**: OTPs stored as plain text (6 digits, low entropy) but only valid for 10 minutes
5. **Email Validation**: Server-side email format validation
6. **Login Prevention**: Unverified users cannot log in

## Error Handling

All errors follow the standard error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ErrorType"
}
```

**Common errors**:
- `ConflictError` (409): Email/username already exists
- `BadRequestError` (400): Invalid OTP, expired OTP, rate limit exceeded
- `UnauthorizedError` (401): Email not verified (on login)
- `NotFoundError` (404): User not found

## OAuth Users

Users registering via Google or GitHub OAuth are automatically verified and bypass the OTP flow:

- `isVerified` is set to `true` immediately
- No OTP is generated or sent
- JWT tokens are issued immediately
- Welcome email is sent

## Monitoring & Logs

Email operations are logged for monitoring:

```
INFO: New user registered (unverified): user@example.com
INFO: OTP sent to user@example.com
INFO: User email verified: user@example.com
INFO: Welcome email sent to user@example.com
INFO: OTP resent to user@example.com
WARN: Email service not configured, OTP not sent
```

## Frontend Integration

### Registration Flow
```javascript
// 1. Register user
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'johndoe',
    password: 'SecurePassword123!',
    fullName: 'John Doe'
  })
});

const { data } = await registerResponse.json();

if (data.requiresVerification) {
  // Show OTP input screen
  showOTPScreen(data.user.email);
}
```

### OTP Verification
```javascript
// 2. Verify OTP
const verifyResponse = await fetch('/api/v1/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userEmail,
    otp: otpInput
  })
});

const { data } = await verifyResponse.json();

// Save tokens
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);

// Redirect to dashboard
navigate('/dashboard');
```

### Resend OTP
```javascript
// 3. Resend OTP (with 60-second cooldown)
const resendResponse = await fetch('/api/v1/auth/resend-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userEmail })
});

if (resendResponse.ok) {
  // Show success message
  showToast('OTP resent successfully');
  // Start 60-second countdown
  startResendCooldown(60);
}
```

## Troubleshooting

### Email not sending

1. **Check email service configuration**:
```javascript
// Add to any controller for testing
const emailService = require('./services/emailService');
console.log('Email configured:', emailService.isConfigured());
```

2. **Check environment variables**:
```bash
# Ensure these are set in .env
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=yourname@gmail.com
EMAIL_PASSWORD=your_app_password
```

3. **Check logs**:
```
WARN: Email service not configured, OTP not sent
```

4. **Test SMTP connection**:
```javascript
// Create test file: testEmail.js
const emailService = require('./src/services/emailService');
emailService.sendOTPEmail('test@example.com', '123456', 'Test User')
  .then(() => console.log('Email sent!'))
  .catch(err => console.error('Email error:', err));
```

### OTP expired immediately

Check Redis connection and TTL:
```javascript
const { cacheGet } = require('./src/config/redis');
const otpKey = 'otp:test@example.com';
const otp = await cacheGet(otpKey);
console.log('OTP from Redis:', otp);
```

Check Redis directly:
```bash
redis-cli
> GET otp:user@example.com
> TTL otp:user@example.com
```

### Rate limit not working

Check Redis rate limit key:
```bash
redis-cli
> GET otp:ratelimit:user@example.com
> TTL otp:ratelimit:user@example.com
```

Or check programmatically:
```javascript
const { cacheGet } = require('./src/config/redis');
const rateLimitKey = 'otp:ratelimit:user@example.com';
const lastSent = await cacheGet(rateLimitKey);
console.log('Last OTP sent at:', lastSent ? new Date(parseInt(lastSent)) : 'Never');
```

## Migration

Existing users without `isVerified` field:

```javascript
// Run this migration script if needed
const { prisma } = require('./src/config/database');

async function markExistingUsersVerified() {
  await prisma.user.updateMany({
    where: { isVerified: false, authProvider: 'local' },
    data: { isVerified: true }
  });
  console.log('Existing users marked as verified');
}
```

## Summary

✅ **Implemented Features**:
- OTP generation (6 digits, 10-minute expiry)
- Email sending with professional templates
- OTP verification endpoint
- Resend OTP with rate limiting
- Login verification check
- Welcome email after verification
- OAuth auto-verification
- Database migration applied
- Environment configuration documented

✅ **Security**:
- Time-based OTP expiration
- Rate limiting on resend
- Single-use OTPs
- Email validation
- Unverified users cannot log in

✅ **User Experience**:
- Clear error messages
- Professional email templates
- Resend functionality
- Rate limit feedback
- Welcome email

## Support

For issues or questions:
- Check logs in `logs/app.log`
- Verify email configuration
- Test SMTP connection manually
- Check database migration status: `npx prisma migrate status`
