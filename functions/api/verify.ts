// functions/api/verify.ts

// JSON Web Token (JWT) のような署名付きトークンを生成するためのユーティリティ
// Cloudflare Workers の Web Crypto API を使用
async function generateSignature(payload: string, secret: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  // 署名を Base64Url エンコード
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function onRequestPost(context: any) {
  // 環境変数から JWT シークレットと Gumroad (またはLemon Squeezy) の API キーを取得
  // Cloudflare ダッシュボードで設定するまでフォールバック値を使用
  const JWT_SECRET = context.env.JWT_SECRET || "fallback_secret_key_for_dev_only_12345";
  const GUMROAD_PRODUCT_PERMALINK = context.env.GUMROAD_PRODUCT_PERMALINK || "typeflow_pro";
  
  try {
    const request = context.request;
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return new Response(JSON.stringify({ error: 'License key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let isValid = false;
    let subject = "typeflow-pro-user";

    // 1. Gumroad API による検証
    try {
      const verifyRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          product_permalink: GUMROAD_PRODUCT_PERMALINK,
          license_key: licenseKey
        })
      });
      const verifyData = await verifyRes.json() as any;

      if (verifyData.success && !verifyData.purchase?.refunded && !verifyData.purchase?.chargebacked) {
        isValid = true;
        subject = licenseKey;
      }
    } catch (e) {
      console.error("Gumroad verify error", e);
    }

    // 2. 初期テストフェーズ用のモック認証（Gumroadにキーがない場合のフォールバック）
    if (!isValid && (licenseKey.startsWith('TF-PRO-DEV-') || licenseKey === 'test-key')) {
      isValid = true;
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid or expired license key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 有効な場合、JWTトークン（有効期限：32日間 = サブスクリプションモデルに最適）を発行
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=+$/, '');
    const payloadObj = {
      sub: subject,
      licensed: true,
      // サブスクリプションの有効期限（1ヶ月＋余裕の2日）
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 32) 
    };
    const payload = btoa(JSON.stringify(payloadObj)).replace(/=+$/, '');
    const signature = await generateSignature(`${header}.${payload}`, JWT_SECRET);
    
    const token = `${header}.${payload}.${signature}`;

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
