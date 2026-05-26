import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { method?: string };

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

const jsonResponse = (res: VercelResponse, status: number, data: unknown) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  return jsonResponse(res, 200, {
    ok: true,
    service: 'paporeto',
    timestamp: new Date().toISOString(),
    integrations: {
      ai: Boolean(process.env.API_KEY || process.env.GOOGLE_API_KEY),
      profileBlobCache: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      legislativeProxy: true,
    },
  });
}
