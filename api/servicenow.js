// Vercel Serverless Function — ServiceNow proxy.
//
// WHY: the browser can't call ServiceNow directly (CORS), and credentials must
// never live in client code. This function runs on the server, reads the
// credentials from environment variables, and calls ServiceNow server-to-server.
//
// Configure these in Vercel → Project → Settings → Environment Variables:
//   SN_INSTANCE       e.g. https://acme.service-now.com   (required)
//   SN_AUTH           'basic' (default) or 'oauth'
//   -- Basic auth:
//   SN_USER           integration user
//   SN_PASSWORD       integration user password
//   -- OAuth client-credentials (if SN_AUTH=oauth):
//   SN_CLIENT_ID
//   SN_CLIENT_SECRET
//   SN_TOKEN_URL      default '/oauth_token.do'
//   -- Optional:
//   SN_STORY_PATH     default '/api/now/table/rm_story'
//   SN_QUERY          default sysparm_query (e.g. sprint.short_descriptionLIKESprint 11)
//   SN_PROXY_TOKEN    if set, callers must send matching 'x-proxy-token' header
//
// Endpoints:
//   GET /api/servicenow?action=test               → { ok, instance }
//   GET /api/servicenow?action=stories&query=...   → { ok, instance, stories:[...] }

async function snAuthHeader() {
  const instance = (process.env.SN_INSTANCE || '').replace(/\/$/, '');
  const mode = (process.env.SN_AUTH || 'basic').toLowerCase();
  if (mode === 'oauth') {
    const tokenUrl = instance + (process.env.SN_TOKEN_URL || '/oauth_token.do');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SN_CLIENT_ID || '',
      client_secret: process.env.SN_CLIENT_SECRET || ''
    });
    const r = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body
    });
    if (!r.ok) throw new Error('Token request failed (' + r.status + ')');
    const j = await r.json();
    if (!j.access_token) throw new Error('No access_token in token response');
    return 'Bearer ' + j.access_token;
  }
  if (!process.env.SN_USER) throw new Error('SN_USER / SN_PASSWORD not configured');
  return 'Basic ' + Buffer.from((process.env.SN_USER || '') + ':' + (process.env.SN_PASSWORD || '')).toString('base64');
}

function mapStory(r) {
  const rawPts = r.story_points;
  const pts = (rawPts != null && rawPts !== '') ? (parseInt(rawPts, 10) || rawPts) : null;
  return {
    id: r.number || r.sys_id,
    sys_id: r.sys_id,
    t: r.short_description || '(no title)',
    state: r.state || '',
    priority: r.priority || '',
    points: pts,
    short: r.short_description || '',
    details: r.description || '',
    criteria: r.acceptance_criteria || '',
    ai: '',
    tags: [],
    votes: []
  };
}

module.exports = async function handler(req, res) {
  const instance = (process.env.SN_INSTANCE || '').replace(/\/$/, '');
  if (!instance) {
    res.status(500).json({ error: 'ServiceNow is not configured on the server yet. Set SN_INSTANCE and credentials in Vercel environment variables (see api/servicenow.js).' });
    return;
  }

  // Optional shared-secret gate (leave SN_PROXY_TOKEN unset to keep the proxy open read-only).
  const token = process.env.SN_PROXY_TOKEN;
  if (token && (req.headers['x-proxy-token'] || '') !== token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const action = (req.query && req.query.action) || 'test';
  const storyPath = process.env.SN_STORY_PATH || '/api/now/table/rm_story';

  try {
    const auth = await snAuthHeader();

    if (action === 'test') {
      const r = await fetch(instance + storyPath + '?sysparm_limit=1&sysparm_fields=number', {
        headers: { Authorization: auth, Accept: 'application/json' }
      });
      if (!r.ok) throw new Error('GET failed (' + r.status + (r.status === 401 ? ' — check credentials' : '') + ')');
      await r.json();
      res.status(200).json({ ok: true, instance });
      return;
    }

    if (action === 'stories') {
      const q = ((req.query && req.query.query) || process.env.SN_QUERY || '').toString();
      const limit = Math.min(parseInt((req.query && req.query.limit), 10) || 200, 500);
      const params = new URLSearchParams({
        sysparm_limit: String(limit),
        sysparm_display_value: 'true',
        sysparm_exclude_reference_link: 'true'
      });
      if (q) params.set('sysparm_query', q);
      const r = await fetch(instance + storyPath + '?' + params.toString(), {
        headers: { Authorization: auth, Accept: 'application/json' }
      });
      if (!r.ok) throw new Error('GET failed (' + r.status + ')');
      const j = await r.json();
      const rows = (j && j.result) || [];
      res.status(200).json({ ok: true, instance, stories: rows.map(mapStory) });
      return;
    }

    res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
}
