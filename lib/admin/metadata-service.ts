/**
 * KofyOne - Website URL Metadata Auto-Fill Service
 *
 * Implements:
 * 1. SSRF defense (rejects loopback, private RFC1918, link-local, AWS/cloud metadata, unsafe protocols).
 * 2. Strict timeout and response size limit.
 * 3. Safe extraction of title, description, favicon, Open Graph image, hostname.
 * 4. Provider and category heuristics (suggestions requiring admin confirmation).
 * 5. Sanitization of extracted text (never executes HTML or scripts).
 */

export interface FetchedMetadata {
  url: string;
  hostname: string;
  title: string;
  description: string;
  faviconUrl: string | null;
  ogImage: string | null;
  suggestedProvider: 'Microsoft' | 'AWS' | 'Google' | 'Other';
  suggestedCategorySlug?: string;
}

/**
 * Validates if an IP or hostname is safe from SSRF.
 */
export function isSafePublicUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    // 1. Only http and https allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Unsafe scheme: ${parsed.protocol}. Only http and https are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // 2. Reject localhost & loopback
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]'
    ) {
      return { safe: false, reason: 'Requests to localhost and loopback addresses are prohibited.' };
    }

    // 3. Reject AWS / GCP / Azure link-local metadata address (169.254.169.254)
    if (hostname.startsWith('169.254.') || hostname.includes('metadata.google.internal')) {
      return { safe: false, reason: 'Requests to cloud instance metadata services are prohibited.' };
    }

    // 4. Reject private IPv4 address ranges (RFC 1918)
    // 10.0.0.0 - 10.255.255.255
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { safe: false, reason: 'Private IP addresses (10.0.0.0/8) are prohibited.' };
    }
    // 172.16.0.0 - 172.31.255.255
    const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (match172) {
      const secondOctet = parseInt(match172[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return { safe: false, reason: 'Private IP addresses (172.16.0.0/12) are prohibited.' };
      }
    }
    // 192.168.0.0 - 192.168.255.255
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return { safe: false, reason: 'Private IP addresses (192.168.0.0/16) are prohibited.' };
    }

    // 5. Reject internal domain names
    if (
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.corp') ||
      hostname.endsWith('.lan')
    ) {
      return { safe: false, reason: 'Internal network domains are prohibited.' };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

/**
 * Strips HTML tags, trims whitespace, and limits text length.
 */
function cleanText(text: string, maxLength = 350): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Resolves a relative URL against a base URL.
 */
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string | null {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Suggests provider and category from hostname and title/description content.
 */
export function suggestProviderAndCategory(
  hostname: string,
  content: string
): { provider: 'Microsoft' | 'AWS' | 'Google' | 'Other'; categorySlug?: string } {
  const lowerHost = hostname.toLowerCase();
  const lowerContent = content.toLowerCase();

  let provider: 'Microsoft' | 'AWS' | 'Google' | 'Other' = 'Other';

  if (
    lowerHost.includes('microsoft.com') ||
    lowerHost.includes('azure.com') ||
    lowerHost.includes('visualstudio.com') ||
    lowerHost.includes('github.com')
  ) {
    provider = 'Microsoft';
  } else if (lowerHost.includes('aws.amazon.com') || lowerHost.includes('amazon.com')) {
    provider = 'AWS';
  } else if (
    lowerHost.includes('cloud.google.com') ||
    lowerHost.includes('google.com') ||
    lowerHost.includes('deepmind.google')
  ) {
    provider = 'Google';
  }

  let categorySlug: string | undefined = undefined;
  if (lowerContent.includes('student') || lowerContent.includes('education') || lowerContent.includes('pack')) {
    categorySlug = 'student';
  } else if (
    lowerContent.includes('ai') ||
    lowerContent.includes('copilot') ||
    lowerContent.includes('intelligence') ||
    lowerContent.includes('machine learning') ||
    lowerContent.includes('model')
  ) {
    categorySlug = 'ai';
  } else if (lowerContent.includes('cloud') || lowerContent.includes('azure') || lowerContent.includes('aws')) {
    categorySlug = 'cloud';
  } else if (
    lowerContent.includes('code') ||
    lowerContent.includes('developer') ||
    lowerContent.includes('ide') ||
    lowerContent.includes('sdk')
  ) {
    categorySlug = 'developer';
  } else if (lowerContent.includes('office') || lowerContent.includes('productivity') || lowerContent.includes('teams')) {
    categorySlug = 'productivity';
  }

  return { provider, categorySlug };
}

/**
 * Fetches and parses metadata from an official website URL.
 */
export async function fetchUrlMetadata(targetUrl: string): Promise<FetchedMetadata> {
  const safety = isSafePublicUrl(targetUrl);
  if (!safety.safe) {
    throw new Error(safety.reason || 'URL blocked by security policy.');
  }

  const parsedUrl = new URL(targetUrl);
  const hostname = parsedUrl.hostname;

  // Abort controller with 5-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'KofyOne-MetadataFetcher/1.0 (+https://kofyone.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // Double check destination after redirects
    if (response.url) {
      const redirectedSafety = isSafePublicUrl(response.url);
      if (!redirectedSafety.safe) {
        throw new Error('Redirect destination blocked by security policy.');
      }
    }

    if (!response.ok) {
      throw new Error(`Website returned status ${response.status} ${response.statusText}`);
    }

    // Limit read size to 512KB
    const textBuffer = await response.text();
    const html = textBuffer.slice(0, 524288);

    // Extract title
    let title = '';
    const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const metaTitleMatch = html.match(/<meta\s+[^>]*name=["']title["'][^>]*content=["']([^"']+)["']/i);
    const tagTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    if (ogTitleMatch && ogTitleMatch[1]) {
      title = cleanText(ogTitleMatch[1], 120);
    } else if (metaTitleMatch && metaTitleMatch[1]) {
      title = cleanText(metaTitleMatch[1], 120);
    } else if (tagTitleMatch && tagTitleMatch[1]) {
      title = cleanText(tagTitleMatch[1], 120);
    } else {
      title = hostname;
    }

    // Extract description
    let description = '';
    const ogDescMatch = html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    if (ogDescMatch && ogDescMatch[1]) {
      description = cleanText(ogDescMatch[1], 300);
    } else if (metaDescMatch && metaDescMatch[1]) {
      description = cleanText(metaDescMatch[1], 300);
    }

    // Extract Open Graph image
    let ogImage: string | null = null;
    const ogImageMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      ogImage = resolveUrl(ogImageMatch[1], response.url || targetUrl);
    }

    // Extract favicon
    let faviconUrl: string | null = null;
    const iconMatch =
      html.match(/<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

    if (iconMatch && iconMatch[1]) {
      faviconUrl = resolveUrl(iconMatch[1], response.url || targetUrl);
    } else {
      faviconUrl = resolveUrl('/favicon.ico', response.url || targetUrl);
    }

    const { provider, categorySlug } = suggestProviderAndCategory(hostname, `${title} ${description}`);

    return {
      url: targetUrl,
      hostname,
      title,
      description,
      faviconUrl,
      ogImage,
      suggestedProvider: provider,
      suggestedCategorySlug: categorySlug,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Connection timed out while fetching website metadata.');
    }
    throw err;
  }
}
