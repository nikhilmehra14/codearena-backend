/**
 * IP Address Utility
 * Extract and normalize IP addresses from requests
 */

class IPUtils {
  /**
   * Extract IP address from request
   * Handles proxies, load balancers, and direct connections
   * @param {Object} req - Express request object
   * @returns {string} - Normalized IP address
   */
  static extractIP(req) {
    // Priority order for IP extraction:
    // 1. X-Forwarded-For (proxy/load balancer)
    // 2. X-Real-IP (nginx proxy)
    // 3. CF-Connecting-IP (Cloudflare)
    // 4. Socket remote address (direct connection)

    let ip =
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.headers['cf-connecting-ip'] ||
      req.socket.remoteAddress ||
      req.connection.remoteAddress ||
      '';

    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
    // Take the first one (original client IP)
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Normalize IP address
    return this.normalizeIP(ip);
  }

  /**
   * Normalize IP address
   * Converts IPv6-mapped IPv4 addresses to pure IPv4
   * Example: ::ffff:192.168.1.1 -> 192.168.1.1
   * @param {string} ip - Raw IP address
   * @returns {string} - Normalized IP address
   */
  static normalizeIP(ip) {
    if (!ip) return 'unknown';

    // Remove IPv6 prefix for IPv4-mapped addresses
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    // Remove port if present
    if (ip.includes(':') && !this.isIPv6(ip)) {
      return ip.split(':')[0];
    }

    return ip;
  }

  /**
   * Check if IP is IPv6
   * @param {string} ip - IP address
   * @returns {boolean}
   */
  static isIPv6(ip) {
    // IPv6 has multiple colons
    return (ip.match(/:/g) || []).length > 1;
  }

  /**
   * Check if IP is localhost
   * @param {string} ip - IP address
   * @returns {boolean}
   */
  static isLocalhost(ip) {
    const localhostPatterns = ['127.0.0.1', '::1', 'localhost', '0.0.0.0'];
    return localhostPatterns.includes(ip);
  }

  /**
   * Check if IP is private/local network
   * @param {string} ip - IP address
   * @returns {boolean}
   */
  static isPrivateIP(ip) {
    if (this.isLocalhost(ip)) return true;

    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Mask IP for privacy (GDPR compliance)
   * Example: 192.168.1.100 -> 192.168.1.***
   * @param {string} ip - IP address
   * @returns {string} - Masked IP
   */
  static maskIP(ip) {
    if (!ip || ip === 'unknown') return ip;

    if (this.isIPv6(ip)) {
      // Mask last 3 segments of IPv6
      const parts = ip.split(':');
      return parts.slice(0, -3).join(':') + ':***:***:***';
    } else {
      // Mask last octet of IPv4
      const parts = ip.split('.');
      if (parts.length === 4) {
        return parts.slice(0, 3).join('.') + '.***';
      }
    }

    return ip;
  }

  /**
   * Get location info from IP (requires external service)
   * This is a placeholder - implement with ipapi.co or similar
   * @param {string} ip - IP address
   * @returns {Object} - Location data
   */
  static async getLocation(ip) {
    // TODO: Implement with external IP geolocation service
    // Example: https://ipapi.co/${ip}/json/
    return {
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
    };
  }
}

module.exports = IPUtils;
