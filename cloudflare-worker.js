/**
 * Cloudflare Worker for Kytario Songbook Proxy
 * 
 * Resolves CORS restrictions when running Kytario Print Customizer on static hosts
 * such as GitHub Pages (github.io).
 * 
 * Setup instructions:
 * 1. Log in to your Cloudflare dashboard (https://dash.cloudflare.com)
 * 2. Go to "Workers & Pages" -> "Create application" -> "Create Worker"
 * 3. Give it a name (e.g. "kytario-proxy") and click "Deploy"
 * 4. Click "Edit code", paste the contents of this file, and click "Deploy"
 * 5. Copy your worker URL (e.g. https://kytario-proxy.<your-subdomain>.workers.dev)
 * 6. Set VITE_KYTARIO_PROXY_URL in GitHub repo variables or directly in the app UI
 */

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    try {
      const url = new URL(request.url);

      // 2. Extract songbook token from path or query parameters
      // Examples supported:
      // - /bodg
      // - /api/proxy/kytario/bodg
      // - /?token=bodg
      // - /?url=https://kytario.com/cs/bodg
      let token = url.searchParams.get("token") || "";
      const rawUrl = url.searchParams.get("url") || "";

      if (!token) {
        const segments = url.pathname.split("/").filter(Boolean);
        const filtered = segments.filter(
          (s) => !["api", "proxy", "kytario", "songbooks", "cs", "sk", "en"].includes(s.toLowerCase())
        );
        if (filtered.length > 0) {
          token = filtered[filtered.length - 1];
        }
      }

      if (!token && rawUrl) {
        const match = rawUrl.match(/(?:songbooks?|cs|sk|en|zpevnik)?\/([a-zA-Z0-9_\-]+)\/?(?=[?#]|$)/i);
        if (match && match[1]) {
          token = match[1];
        }
      }

      if (!token) {
        return new Response(
          JSON.stringify({
            error: "Missing songbook token. Provide a path like /<token> or query ?token=<token>",
            status: 400,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // 3. Fetch canonical songbook sections payload from Kytario API
      const kytarioApiUrl = `https://kytario.com/api/songbooks/${encodeURIComponent(token)}/sections`;
      const upstreamResponse = await fetch(kytarioApiUrl, {
        headers: {
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!upstreamResponse.ok) {
        return new Response(
          JSON.stringify({
            error: `Kytario upstream returned status ${upstreamResponse.status}`,
            status: upstreamResponse.status,
            token,
          }),
          {
            status: upstreamResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      let payload = await upstreamResponse.json();

      // 4. Optionally enrich with authentic songbook title from PDF Content-Disposition
      try {
        const pdfHeadRes = await fetch(`https://kytario.com/api/songbooks/${encodeURIComponent(token)}/pdf`, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        const cd = pdfHeadRes.headers.get("content-disposition");
        if (cd) {
          const match = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="([^"]+)"/i);
          if (match && match[1]) {
            let filename = decodeURIComponent(match[1]).replace(/\.pdf$/i, "").trim().replace(/^'+|'+$/g, "");
            if (filename && filename.toLowerCase() !== "kytario" && !payload.title) {
              payload.title = filename;
              payload.name = filename;
              payload.songbookTitle = filename;
            }
          }
        }
      } catch (headErr) {
        // Non-blocking title enrichment
      }

      // 5. Return JSON with full CORS permissions
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Internal proxy error: " + (err.message || String(err)),
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
