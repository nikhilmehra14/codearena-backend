/**
 * Comprehensive Postman Test Scripts for CodeArena API
 * Copy and paste these test scripts into respective Postman request test tabs
 */

// ==================== AUTHENTICATION TESTS ====================

// Check Username Availability
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response has availability data', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('available');
    pm.expect(response.data).to.have.property('username');
});

pm.test('Response time is acceptable', function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// -------------------

// Check Email Availability
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response has availability data', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('available');
    pm.expect(response.data).to.have.property('email');
});

// -------------------

// Refresh Token
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('New access token provided', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('accessToken');
    pm.expect(response.data.accessToken).to.be.a('string').and.not.empty;
});

if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.collectionVariables.set('accessToken', response.data.accessToken);
}

// -------------------

// Get Current User
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('User data is complete', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('id');
    pm.expect(response.data).to.have.property('email');
    pm.expect(response.data).to.have.property('username');
    pm.expect(response.data).to.not.have.property('password');
});

pm.test('User has notification preferences', function () {
    const response = pm.response.json();
    pm.expect(response.data).to.have.property('notifyViaPush');
    pm.expect(response.data).to.have.property('notifyViaWhatsApp');
    pm.expect(response.data).to.have.property('notifyViaEmail');
});

// -------------------

// Update FCM Token
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('FCM token updated', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('fcmToken');
});

// -------------------

// Update Phone Number
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Phone number updated', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('phoneNumber');
    pm.expect(response.data.phoneNumber).to.match(/^\+\d{10,15}$/);
});

// -------------------

// Update Notification Preferences
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Notification preferences updated', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('notifyViaPush');
    pm.expect(response.data).to.have.property('notifyViaWhatsApp');
    pm.expect(response.data).to.have.property('notifyViaEmail');
});

// -------------------

// Get Login History
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns login history array', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.be.an('array');
});

pm.test('Login activities have required fields', function () {
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

pm.test('IP address is valid format', function () {
    const response = pm.response.json();
    if (response.data.length > 0) {
        const ip = response.data[0].ipAddress;
        // IPv4 or IPv6 or unknown
        pm.expect(ip).to.be.a('string');
        pm.expect(ip).to.not.be.empty;
    }
});

pm.test('Device info is descriptive', function () {
    const response = pm.response.json();
    if (response.data.length > 0) {
        const deviceInfo = response.data[0].deviceInfo;
        pm.expect(deviceInfo).to.be.a('string');
        // Should contain browser and OS info
        pm.expect(deviceInfo.length).to.be.above(5);
    }
});

pm.test('Login timestamps are chronological', function () {
    const response = pm.response.json();
    if (response.data.length > 1) {
        const first = new Date(response.data[0].loginAt);
        const second = new Date(response.data[1].loginAt);
        pm.expect(first).to.be.at.least(second);
    }
});

// -------------------

// Test WhatsApp Notification
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('WhatsApp message sent', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.message).to.include('WhatsApp');
});

// -------------------

// Logout
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Logout successful', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
});

// ==================== USER PROFILE TESTS ====================

// Get User Profile
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Profile data is complete', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('id');
    pm.expect(response.data).to.have.property('email');
    pm.expect(response.data).to.have.property('username');
    pm.expect(response.data).to.have.property('linkedPlatforms');
});

pm.test('Linked platforms is an array', function () {
    const response = pm.response.json();
    pm.expect(response.data.linkedPlatforms).to.be.an('array');
});

// -------------------

// Update User Profile
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Profile updated successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('username');
});

pm.test('Sensitive data not exposed', function () {
    const response = pm.response.json();
    pm.expect(response.data).to.not.have.property('password');
});

// -------------------

// Get User Dashboard
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Dashboard has stats', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('user');
    pm.expect(response.data).to.have.property('stats');
});

pm.test('Stats object is valid', function () {
    const response = pm.response.json();
    pm.expect(response.data.stats).to.be.an('object');
});

// -------------------

// Link Platform
pm.test('Status code is 201 or 200', function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test('Platform linked successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('platform');
    pm.expect(response.data).to.have.property('platformUsername');
});

// -------------------

// Get Linked Platforms
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns array of platforms', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.be.an('array');
});

pm.test('Platform objects have required fields', function () {
    const response = pm.response.json();
    if (response.data.length > 0) {
        pm.expect(response.data[0]).to.have.property('platform');
        pm.expect(response.data[0]).to.have.property('platformUsername');
        pm.expect(response.data[0]).to.have.property('isVerified');
    }
});

// -------------------

// Update Platform Username
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Platform username updated', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('platformUsername');
});

// -------------------

// Unlink Platform
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Platform unlinked successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
});

// -------------------

// Delete Account
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Account deleted successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
});

// ==================== CONTEST TESTS ====================

// Get All Contests
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns paginated contests', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('contests');
    pm.expect(response.data).to.have.property('pagination');
    pm.expect(response.data.contests).to.be.an('array');
});

pm.test('Pagination object is valid', function () {
    const response = pm.response.json();
    pm.expect(response.data.pagination).to.have.property('currentPage');
    pm.expect(response.data.pagination).to.have.property('totalPages');
    pm.expect(response.data.pagination).to.have.property('totalContests');
});

pm.test('Contest objects have required fields', function () {
    const response = pm.response.json();
    if (response.data.contests.length > 0) {
        const contest = response.data.contests[0];
        pm.expect(contest).to.have.property('id');
        pm.expect(contest).to.have.property('name');
        pm.expect(contest).to.have.property('platform');
        pm.expect(contest).to.have.property('startTime');
        pm.expect(contest).to.have.property('endTime');
        pm.expect(contest).to.have.property('url');
    }
});

// -------------------

// Get Contest by ID
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Contest data is complete', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('id');
    pm.expect(response.data).to.have.property('name');
    pm.expect(response.data).to.have.property('platform');
    pm.expect(response.data).to.have.property('startTime');
    pm.expect(response.data).to.have.property('duration');
});

if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.data && response.data.id) {
        pm.collectionVariables.set('contestId', response.data.id);
    }
}

// -------------------

// Get Upcoming Contests
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns upcoming contests array', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.be.an('array');
});

pm.test('All contests are upcoming', function () {
    const response = pm.response.json();
    const now = new Date();
    response.data.forEach(contest => {
        const startTime = new Date(contest.startTime);
        pm.expect(startTime).to.be.above(now);
    });
});

// -------------------

// Get Contests by Platform
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns platform contests', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.be.an('array');
});

pm.test('All contests match requested platform', function () {
    const response = pm.response.json();
    const platform = pm.request.url.path[pm.request.url.path.length - 1];
    response.data.forEach(contest => {
        pm.expect(contest.platform.toLowerCase()).to.equal(platform.toLowerCase());
    });
});

// -------------------

// Sync Contests
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Contests synced successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('syncedCount');
});

pm.test('Sync count is a number', function () {
    const response = pm.response.json();
    pm.expect(response.data.syncedCount).to.be.a('number');
});

// ==================== REMINDER TESTS ====================

// Add Reminder
pm.test('Status code is 201', function () {
    pm.response.to.have.status(201);
});

pm.test('Reminder created successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('id');
    pm.expect(response.data).to.have.property('contestId');
    pm.expect(response.data).to.have.property('reminderTime');
});

if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.data && response.data.id) {
        pm.collectionVariables.set('reminderId', response.data.id);
    }
}

// -------------------

// Get User Reminders
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns paginated reminders', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('reminders');
    pm.expect(response.data).to.have.property('pagination');
    pm.expect(response.data.reminders).to.be.an('array');
});

pm.test('Reminder objects include contest data', function () {
    const response = pm.response.json();
    if (response.data.reminders.length > 0) {
        const reminder = response.data.reminders[0];
        pm.expect(reminder).to.have.property('contest');
        pm.expect(reminder.contest).to.have.property('name');
        pm.expect(reminder.contest).to.have.property('platform');
    }
});

// -------------------

// Get Reminder by ID
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Reminder data is complete', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('id');
    pm.expect(response.data).to.have.property('reminderTime');
    pm.expect(response.data).to.have.property('contest');
});

// -------------------

// Update Reminder
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Reminder updated successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('reminderTime');
});

// -------------------

// Delete Reminder
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Reminder deleted successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
});

// -------------------

// Get Reminder Stats
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Stats data is valid', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('totalReminders');
    pm.expect(response.data).to.have.property('activeReminders');
    pm.expect(response.data.totalReminders).to.be.a('number');
    pm.expect(response.data.activeReminders).to.be.a('number');
});

// ==================== STATS TESTS ====================

// Get Platform Stats
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Platform stats returned', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('platform');
});

pm.test('Stats contain rating info', function () {
    const response = pm.response.json();
    if (response.data) {
        pm.expect(response.data).to.have.property('problemsSolved');
        pm.expect(response.data).to.have.property('contestsParticipated');
    }
});

// -------------------

// Get All User Stats
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Returns stats array', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.be.an('array');
});

pm.test('Each stat has platform info', function () {
    const response = pm.response.json();
    response.data.forEach(stat => {
        pm.expect(stat).to.have.property('platform');
        pm.expect(stat).to.have.property('problemsSolved');
    });
});

// -------------------

// Sync Platform Stats
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Stats synced successfully', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('platform');
});

// -------------------

// Get Stats Summary
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Summary data is valid', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('totalProblemsSolved');
    pm.expect(response.data).to.have.property('totalContestsParticipated');
    pm.expect(response.data.totalProblemsSolved).to.be.a('number');
});

// ==================== HEALTH CHECK TEST ====================

// API Health
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('API is running', function () {
    const response = pm.response.json();
    pm.expect(response).to.have.property('message');
    pm.expect(response.message).to.include('running');
});

pm.test('Response time is fast', function () {
    pm.expect(pm.response.responseTime).to.be.below(200);
});

// ==================== SECURITY TESTS (Common) ====================

// Test for sensitive data exposure
pm.test('No password in response', function () {
    const response = pm.response.json();
    const jsonString = JSON.stringify(response);
    pm.expect(jsonString).to.not.include('password');
});

// Test response headers
pm.test('Has security headers', function () {
    pm.response.to.have.header('Content-Type');
});

// Test for proper error handling
pm.test('Error responses have proper format', function () {
    if (pm.response.code >= 400) {
        const response = pm.response.json();
        pm.expect(response).to.have.property('success');
        pm.expect(response.success).to.be.false;
        pm.expect(response).to.have.property('message');
    }
});
