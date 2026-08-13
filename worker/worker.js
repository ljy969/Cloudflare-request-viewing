// Cloudflare Worker API 代理
// 用于解决浏览器直接调用 Cloudflare API 时的 CORS 跨域问题
// 部署后将 Worker URL 填入应用设置中即可

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Email, X-Auth-Key',
  'Access-Control-Max-Age': '86400',
};

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: CORS_HEADERS });
    }

    // 只允许 POST 请求
    if (request.method !== 'POST') {
      return this.jsonResponse({ error: '只支持 POST 请求' }, 405);
    }

    try {
      const body = await request.json();
      const { url, method = 'GET', headers = {} } = body;

      // 验证请求
      if (!url || !url.startsWith(CF_API_BASE)) {
        return this.jsonResponse({ error: '无效的请求 URL，必须指向 Cloudflare API' }, 400);
      }

      // 构建转发请求
      const proxyHeaders = new Headers({
        'Content-Type': headers['Content-Type'] || 'application/json',
      });

      // 转发认证头
      if (headers['Authorization']) {
        proxyHeaders.set('Authorization', headers['Authorization']);
      }
      if (headers['X-Auth-Email']) {
        proxyHeaders.set('X-Auth-Email', headers['X-Auth-Email']);
      }
      if (headers['X-Auth-Key']) {
        proxyHeaders.set('X-Auth-Key', headers['X-Auth-Key']);
      }

      // 发起请求到 Cloudflare API
      const response = await fetch(url, {
        method,
        headers: proxyHeaders,
        body: method !== 'GET' && method !== 'HEAD' ? body.body || null : null,
      });

      // 返回结果
      const responseData = await response.text();
      const responseHeaders = {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Status': response.status,
      };

      return new Response(responseData, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      return this.jsonResponse(
        { error: '代理请求失败: ' + error.message },
        500
      );
    }
  },

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  },
};