/**
 * Real-world schema tests
 * ───────────────────────
 * Verifies that TypeMorph's Zod / TypeScript / Prisma output is production-quality
 * on schemas that actually appear in professional codebases.
 *
 * Each test asserts *intent*, not just "output didn't change":
 *   - semantic constraints (`.min(0)`, `.email()`, `.int()`, etc.)
 *   - correct nesting / array wrapping
 *   - proper optionality
 *
 * These are the cases where TypeMorph should beat quicktype.
 */

import { describe, it, expect } from 'vitest';
import { inferSchema, runEngine } from '../engine';
import { zodGen, tsGen, prismaGen } from '../generators';

// ─── Shared fixtures ────────────────────────────────────────────────────────

const EC_ORDER = {
  id: 'ord_abc123',
  userId: 'usr_456',
  status: 'pending',
  items: [
    { productId: 'prd_789', quantity: 2, price: 29.99, discount: 0 },
  ],
  shippingAddress: {
    street: '123 Main St',
    city: 'Tokyo',
    postalCode: '150-0002',
    country: 'JP',
  },
  total: 59.98,
  createdAt: '2024-01-15T10:30:00Z',
};

const BLOG_POST = {
  id: 1,
  title: 'Hello World',
  slug: 'hello-world',
  content: 'Long content here...',
  author: {
    id: 'usr_123',
    name: 'Alice',
    email: 'alice@example.com',
    bio: 'Technical writer',
  },
  tags: ['javascript', 'react'],
  publishedAt: '2024-01-15T10:30:00Z',
  viewCount: 1234,
  isPublished: true,
  score: 4.8,
};

const USER_PROFILE = {
  id: 'usr_123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'admin',
  address: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    country: 'US',
    zipCode: '10001',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  isActive: true,
};

const PAGINATED_RESPONSE = {
  data: [{ id: 1, name: 'Item A', price: 9.99 }],
  pagination: {
    page: 1,
    perPage: 20,
    total: 100,
    totalPages: 5,
  },
  meta: {
    requestId: 'req_abc123',
    timestamp: '2024-01-15T10:30:00Z',
  },
};

const TRANSACTION = {
  transactionId: 'txn_abc123',
  fromAccountId: 'acc_123',
  toAccountId: 'acc_456',
  amount: 1500.00,
  fee: 2.50,
  currency: 'USD',
  type: 'transfer',
  status: 'completed',
  processedAt: '2024-01-15T10:30:00Z',
  metadata: {
    reference: 'INV-001',
    note: 'Monthly subscription',
  },
};

// ─── 1. EC Order ────────────────────────────────────────────────────────────

describe('Real-world: EC Order', () => {
  const schema = inferSchema(EC_ORDER);

  describe('Zod', () => {
    const out = zodGen.generate(schema, 'Order', {});

    it('generates z.array() for items array field', () => {
      // zodGen separates nested schemas into named variables
      expect(out).toContain('z.array(');
    });

    it('applies .int().min(0) to quantity', () => {
      expect(out).toContain('quantity: z.number().int().min(0)');
    });

    it('applies .min(0) to price (monetary field)', () => {
      expect(out).toContain('price: z.number().min(0)');
    });

    it('applies .min(0) to total (monetary field)', () => {
      expect(out).toContain('total: z.number().min(0)');
    });

    it('generates shippingAddress nested fields as z.object() block', () => {
      // zodGen extracts nested objects into separate schema variables
      expect(out).toContain('z.object({');
      expect(out).toMatch(/street.*z\.string/);
      expect(out).toMatch(/city.*z\.string/);
    });

    it('generates createdAt as z.iso.datetime()', () => {
      expect(out).toMatch(/createdAt.*z\.iso\.datetime/);
    });
  });

  describe('TypeScript', () => {
    const out = tsGen.generate(schema, 'Order');

    it('generates nested interface for shippingAddress', () => {
      expect(out).toContain('ShippingAddress');
      expect(out).toMatch(/street.*string/);
      expect(out).toMatch(/city.*string/);
    });

    it('types items as an array of objects', () => {
      expect(out).toMatch(/items.*\[\]/);
    });

    it('types total as number', () => {
      expect(out).toMatch(/total.*number/);
    });
  });

  describe('Prisma', () => {
    const out = prismaGen.generate(schema, 'Order');

    it('generates a model block', () => {
      expect(out).toContain('model Order');
    });

    it('generates id and userId fields', () => {
      expect(out).toMatch(/\bid\b/);
      expect(out).toMatch(/userId|user_id/);
    });

    it('generates total as Decimal (monetary field)', () => {
      expect(out).toMatch(/total\s+Decimal/);
    });
  });
});

// ─── 2. Blog Post ───────────────────────────────────────────────────────────

describe('Real-world: Blog Post', () => {
  const schema = inferSchema(BLOG_POST);

  describe('Zod', () => {
    const out = zodGen.generate(schema, 'Post', {});

    it('applies slug regex to slug field', () => {
      expect(out).toContain('slug: z.string().regex(');
      expect(out).toContain('[a-z0-9]');
    });

    it('applies .int().min(0) to viewCount', () => {
      expect(out).toContain('viewCount: z.number().int().min(0)');
    });

    it('applies .min(0).max(100) to score', () => {
      expect(out).toContain('score: z.number().min(0).max(100)');
    });

    it('generates email validation in nested author object', () => {
      expect(out).toMatch(/email.*z\.email\(\)/);
    });

    it('generates author nested fields in a z.object() block', () => {
      // zodGen extracts nested objects into separate named schemas
      expect(out).toContain('z.object({');
      expect(out).toMatch(/name.*z\.string/);
    });

    it('generates tags as z.array(z.string())', () => {
      expect(out).toMatch(/tags.*z\.array\(z\.string\(\)\)/);
    });
  });

  describe('TypeScript', () => {
    const out = tsGen.generate(schema, 'Post');

    it('types boolean field correctly', () => {
      expect(out).toMatch(/isPublished.*boolean/);
    });

    it('generates nested Author interface', () => {
      expect(out).toContain('Author');
      expect(out).toMatch(/email.*string/);
    });

    it('types tags as string array', () => {
      expect(out).toMatch(/tags.*string\[\]/);
    });
  });
});

// ─── 3. User Profile ────────────────────────────────────────────────────────

describe('Real-world: User Profile', () => {
  const schema = inferSchema(USER_PROFILE);

  describe('Zod', () => {
    const out = zodGen.generate(schema, 'User', {});

    it('applies z.email() to email field', () => {
      expect(out).toContain('email: z.email()');
    });

    it('generates address nested fields in a z.object() block', () => {
      expect(out).toContain('z.object({');
      expect(out).toMatch(/city.*z\.string/);
      expect(out).toMatch(/country.*z\.string/);
    });

    it('generates createdAt and updatedAt as datetime fields', () => {
      expect(out).toMatch(/createdAt.*z\.iso\.datetime/);
      expect(out).toMatch(/updatedAt.*z\.iso\.datetime/);
    });

    it('generates isActive as z.boolean()', () => {
      expect(out).toContain('isActive: z.boolean()');
    });
  });

  describe('TypeScript', () => {
    const out = tsGen.generate(schema, 'User');

    it('generates nested Address interface', () => {
      expect(out).toMatch(/Address\s*\{/);
      expect(out).toMatch(/street.*string/);
      expect(out).toMatch(/city.*string/);
    });

    it('types email as string', () => {
      expect(out).toMatch(/email.*string/);
    });

    it('types isActive as boolean', () => {
      expect(out).toMatch(/isActive.*boolean/);
    });

    it('exports the User type/interface', () => {
      expect(out).toMatch(/export (type|interface) User/);
    });
  });
});

// ─── 4. Paginated API Response ──────────────────────────────────────────────

describe('Real-world: Paginated API Response', () => {
  const schema = inferSchema(PAGINATED_RESPONSE);

  describe('Zod', () => {
    const out = zodGen.generate(schema, 'Response', {});

    it('generates data as z.array()', () => {
      expect(out).toContain('z.array(');
    });

    it('applies .int() constraints to pagination counts', () => {
      expect(out).toMatch(/page.*z\.number\(\)\.int/);
      expect(out).toMatch(/total.*z\.number\(\)\.int|totalPages.*z\.number\(\)\.int/);
    });

    it('generates pagination nested fields as z.object() block', () => {
      expect(out).toContain('z.object({');
      expect(out).toMatch(/perPage.*z\.number/);
      expect(out).toMatch(/totalPages.*z\.number/);
    });

    it('generates meta nested fields in the output', () => {
      // requestId value is 'req_abc123' (not UUID format) → z.string(), not z.uuid()
      expect(out).toMatch(/requestId.*z\.string/);
      expect(out).toMatch(/timestamp.*z\.iso\.datetime/);
    });

    it('applies .min(0) to price inside data items', () => {
      expect(out).toContain('price: z.number().min(0)');
    });
  });

  describe('TypeScript', () => {
    const out = tsGen.generate(schema, 'Response');

    it('generates Pagination interface', () => {
      expect(out).toMatch(/Pagination\s*\{/);
      expect(out).toMatch(/perPage.*number/);
    });

    it('generates Meta interface', () => {
      expect(out).toMatch(/Meta\s*\{/);
    });

    it('types data as array', () => {
      expect(out).toMatch(/data.*\[\]/);
    });
  });
});

// ─── 5. Financial Transaction ────────────────────────────────────────────────

describe('Real-world: Financial Transaction', () => {
  const schema = inferSchema(TRANSACTION);

  describe('Zod', () => {
    const out = zodGen.generate(schema, 'Transaction', {});

    it('applies .min(0) to amount and fee', () => {
      expect(out).toContain('amount: z.number().min(0)');
      expect(out).toContain('fee: z.number().min(0)');
    });

    it('generates metadata nested fields in a z.object() block', () => {
      expect(out).toContain('z.object({');
      expect(out).toMatch(/reference.*z\.string/);
      expect(out).toMatch(/note.*z\.string/);
    });

    it('generates currency and status as string, enum, or literal (single-sample inference)', () => {
      // With one data sample, single-value strings may be inferred as z.literal() or z.enum([...])
      // All are more specific than plain `string`; z.literal() is preferred for single values
      expect(out).toMatch(/currency.*z\.(string|enum|literal)/);
      expect(out).toMatch(/status.*z\.(string|enum|literal)/);
    });
  });

  describe('TypeScript', () => {
    const out = tsGen.generate(schema, 'Transaction');

    it('generates Metadata interface', () => {
      expect(out).toMatch(/Metadata\s*\{/);
      expect(out).toMatch(/reference.*string/);
    });

    it('types amount and fee as number', () => {
      expect(out).toMatch(/amount.*number/);
      expect(out).toMatch(/fee.*number/);
    });

    it('exports the Transaction type/interface', () => {
      expect(out).toMatch(/export (type|interface) Transaction/);
    });
  });

  describe('Prisma', () => {
    const out = prismaGen.generate(schema, 'Transaction');

    it('generates model Transaction', () => {
      expect(out).toContain('model Transaction');
    });

    it('maps amount and fee to Decimal (monetary fields)', () => {
      expect(out).toMatch(/amount\s+Decimal/);
      expect(out).toMatch(/fee\s+Decimal/);
    });

    it('generates model Transaction with amount and fee fields', () => {
      expect(out).toContain('model Transaction');
      expect(out).toMatch(/amount\s+Decimal/);
      expect(out).toMatch(/fee\s+Decimal/);
    });
  });
});

// ─── Real API fixture tests ──────────────────────────────────────────────────
// These tests use actual API response shapes to catch semantic misclassification.
// Rule: if a public API returns a value, the generated schema must accept that value.

describe('Real API fixtures — empty string fields (regression: gravatar_id bug)', () => {
  // GitHub GET /users/:username returns gravatar_id as "" when not set.
  // Before fix: inferred as z.uuid() which would REJECT the actual API response.
  const GITHUB_USER = {
    login: 'octocat',
    id: 1,
    node_id: 'MDQ6VXNlcjE=',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    gravatar_id: '',
    url: 'https://api.github.com/users/octocat',
    html_url: 'https://github.com/octocat',
    type: 'User',
    site_admin: false,
    name: 'monalisa octocat',
    company: 'GitHub',
    blog: 'https://github.com/blog',
    location: 'San Francisco',
    email: null as unknown as string,
    hireable: null as unknown as boolean,
    bio: 'There once was...',
    public_repos: 2,
    followers: 20,
    following: 0,
    created_at: '2008-01-14T04:33:35Z',
    updated_at: '2008-01-14T04:33:35Z',
  };

  const schema = inferSchema(GITHUB_USER);
  const zodOut = zodGen.generate(schema, 'GitHubUser');

  it('gravatar_id: "" must NOT become z.uuid() — would reject real API response', () => {
    expect(zodOut).not.toContain('gravatar_id: z.uuid()');
    expect(zodOut).not.toContain('gravatar_id: z.string().uuid()');
  });

  it('gravatar_id: "" infers as plain z.string()', () => {
    expect(zodOut).toMatch(/gravatar_id:\s*z\.string\(\)/);
  });

  it('node_id with base64 value infers as z.string(), not z.uuid()', () => {
    // node_id value is base64 (e.g. "MDQ6VXNlcjE="), not UUID format — must be z.string()
    expect(zodOut).not.toContain('node_id: z.uuid()');
    expect(zodOut).toMatch(/node_id:\s*z\.string/);
  });

  it('avatar_url with real URL value infers as z.url()', () => {
    expect(zodOut).toMatch(/avatar_url:\s*z\.url\(\)/);
  });

  it('created_at ISO string infers as z.iso.datetime()', () => {
    expect(zodOut).toMatch(/created_at:\s*z\.iso\.datetime\(\)/);
  });

  it('type with single observed value infers as z.literal("User")', () => {
    expect(zodOut).toContain('type: z.literal("User")');
  });

  it('site_admin boolean field infers as z.boolean()', () => {
    expect(zodOut).toContain('site_admin: z.boolean()');
  });
});

describe('Real API fixtures — empty string engine schema', () => {
  it('empty string fields get format:text sentinel, not uuid/email/url', () => {
    const s = inferSchema({ gravatar_id: '', contact_email: '', profile_url: '' });
    expect(s.fields?.gravatar_id?.format).toBe('text');
    expect(s.fields?.contact_email?.format).toBe('text');
    expect(s.fields?.profile_url?.format).toBe('text');
  });

  it('_id fields with non-UUID values do NOT get uuid format', () => {
    // Only actual UUID-format values trigger uuid inference, not field name alone
    const s = inferSchema({ user_id: 'abc', product_id: '123' });
    expect(s.fields?.user_id?.format).not.toBe('uuid');
    expect(s.fields?.product_id?.format).not.toBe('uuid');
  });

  it('words ending in "id" as substring do NOT get uuid (valid, grid, bid)', () => {
    const s = inferSchema({ valid: 'yes', grid: '3x3', bid: '500' });
    expect(s.fields?.valid?.format).not.toBe('uuid');
    expect(s.fields?.grid?.format).not.toBe('uuid');
    expect(s.fields?.bid?.format).not.toBe('uuid');
  });
});

describe('Real API fixtures — Twilio (regression)', () => {
  const TWILIO_SMS = {
    account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    api_version: '2010-04-01',
    body: 'Hi there',
    date_created: 'Thu, 30 Jul 2015 20:12:31 +0000',
    direction: 'outbound-api',
    error_code: null as unknown as string,
    from: '+15017122661',
    num_media: '0',
    price: '-0.00750',
    price_unit: 'USD',
    sid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    status: 'sent',
    subresource_uris: { media: '/2010-04-01/Accounts/ACxxx/Messages/SMxxx/Media.json' },
    to: '+15558675310',
    uri: '/2010-04-01/Accounts/ACxxx/Messages/SMxxx.json',
  };

  const schema = inferSchema(TWILIO_SMS);
  const zodOut = zodGen.generate(schema, 'TwilioSMS');

  it('api_version "2010-04-01" must NOT become z.coerce.date() — it is a version string', () => {
    expect(zodOut).not.toContain('api_version: z.coerce.date()');
    expect(zodOut).not.toContain('api_version: z.date()');
  });

  it('api_version stays as z.string()', () => {
    expect(zodOut).toMatch(/api_version:\s*z\.string/);
  });

  it('uri with relative path must NOT become z.url() — z.url() requires absolute URL', () => {
    expect(zodOut).not.toContain('uri: z.url()');
  });

  it('uri relative path stays as z.string()', () => {
    expect(zodOut).toMatch(/uri:\s*z\.string/);
  });

  it('price as string number stays as z.string() — not coerced to number', () => {
    expect(zodOut).toMatch(/price:\s*z\.string/);
  });
});

describe('Real API fixtures — URL key-name inference', () => {
  it('key name "avatar" with placeholder value still infers z.url() (key name trusted)', () => {
    const s = inferSchema({ avatar: 'placeholder-string' });
    expect(s.fields?.avatar?.format).toBe('url');
  });

  it('key name "uri" with relative path does NOT infer z.url()', () => {
    const s = inferSchema({ uri: '/api/v1/resource' });
    expect(s.fields?.uri?.format).not.toBe('url');
  });

  it('key name "profile_url" with absolute URL infers z.url()', () => {
    const s = inferSchema({ profile_url: 'https://example.com/photo.jpg' });
    expect(s.fields?.profile_url?.format).toBe('url');
  });

  it('key name "api_version" with date-like string does NOT infer date format', () => {
    const s = inferSchema({ api_version: '2024-01-15' });
    expect(s.fields?.api_version?.format).not.toBe('date');
  });
});

describe('Real API fixtures — Stripe PaymentIntent (regression: isomorphic merge bug)', () => {
  // Root object had 20+ null fields (type:any). The isomorphic detection was incorrectly
  // treating "null field in parent, absent in child" as a match, causing the nested
  // automatic_payment_methods object to be merged into a z.lazy() self-reference.
  const STRIPE_PI = {
    id: 'pi_abc123',
    object: 'payment_intent',
    amount: 2000,
    amount_capturable: 0,
    application: null as unknown as string,
    application_fee_amount: null as unknown as number,
    automatic_payment_methods: { allow_redirects: 'always', enabled: true },
    canceled_at: null as unknown as number,
    cancellation_reason: null as unknown as string,
    capture_method: 'automatic',
    created: 1724000000,
    currency: 'usd',
    description: null as unknown as string,
    invoice: null as unknown as string,
    last_payment_error: null as unknown as object,
    latest_charge: null as unknown as string,
    livemode: false,
    metadata: {},
    next_action: null as unknown as object,
    payment_method: null as unknown as string,
    payment_method_types: ['card'],
    status: 'requires_payment_method',
    transfer_data: null as unknown as object,
    transfer_group: null as unknown as string,
  };

  it('must NOT produce z.lazy() — nested object should not be merged into parent', () => {
    const out = runEngine(STRIPE_PI, 'zod', '');
    expect(out).not.toContain('z.lazy(');
  });

  it('automatic_payment_methods generates as its own named schema', () => {
    const out = runEngine(STRIPE_PI, 'zod', '');
    expect(out).toMatch(/AutomaticPaymentMethods|automaticPaymentMethods/i);
    expect(out).toContain('allow_redirects');
    expect(out).toContain('enabled');
  });

  it('allow_redirects and enabled must NOT appear at root schema level', () => {
    const out = runEngine(STRIPE_PI, 'zod', '');
    // In root schema block only — the nested schema should contain them
    const rootBlock = out.split('export const')[out.split('export const').length - 1];
    expect(rootBlock).not.toContain('allow_redirects');
    expect(rootBlock).not.toContain('enabled: z.boolean()');
  });
});

describe('Real API fixtures — Spotify (regression)', () => {
  it('isrc field must NOT become z.url() — "src" in "isrc" is not a URL indicator', () => {
    const s = inferSchema({ isrc: 'GBUM71029604' });
    expect(s.fields?.isrc?.format).not.toBe('url');
  });

  it('isrc infers as plain string', () => {
    const out = runEngine({ external_ids: { isrc: 'GBUM71029604' } }, 'zod', '');
    expect(out).toMatch(/isrc:\s*z\.string/);
    expect(out).not.toContain('isrc: z.url()');
  });

  it('uri with custom scheme "spotify:track:abc" must NOT become z.url()', () => {
    const s = inferSchema({ uri: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh' });
    expect(s.fields?.uri?.format).not.toBe('url');
  });

  it('uri with https:// still infers as z.url()', () => {
    const s = inferSchema({ uri: 'https://api.spotify.com/v1/tracks/abc' });
    expect(s.fields?.uri?.format).toBe('url');
  });

  it('image_src with https:// still infers as z.url()', () => {
    const s = inferSchema({ image_src: 'https://cdn.example.com/img.jpg' });
    expect(s.fields?.image_src?.format).toBe('url');
  });

  it('custom URI schemes (mailto:, spotify:) are excluded from URL inference', () => {
    const s = inferSchema({ callback_url: 'mailto:user@example.com' });
    expect(s.fields?.callback_url?.format).not.toBe('url');
  });
});
