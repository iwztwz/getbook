module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  let targetUrl = url.pathname.slice(1) + url.search;

  if (!targetUrl || targetUrl === 'favicon.ico') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).end(`<h1>Vercel Proxy</h1><p>用法: /api/proxy/https://目标网站.com</p>`);
  }

  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const resp = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'zh-CN,zh;q=0.9',
        'Referer': req.headers['referer'] || '',
      },
      redirect: 'manual'
    });

    const respHeaders = {};
    resp.headers.forEach((val, key) => {
      if (!['content-security-policy', 'x-frame-options', 'set-cookie'].includes(key)) {
        respHeaders[key] = val;
      }
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = respHeaders['location'];
      if (location) {
        const newLocation = new URL(location, targetUrl).href;
        respHeaders['location'] = `/api/proxy/${newLocation}`;
      }
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    res.status(resp.status);
    Object.keys(respHeaders).forEach(k => res.setHeader(k, respHeaders[k]));
    res.end(buf);
  } catch (e) {
    res.status(500).end(`Proxy Error: ${e.message}`);
  }
};
