# Clist.by API Setup Guide

## 🌟 What is Clist.by?

Clist.by is the **largest competitive programming contest aggregator** that tracks contests from **100+ platforms** including:
- Codeforces
- LeetCode  
- CodeChef
- AtCoder
- HackerRank
- HackerEarth
- TopCoder
- And 100+ more!

By using Clist.by, you get **ALL contests from ALL platforms** with a single API call!

---

## 📝 Getting Your API Key

### Step 1: Create Account
1. Go to https://clist.by/
2. Click "Sign Up" (top right)
3. Register with email or OAuth (Google/GitHub)

### Step 2: Get API Key
1. After login, go to https://clist.by/api/v4/doc/
2. Scroll down to find your **API Key**
3. Copy the key (format: `username 1234567890abcdef`)

### Step 3: Configure Backend
1. Open your `.env` file
2. Add your API key:
   ```env
   CLIST_API_KEY=your_username 1234567890abcdef
   ```
3. Save the file
4. Restart your server

---

## 🚀 How It Works

### Priority System
1. **Primary**: Tries to fetch from Clist.by (if API key is configured)
   - Returns contests from ALL platforms
   - Single API call
   - More reliable

2. **Fallback**: If Clist is not configured, falls back to individual APIs:
   - Codeforces API
   - LeetCode GraphQL
   - CodeChef API
   - AtCoder unofficial API

### Benefits of Using Clist
✅ **Single Source** - All platforms in one call  
✅ **Reliable** - Centralized data aggregation  
✅ **More Platforms** - 100+ platforms supported  
✅ **Better Filtering** - Advanced query parameters  
✅ **Consistent Format** - Standardized data structure  

---

## 🧪 Testing

### Test Clist API Directly
```powershell
# Replace YOUR_API_KEY with your actual key
$apiKey = "your_username 1234567890abcdef"
$headers = @{"Authorization" = "ApiKey $apiKey"}
$response = Invoke-RestMethod -Uri "https://clist.by/api/v4/contest/?limit=10&resource__in=codeforces.com,leetcode.com" -Headers $headers
$response.objects | Select-Object event, resource, start | Format-Table
```

### Test Backend After Configuration
```powershell
# Sync contests (will use Clist if configured)
Invoke-RestMethod -Method POST -Uri "http://localhost:5000/api/v1/contests/sync"

# Get all contests
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/contests?limit=50"
```

---

## 📊 API Features

### Query Parameters Supported by Clist
- `start__gte` - Contests starting after this date
- `end__lte` - Contests ending before this date
- `resource__in` - Filter by platforms (comma-separated)
- `order_by` - Sort order (`start`, `-start`, `end`)
- `limit` - Max results (default: 100)
- `offset` - Pagination offset

### Our Backend Implementation
- Fetches contests for **next 30 days**
- Filters: `codeforces.com`, `leetcode.com`, `codechef.com`, `atcoder.jp`
- Maps to our platform enum: `codeforces`, `leetcode`, `codechef`, `atcoder`
- Caches for 30 minutes
- Automatic fallback if Clist fails

---

## 🔧 Configuration

### .env Settings
```env
# Clist.by API (Recommended)
CLIST_API_KEY=your_username 1234567890abcdef

# Individual APIs (Fallback - optional)
CODEFORCES_API_KEY=
LEETCODE_SESSION=
CODECHEF_API_KEY=
```

### Without Clist API Key
If you don't configure `CLIST_API_KEY`, the backend will:
1. Log a warning: "Clist API key not configured"
2. Fall back to individual platform APIs
3. Still work, but may miss some contests or have reliability issues

---

## 📈 Comparison

| Feature | Clist.by | Individual APIs |
|---------|----------|-----------------|
| Platforms | 100+ | 4 (CF, LC, CC, AC) |
| API Calls | 1 | 4 |
| Reliability | High | Variable |
| Setup | API Key Required | No setup |
| Data Freshness | Very Fresh | Fresh |
| Rate Limits | Generous | Per-platform |

---

## 🐛 Troubleshooting

### "Clist API key not configured"
- Check `.env` file has `CLIST_API_KEY`
- Verify format: `username 1234567890abcdef`
- Restart server after adding key

### "401 Unauthorized"
- API key is invalid
- Get new key from https://clist.by/api/v4/doc/

### "Falling back to individual APIs"
- This is normal if Clist API key is not configured
- Backend still works using individual platform APIs

### No contests showing
- Check server logs for errors
- Verify date filters in code
- Test Clist API directly (see Testing section)

---

## 📚 Resources

- **Clist Website**: https://clist.by/
- **API Documentation**: https://clist.by/api/v4/doc/
- **API Endpoint**: https://clist.by/api/v4/contest/
- **Supported Resources**: https://clist.by/resources/

---

## ✨ Recommended Setup

**For Production:**
```env
# Use Clist.by for reliability and comprehensive coverage
CLIST_API_KEY=your_actual_api_key_here
```

**For Development:**
```env
# Either use Clist or rely on fallback individual APIs
# Both work, but Clist is recommended
CLIST_API_KEY=
```

---

## 🎯 Next Steps

1. Get your Clist API key from https://clist.by/api/v4/doc/
2. Add it to your `.env` file
3. Restart the server
4. Run `POST /api/v1/contests/sync`
5. Check logs to see "Fetched X contests from Clist.by"
6. Enjoy contests from 100+ platforms! 🎉
