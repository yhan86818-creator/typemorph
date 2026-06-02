/**
 * Privacy Guard: Local PII Masking Utility
 * This runs 100% in the browser to ensure no sensitive data is sent to AI models.
 */

export interface PiiDetectionResult {
  maskedText: string;
  detectedTypes: string[];
}

const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}?\)?[-.\s]?\d{2,4}[-.\s]?\d{3,4}/g,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  secretKey: /(?:key|secret|password|auth|token)[-._\s]*(?::|=)[-._\s]*['"][a-zA-Z0-9]{10,}['"]/gi
};

/**
 * Detects and optionally masks PII in the given text.
 */
export function processPii(text: string, mask: boolean = true): PiiDetectionResult {
  let maskedText = text;
  const detectedTypes: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      detectedTypes.push(type);
      if (mask) {
        maskedText = maskedText.replace(pattern, (match) => {
          // Keep a bit of context for emails/keys if it's not a credit card
          if (type === 'email') {
            const [user, domain] = match.split('@');
            return `${user[0]}***@***.${domain.split('.').pop()}`;
          }
          return `[MASKED_${type.toUpperCase()}]`;
        });
      }
    }
    // Reset regex lastIndex because of 'g' flag
    pattern.lastIndex = 0;
  }

  return { maskedText, detectedTypes };
}
