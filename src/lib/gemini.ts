/**
 * Robust Gemini API wrapper with exponential backoff retries and descriptive error handling.
 */
export async function callGeminiWithRetry(
  geminiKey: string,
  prompt: string,
  temperature: number = 0.1,
  maxRetries: number = 3
): Promise<string> {
  const key = geminiKey ? geminiKey.trim() : "";
  const finalKey = key || process.env.NEXT_PUBLIC_GEMINI_KEY || "";
  
  if (!finalKey) {
    throw new Error("Missing Gemini API Key. Please enter a valid API key in the top navigation bar.");
  }

  let delay = 1000; // start with 1 second delay
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || response.statusText;
        const status = response.status;

        // If it's a retryable error (503 Service Unavailable, 504 Gateway Timeout, 502 Bad Gateway, 429 Too Many Requests)
        if ((status === 503 || status === 504 || status === 502 || status === 429) && attempt < maxRetries) {
          console.warn(`Gemini API returned ${status} (${errorMessage}). Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          continue;
        }

        // User-friendly contextual messaging
        if (status === 503) {
          throw new Error("Google Gemini API is temporarily overloaded (503 Service Unavailable). Please retry in a few seconds.");
        } else if (status === 429) {
          throw new Error("Rate limit exceeded (429 Too Many Requests). You have exceeded your free tier rate limit or Google's quota.");
        } else if (status === 400 || status === 403) {
          throw new Error(`Authentication / Key Error (${status}): ${errorMessage}. Please verify your Gemini API key is active.`);
        } else {
          throw new Error(`API Error (${status}): ${errorMessage}`);
        }
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Empty or malformed JSON returned from the Gemini server. Please check your prompt or payload.");
      }

      return contentText;
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw err;
      }
      console.warn(`Network or server fault during API call: ${err.message || err}. Retrying ${attempt}/${maxRetries} in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  
  throw new Error("Failed to communicate with Google Gemini API after multiple retries due to network or server overload.");
}
