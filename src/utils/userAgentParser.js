/**
 * User Agent Parser Utility
 * Extracts device, browser, and OS information from user agent string
 */

class UserAgentParser {
  /**
   * Parse user agent string
   * @param {string} userAgent - User agent string from request headers
   * @returns {Object} - Parsed device info
   */
  static parse(userAgent) {
    if (!userAgent) {
      return {
        browser: 'Unknown',
        os: 'Unknown',
        deviceInfo: 'Unknown Device',
      };
    }

    const browser = this.detectBrowser(userAgent);
    const os = this.detectOS(userAgent);
    const device = this.detectDevice(userAgent);

    return {
      browser: `${browser.name} ${browser.version}`,
      os: `${os.name} ${os.version}`,
      deviceInfo: `${browser.name} on ${os.name}`,
      device,
    };
  }

  /**
   * Detect browser from user agent
   */
  static detectBrowser(userAgent) {
    const browsers = [
      { name: 'Edge', pattern: /Edg\/(\d+\.\d+)/ },
      { name: 'Chrome', pattern: /Chrome\/(\d+\.\d+)/ },
      { name: 'Firefox', pattern: /Firefox\/(\d+\.\d+)/ },
      { name: 'Safari', pattern: /Version\/(\d+\.\d+).*Safari/ },
      { name: 'Opera', pattern: /OPR\/(\d+\.\d+)/ },
      { name: 'IE', pattern: /MSIE (\d+\.\d+)/ },
      { name: 'IE', pattern: /Trident.*rv:(\d+\.\d+)/ },
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.pattern);
      if (match) {
        return { name: browser.name, version: match[1] };
      }
    }

    return { name: 'Unknown', version: '' };
  }

  /**
   * Detect operating system from user agent
   */
  static detectOS(userAgent) {
    const osList = [
      // Mobile OS (check first as they're most common for app)
      { name: 'Android', pattern: /Android (\d+(?:\.\d+)?)/ },
      { name: 'iOS', pattern: /iPhone OS (\d+_\d+(?:_\d+)?)/ },
      { name: 'iPadOS', pattern: /iPad.*OS (\d+_\d+(?:_\d+)?)/ },
      // Desktop OS
      { name: 'Windows 11', pattern: /Windows NT 10\.0.*Win64/ },
      { name: 'Windows 10', pattern: /Windows NT 10\.0/ },
      { name: 'Windows 8.1', pattern: /Windows NT 6\.3/ },
      { name: 'Windows 8', pattern: /Windows NT 6\.2/ },
      { name: 'Windows 7', pattern: /Windows NT 6\.1/ },
      { name: 'macOS', pattern: /Mac OS X (\d+[._]\d+(?:[._]\d+)?)/ },
      { name: 'Linux', pattern: /Linux/ },
    ];

    for (const os of osList) {
      const match = userAgent.match(os.pattern);
      if (match) {
        const version = match[1] ? match[1].replace(/_/g, '.') : '';
        return { name: os.name, version };
      }
    }

    return { name: 'Unknown', version: '' };
  }

  /**
   * Detect device type
   */
  static detectDevice(userAgent) {
    // Check for mobile devices first
    if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) {
      // Specific mobile device detection
      if (/iPhone/i.test(userAgent)) return 'iPhone';
      if (/iPod/i.test(userAgent)) return 'iPod';
      if (/Android/i.test(userAgent)) {
        // Try to extract device model
        const modelMatch = userAgent.match(/Android.*;\s*([^)]+)\s*Build/);
        if (modelMatch) {
          return modelMatch[1].trim(); // e.g., "Samsung Galaxy S21", "Pixel 6"
        }
        return 'Android Device';
      }
      return 'Mobile';
    }
    
    // Check for tablets
    if (/iPad|Android.*Tablet|PlayBook|Kindle/i.test(userAgent)) {
      if (/iPad/i.test(userAgent)) return 'iPad';
      return 'Tablet';
    }
    
    return 'Desktop';
  }

  /**
   * Get short device description
   */
  static getShortDescription(userAgent) {
    const { browser, os } = this.parse(userAgent);
    return `${browser} on ${os}`;
  }
}

module.exports = UserAgentParser;
