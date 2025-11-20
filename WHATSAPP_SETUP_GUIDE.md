# WhatsApp Notification Setup Guide

## ✅ Implementation Complete!

WhatsApp notification support has been successfully added to your CodeArena backend.

---

## 🎯 What Was Added

### 1. **New Database Fields** (User model)
- `phoneNumber` - User's WhatsApp number (E.164 format)
- `notifyViaPush` - Enable/disable push notifications (default: true)
- `notifyViaWhatsApp` - Enable/disable WhatsApp notifications (default: false)
- `notifyViaEmail` - Enable/disable email notifications (default: false)

### 2. **New Service** (`src/services/whatsappService.js`)
- `sendContestReminder()` - Send contest reminder via WhatsApp
- `sendBulkNotifications()` - Send to multiple users
- `sendTestMessage()` - Test WhatsApp configuration
- `formatPhoneNumber()` - Format to E.164 standard
- `isValidPhoneNumber()` - Validate phone format

### 3. **Updated Notification Service**
Now supports **multi-channel** notifications:
- ✅ Push (Firebase FCM)
- ✅ WhatsApp (Twilio)
- ⏳ Email (can be added later)

### 4. **New API Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/phone-number` | Update user's phone number |
| PUT | `/api/v1/auth/notification-preferences` | Set notification channels |
| POST | `/api/v1/auth/test-whatsapp` | Test WhatsApp integration |

### 5. **Updated Configuration**
- Added WhatsApp config in `config.js`
- Environment variables for Twilio credentials
- Production-ready error handling

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Twilio Account

1. **Sign up for Twilio** (Free trial with $15 credit)
   - Go to: https://www.twilio.com/try-twilio
   - Complete registration

2. **Get Your Credentials**
   - Dashboard → Account Info
   - Copy: **Account SID** and **Auth Token**

3. **Enable WhatsApp Sandbox** (for testing)
   - Console → Messaging → Try it out → Send a WhatsApp message
   - Note the sandbox number (e.g., `+14155238886`)
   - Follow instructions to join sandbox from your WhatsApp

### Step 2: Update Environment Variables

Add to your `.env` file:

```env
# WhatsApp Configuration
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Step 3: Restart Server

```bash
npm start
```

You should see:
```
✅ WhatsApp service initialized (Twilio)
```

---

## 📱 API Usage Examples

### 1. Update Phone Number

```bash
# PowerShell
$headers = @{
  "Authorization" = "Bearer YOUR_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  phoneNumber = "+919876543210"
} | ConvertTo-Json

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:5000/api/v1/auth/phone-number" `
  -Headers $headers `
  -Body $body
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number updated successfully",
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "johndoe",
    "phoneNumber": "+919876543210",
    "notifyViaWhatsApp": false
  }
}
```

### 2. Enable WhatsApp Notifications

```bash
# PowerShell
$headers = @{
  "Authorization" = "Bearer YOUR_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  notifyViaPush = $true
  notifyViaWhatsApp = $true
  notifyViaEmail = $false
} | ConvertTo-Json

Invoke-RestMethod -Method PUT `
  -Uri "http://localhost:5000/api/v1/auth/notification-preferences" `
  -Headers $headers `
  -Body $body
```

**Response:**
```json
{
  "success": true,
  "message": "Notification preferences updated successfully",
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "johndoe",
    "notifyViaPush": true,
    "notifyViaWhatsApp": true,
    "notifyViaEmail": false
  }
}
```

### 3. Test WhatsApp Notification

```bash
# PowerShell
$headers = @{
  "Authorization" = "Bearer YOUR_ACCESS_TOKEN"
}

Invoke-RestMethod -Method POST `
  -Uri "http://localhost:5000/api/v1/auth/test-whatsapp" `
  -Headers $headers
```

**Response:**
```json
{
  "success": true,
  "message": "Test WhatsApp message sent successfully",
  "data": {
    "success": true,
    "messageId": "SM1234567890abcdef"
  }
}
```

**You'll receive on WhatsApp:**
```
✅ WhatsApp notifications are working! You will receive contest reminders on this number.
```

---

## 📊 How It Works

### Contest Reminder Flow

```
1. User creates reminder for contest
   ↓
2. Cron job runs every 5 minutes
   ↓
3. Checks for pending reminders
   ↓
4. For each user with reminder:
   
   IF (user.notifyViaPush && user.fcmToken)
   → Send Firebase Push Notification
   
   IF (user.notifyViaWhatsApp && user.phoneNumber)
   → Send WhatsApp Message via Twilio
   
   IF (user.notifyViaEmail && user.email)
   → Send Email (future feature)
   ↓
5. Mark reminder as sent
```

### WhatsApp Message Format

Users will receive:
```
🚀 *Contest Reminder from CodeArena*

📌 *Biweekly Contest 120*
🏆 Platform: LEETCODE
⏰ Starts: Saturday, January 20, 2024 at 08:00 PM
⏳ Starting in 30 minutes!

🔗 Link: https://leetcode.com/contest/biweekly-contest-120

Good luck! 💪
```

---

## 🔒 Phone Number Format

### Valid Formats (E.164)

✅ **Correct:**
- `+919876543210` (India)
- `+14155238886` (US)
- `+447700900123` (UK)
- `+61412345678` (Australia)

❌ **Incorrect:**
- `9876543210` (missing country code)
- `+91-98765-43210` (has dashes)
- `+91 9876 543210` (has spaces)
- `919876543210` (missing +)

### Auto-Formatting

The service automatically formats:
- `9876543210` → `+919876543210` (assumes India for 10 digits)
- `14155238886` → `+14155238886`

You can change the default country code in `whatsappService.js`:
```javascript
if (cleaned.length === 10) {
  cleaned = `+1${cleaned}`;  // Change to +1 for US
}
```

---

## 💰 Pricing

### Twilio WhatsApp (Pay-as-you-go)

| Region | Price per Message |
|--------|-------------------|
| India | ~$0.0035 |
| US | ~$0.005 |
| Europe | ~$0.008 |
| Other | ~$0.01 |

**Example Cost:**
- 1000 users × 5 contests/month = 5000 messages
- Cost: 5000 × $0.005 = **$25/month**

### Free Trial
- $15 credit
- ~3000 messages for testing

---

## 🧪 Testing Checklist

### 1. Test Phone Number Update
```bash
✅ POST /auth/phone-number with valid number
✅ Verify number saved in database
✅ Try invalid format (should fail with error)
```

### 2. Test Notification Preferences
```bash
✅ PUT /auth/notification-preferences
✅ Enable WhatsApp only
✅ Enable both Push and WhatsApp
✅ Disable all
```

### 3. Test WhatsApp Sending
```bash
✅ POST /auth/test-whatsapp
✅ Receive test message on WhatsApp
✅ Create contest reminder
✅ Wait for scheduled time
✅ Receive actual contest reminder
```

---

## 🚀 Production Deployment

### For Production Use

**Twilio requires WhatsApp Business API approval:**

1. **Apply for Access**
   - Twilio Console → WhatsApp → Request Access
   - Provide business details
   - Wait for approval (1-2 weeks)

2. **Get Your Own Number**
   - After approval, get dedicated number
   - Update `.env` with your number
   - No more sandbox limitations

3. **Message Templates**
   - Create approved templates
   - Required for production
   - Templates must be pre-approved by WhatsApp

4. **Rate Limits**
   - Sandbox: 100 messages/day
   - Production: 1000-10,000/day (varies by tier)

### Environment Setup

**Production `.env`:**
```env
NODE_ENV=production
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC... # Your production SID
TWILIO_AUTH_TOKEN=... # Your production token
TWILIO_WHATSAPP_NUMBER=+14155... # Your approved number
```

---

## 🎨 Mobile App Integration (React Native)

### Complete User Flow

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://your-backend-url.com/api/v1';

// 1. After login, prompt for phone number
const setupWhatsApp = async () => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  
  // Show phone input modal
  const phoneNumber = await showPhoneInputModal();
  
  // Update phone number
  const response = await fetch(`${API_URL}/auth/phone-number`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber }),
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Enable WhatsApp notifications
    await enableWhatsAppNotifications(accessToken);
  }
};

// 2. Enable WhatsApp notifications
const enableWhatsAppNotifications = async (accessToken) => {
  await fetch(`${API_URL}/auth/notification-preferences`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notifyViaPush: true,
      notifyViaWhatsApp: true,
    }),
  });
};

// 3. Settings screen toggle
const NotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    push: true,
    whatsapp: false,
    email: false,
  });

  const updatePreferences = async (newPrefs) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    
    await fetch(`${API_URL}/auth/notification-preferences`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notifyViaPush: newPrefs.push,
        notifyViaWhatsApp: newPrefs.whatsapp,
        notifyViaEmail: newPrefs.email,
      }),
    });
    
    setPreferences(newPrefs);
  };

  return (
    <View>
      <Switch 
        value={preferences.push}
        onValueChange={(v) => updatePreferences({...preferences, push: v})}
      />
      <Switch 
        value={preferences.whatsapp}
        onValueChange={(v) => updatePreferences({...preferences, whatsapp: v})}
      />
    </View>
  );
};
```

---

## 🔧 Troubleshooting

### Issue: "WhatsApp service not configured"

**Solution:**
- Check `.env` has all Twilio credentials
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- Restart server after updating `.env`

### Issue: "Invalid phone number format"

**Solution:**
- Use E.164 format: `+[country_code][number]`
- Remove spaces, dashes, parentheses
- Include + at the start

### Issue: "Message not received on WhatsApp"

**Solution:**
- **Sandbox**: Make sure you joined the sandbox
- Send "join <sandbox-word>" to Twilio sandbox number
- Check Twilio console for message status
- Verify phone number is correct

### Issue: "Twilio error 21211: Invalid 'To' Phone Number"

**Solution:**
- Phone number not in E.164 format
- Country code missing or incorrect
- Use `whatsappService.formatPhoneNumber()` to format

---

## 📊 Monitoring

### Check WhatsApp Service Status

```bash
# In your server logs
✅ WhatsApp service initialized (Twilio)  # Good
⚠️ WhatsApp service not configured        # Missing credentials
```

### View Message Logs

```bash
# Successful send
WhatsApp sent to +919876543210: SM1234567890abcdef

# Multi-channel notification
Multi-channel notification sent to johndoe:
  push: true
  whatsapp: true
  email: false
```

### Twilio Console

Monitor in real-time:
- Console → Messaging → Logs
- See delivery status
- Check error messages
- View usage statistics

---

## 🎯 Summary

**You now have:**

✅ Multi-channel notification system  
✅ WhatsApp integration via Twilio  
✅ Phone number management  
✅ Notification preferences  
✅ Production-ready implementation  
✅ Complete API endpoints  
✅ Error handling & validation  

**Next Steps:**

1. Get Twilio account (free trial)
2. Add credentials to `.env`
3. Test with sandbox number
4. Integrate with mobile app
5. For production: Apply for WhatsApp Business API

---

## 📞 Support

- **Twilio Docs**: https://www.twilio.com/docs/whatsapp
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **Phone Format (E.164)**: https://www.twilio.com/docs/glossary/what-e164

---

**Last Updated:** November 2024  
**Status:** Production Ready ✅
