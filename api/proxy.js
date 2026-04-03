export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing ?url= parameter" });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": req.headers["accept"] || "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    if (contentType.includes("text/html")) {
      let html = await response.text();
      const base = new URL(targetUrl);

      html = html
        .replace(/(href|src|action)="(\/[^"]*)"/gi, (_, attr, path) => {
          const absolute = `${base.origin}${path}`;
          return `${attr}="/api/proxy?url=${encodeURIComponent(absolute)}"`;
        })
        .replace(/(href|src|action)='(\/[^']*)'/gi, (_, attr, path) => {
          const absolute = `${base.origin}${path}`;
          return `${attr}='/api/proxy?url=${encodeURIComponent(absolute)}'`;
        });

      return res.status(response.status).send(html);
    } else {
      const buffer = await response.arrayBuffer();
      return res.status(response.status).send(Buffer.from(buffer));
    }
  } catch (err) {
    return res.status(500).json({ error: "Fetch failed", details: err.message });
  }
}
