import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { getEnv, getSubdomain } from 'erxes-api-shared/utils';
import { generateModels } from '~/connectionResolvers';

const router: Router = Router();

type Role = 'owner' | 'staff' | 'admin';

const getSalonCoreConfig = () => {
  const baseUrl = getEnv({ name: 'SALON_CORE_API_URL' });
  const adminToken = getEnv({ name: 'SALON_CORE_ADMIN_TOKEN' });
  return { baseUrl, adminToken };
};

const getUserContext = async (req: Request) => {
  const userId = (req.headers.userid as string) || '';
  if (!userId) return null;
  const subdomain = getSubdomain(req);
  const models = await generateModels(subdomain);
  const user = await models.Users.findOne({ _id: userId });
  if (!user) return null;
  return { user, subdomain };
};

const resolveRole = (user: any): Role => {
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    return 'admin';
  }
  return user?.isOwner ? 'owner' : 'staff';
};

const allowCrossTenant = () => getEnv({ name: 'SALONHELP_ALLOW_CROSS_TENANT', defaultValue: '' }) === '1';

const resolveTenantId = (req: Request, subdomain: string) =>
  (req.params as { tenantId?: string }).tenantId || subdomain;

const maskConfig = (config: Record<string, unknown>) => {
  const cloned = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const redactKeys = ['token', 'secret', 'password', 'apikey', 'apiKey', 'appToken'];

  const mask = (value: string) => (value.length <= 4 ? '***' : `***${value.slice(-4)}`);

  const walk = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        walk(value as Record<string, unknown>);
        continue;
      }
      const lower = key.toLowerCase();
      if (typeof value === 'string' && redactKeys.some((k) => lower.includes(k.toLowerCase()))) {
        obj[key] = mask(value);
      }
    }
  };

  walk(cloned);
  return cloned;
};

const proxy = async (req: Request, res: Response, method: 'GET' | 'PUT' | 'DELETE') => {
  const context = await getUserContext(req);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { user, subdomain } = context;
  const role = resolveRole(user);

  const tenantId = resolveTenantId(req, subdomain);
  if (!allowCrossTenant() && tenantId !== subdomain) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { baseUrl, adminToken } = getSalonCoreConfig();
  if (!baseUrl || !adminToken) {
    return res.status(503).json({ error: 'SALON_CORE_API_URL or SALON_CORE_ADMIN_TOKEN not configured' });
  }

  if (method !== 'GET' && role === 'staff') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/tenants/${encodeURIComponent(tenantId)}/config`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken,
    },
    body: method === 'GET' ? undefined : JSON.stringify(req.body || {}),
  });

  const text = await response.text();
  if (!response.ok) {
    return res.status(response.status).send(text || response.statusText);
  }

  if (method === 'GET') {
    const data = text ? JSON.parse(text) : {};
    const config = data?.config || {};
    return res.status(200).json({
      tenantId,
      role,
      config: role === 'staff' ? maskConfig(config) : config,
    });
  }

  return res.status(200).send(text || JSON.stringify({ ok: true }));
};

router.get('/salonhelp/tenant-config/:tenantId?', async (req: Request, res: Response) => {
  return proxy(req, res, 'GET');
});

router.put('/salonhelp/tenant-config/:tenantId?', async (req: Request, res: Response) => {
  return proxy(req, res, 'PUT');
});

router.delete('/salonhelp/tenant-config/:tenantId?', async (req: Request, res: Response) => {
  return proxy(req, res, 'DELETE');
});

export { router };
