# Security Headers Implementation

## Overview

Security headers have been added to the Next.js middleware at `/Users/adamwolfe/aimseod/middleware.ts` to protect the application from common web vulnerabilities.

## Headers Implemented

### 1. Content-Security-Policy (CSP)

Restricts resources the browser can load, preventing XSS and data injection attacks.

**Configuration:**
- `default-src 'self'` - Only load resources from same origin by default
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com` - Allow scripts from self, inline scripts (for Next.js hydration), and Vercel Analytics
- `style-src 'self' 'unsafe-inline'` - Allow styles from self and inline styles (required for Tailwind CSS)
- `img-src 'self' data: blob: https:` - Allow images from self, data URIs, blobs, and HTTPS sources
- `font-src 'self' data:` - Allow fonts from self and data URIs
- `connect-src 'self' https://api.anthropic.com https://app.asana.com https://vercel.live https://va.vercel-scripts.com https://*.ingest.sentry.io` - Allow API calls to self and external services
- `frame-ancestors 'none'` - Prevent embedding in iframes
- `base-uri 'self'` - Restrict base tag to same origin
- `form-action 'self'` - Only allow form submissions to same origin

**Allowed Domains:**
- Vercel Analytics (va.vercel-scripts.com, vercel.live)
- Anthropic AI API (api.anthropic.com)
- Asana API (app.asana.com)
- Sentry Error Tracking (*.ingest.sentry.io)

### 2. X-Frame-Options: DENY

Prevents the application from being embedded in iframes, protecting against clickjacking attacks.

### 3. X-Content-Type-Options: nosniff

Prevents browsers from MIME-type sniffing, reducing the risk of drive-by downloads and attacks.

### 4. Referrer-Policy: strict-origin-when-cross-origin

Controls how much referrer information is sent with requests:
- Same-origin: Full URL
- Cross-origin HTTPS: Origin only
- Cross-origin HTTP: No referrer

### 5. X-XSS-Protection: 0

Disables the legacy XSS filter in older browsers. Modern browsers use CSP instead, and the legacy filter can introduce vulnerabilities.

### 6. Permissions-Policy

Restricts access to browser features:
- `camera=()` - Block camera access
- `microphone=()` - Block microphone access
- `geolocation=()` - Block geolocation access

### 7. Strict-Transport-Security (HSTS)

Forces HTTPS connections for 1 year (31536000 seconds) including all subdomains.

**Note:** Only applied in production environments with HTTPS enabled.

## Implementation Details

### Middleware Configuration

The security headers are applied via Next.js middleware to all routes except:
- Next.js internal routes (`_next/static`, `_next/image`)
- Static assets (SVG, PNG, JPG, JPEG, GIF, WEBP, ICO)
- Favicon

### Rate Limiting

Rate limiting is only applied to API routes (`/api/*`):
- Auth endpoints: 100 requests/minute per IP
- API endpoints: 1000 requests/minute per IP

All other routes receive security headers without rate limiting.

## Testing

To verify security headers are working:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Check headers in browser DevTools:
   - Open DevTools (F12)
   - Go to Network tab
   - Refresh the page
   - Click on the document request
   - View Response Headers

3. Or use curl:
   ```bash
   curl -I http://localhost:3000
   ```

## Updating CSP Domains

If you add new external services, update the CSP in `middleware.ts`:

1. Find the `addSecurityHeaders` function
2. Add the domain to the appropriate CSP directive:
   - Scripts: `script-src`
   - API calls: `connect-src`
   - Images: `img-src`
   - Styles: `style-src`

Example:
```typescript
"connect-src 'self' https://api.anthropic.com https://app.asana.com https://your-new-api.com",
```

## Security Considerations

### Inline Styles (Tailwind CSS)

`'unsafe-inline'` is required in `style-src` for Tailwind CSS to work. This is a known trade-off. To improve security:
- Consider using Tailwind's JIT mode with external CSS
- Use nonces or hashes for specific inline styles (requires build-time configuration)

### Script Evaluation

`'unsafe-eval'` is allowed in `script-src` for Next.js development and runtime features. In production:
- Next.js optimizes and minimizes the use of eval
- Consider removing if you're not using dynamic features that require it

### CORS

No CORS headers are included because the API and frontend are on the same domain. CORS headers are only needed for cross-origin requests.

## Resources

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
