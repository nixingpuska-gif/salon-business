import {
  Alert,
  Button,
  Input,
  Label,
  PageContainer,
  ScrollArea,
  Textarea,
  useToast,
} from 'erxes-ui';
import { REACT_APP_API_URL } from 'erxes-ui';
import { useAtomValue } from 'jotai';
import { currentUserState } from 'ui-modules';
import { useEffect, useMemo, useState } from 'react';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

const getDefaultTenantId = () => {
  const host = window.location.hostname || '';
  const parts = host.split('.');
  if (parts.length === 1) return host || 'default';
  return parts[0] || 'default';
};

const TENANT_CONFIG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    channels: {
      type: 'object',
      additionalProperties: false,
      properties: {
        telegram: {
          type: 'object',
          properties: { botToken: { type: 'string' }, sendUrl: { type: 'string' } },
        },
        whatsapp: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            apiBase: { type: 'string' },
            phoneId: { type: 'string' },
            sendUrl: { type: 'string' },
          },
        },
        instagram: {
          type: 'object',
          properties: { token: { type: 'string' }, sendUrl: { type: 'string' } },
        },
        vkmax: {
          type: 'object',
          properties: { token: { type: 'string' }, sendUrl: { type: 'string' } },
        },
      },
    },
    webhooks: {
      type: 'object',
      additionalProperties: false,
      properties: {
        telegram: { type: 'object', properties: { secret: { type: 'string' } } },
        whatsapp: { type: 'object', properties: { secret: { type: 'string' } } },
        instagram: { type: 'object', properties: { secret: { type: 'string' } } },
        vkmax: { type: 'object', properties: { secret: { type: 'string' } } },
      },
    },
    erxes: {
      type: 'object',
      properties: {
        apiBase: { type: 'string' },
        appToken: { type: 'string' },
        nginxHostname: { type: 'string' },
        brandId: { type: 'string' },
        integrationIds: { type: 'array', items: { type: 'string' } },
      },
    },
    calcom: {
      type: 'object',
      properties: {
        apiBase: { type: 'string' },
        apiKey: { type: 'string' },
        webhookSecret: { type: 'string' },
      },
    },
    access: {
      type: 'object',
      properties: {
        ownerTokens: { type: 'array', items: { type: 'string' } },
        staffTokens: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};

const TEMPLATE_MINIMAL = {
  erxes: { brandId: '', integrationIds: [] },
  calcom: { apiKey: '' },
};

const TEMPLATE_BOTS = {
  channels: {
    telegram: { botToken: '' },
    whatsapp: { token: '', apiBase: 'https://graph.facebook.com/v19.0', phoneId: '' },
    instagram: { token: '', sendUrl: 'https://graph.facebook.com/v19.0/me/messages' },
    vkmax: { token: '', sendUrl: '' },
  },
};

const TEMPLATE_WEBHOOKS = {
  webhooks: {
    telegram: { secret: '' },
    whatsapp: { secret: '' },
    instagram: { secret: '' },
    vkmax: { secret: '' },
  },
};

const TEMPLATE_FULL = {
  ...TEMPLATE_MINIMAL,
  ...TEMPLATE_BOTS,
  ...TEMPLATE_WEBHOOKS,
  access: { ownerTokens: [''], staffTokens: [''] },
};

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function SalonHelpSettingsPage() {
  const { toast } = useToast();
  const currentUser = useAtomValue(currentUserState) as {
    isOwner?: boolean;
    role?: string;
  };
  const [tenantId, setTenantId] = useState(getDefaultTenantId());
  const [configText, setConfigText] = useState('{\n  \n}');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('');
  const schemaText = useMemo(() => toJson(TENANT_CONFIG_SCHEMA), []);

  const baseUrl = useMemo(() => {
    if (!REACT_APP_API_URL) return '';
    return trimSlash(REACT_APP_API_URL);
  }, []);

  useEffect(() => {
    if (currentUser?.role) {
      setRole(currentUser.role);
    } else if (currentUser?.isOwner) {
      setRole('owner');
    } else if (currentUser) {
      setRole('staff');
    }
  }, [currentUser]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let parsed: Record<string, unknown> | null = null;

    try {
      parsed = JSON.parse(configText || '{}') as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      errors.push(message);
      return { parsed: null, errors, warnings };
    }

    if (!isPlainObject(parsed)) {
      errors.push('Config must be a JSON object');
      return { parsed: null, errors, warnings };
    }

    const allowedKeys = new Set([
      'channels',
      'webhooks',
      'erxes',
      'calcom',
      'access',
    ]);
    const unknownKeys = Object.keys(parsed).filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length > 0) {
      warnings.push(`Unknown top-level keys: ${unknownKeys.join(', ')}`);
    }

    const channels = parsed.channels;
    if (channels !== undefined && !isPlainObject(channels)) {
      errors.push('channels must be an object');
    }

    const checkChannel = (
      value: unknown,
      channel: string,
      requiredAny: string[],
    ) => {
      if (value === undefined) return;
      if (!isPlainObject(value)) {
        errors.push(`channels.${channel} must be an object`);
        return;
      }
      for (const field of requiredAny) {
        const entry = value[field];
        if (entry !== undefined && typeof entry !== 'string') {
          errors.push(`channels.${channel}.${field} must be a string`);
        }
      }
      const hasAny = requiredAny.some(
        (field) => typeof value[field] === 'string' && value[field],
      );
      if (!hasAny) {
        warnings.push(`channels.${channel} is missing token or sendUrl`);
      }
    };

    if (isPlainObject(channels)) {
      checkChannel(channels.telegram, 'telegram', ['botToken', 'sendUrl']);
      checkChannel(channels.whatsapp, 'whatsapp', [
        'token',
        'apiBase',
        'phoneId',
        'sendUrl',
      ]);
      checkChannel(channels.instagram, 'instagram', ['token', 'sendUrl']);
      checkChannel(channels.vkmax, 'vkmax', ['token', 'sendUrl']);
    }

    const webhooks = parsed.webhooks;
    if (webhooks !== undefined && !isPlainObject(webhooks)) {
      errors.push('webhooks must be an object');
    }

    const checkWebhook = (value: unknown, channel: string) => {
      if (value === undefined) return;
      if (!isPlainObject(value)) {
        errors.push(`webhooks.${channel} must be an object`);
        return;
      }
      const secret = value.secret;
      if (secret !== undefined && typeof secret !== 'string') {
        errors.push(`webhooks.${channel}.secret must be a string`);
      }
      if (!secret) {
        warnings.push(`webhooks.${channel}.secret is missing`);
      }
    };

    if (isPlainObject(webhooks)) {
      checkWebhook(webhooks.telegram, 'telegram');
      checkWebhook(webhooks.whatsapp, 'whatsapp');
      checkWebhook(webhooks.instagram, 'instagram');
      checkWebhook(webhooks.vkmax, 'vkmax');
    }

    const erxes = parsed.erxes;
    if (erxes !== undefined && !isPlainObject(erxes)) {
      errors.push('erxes must be an object');
    }

    if (isPlainObject(erxes)) {
      const brandId = erxes.brandId;
      if (brandId !== undefined && typeof brandId !== 'string') {
        errors.push('erxes.brandId must be a string');
      }
      if (!brandId) warnings.push('erxes.brandId is missing');

      const apiBase = erxes.apiBase;
      if (apiBase !== undefined && typeof apiBase !== 'string') {
        errors.push('erxes.apiBase must be a string');
      }
      const appToken = erxes.appToken;
      if (appToken !== undefined && typeof appToken !== 'string') {
        errors.push('erxes.appToken must be a string');
      }
      const nginxHostname = erxes.nginxHostname;
      if (nginxHostname !== undefined && typeof nginxHostname !== 'string') {
        errors.push('erxes.nginxHostname must be a string');
      }

      const integrationIds = erxes.integrationIds;
      if (integrationIds !== undefined && !isStringArray(integrationIds)) {
        errors.push('erxes.integrationIds must be an array of strings');
      }
    }

    const calcom = parsed.calcom;
    if (calcom !== undefined && !isPlainObject(calcom)) {
      errors.push('calcom must be an object');
    }

    if (isPlainObject(calcom)) {
      const apiKey = calcom.apiKey;
      if (apiKey !== undefined && typeof apiKey !== 'string') {
        errors.push('calcom.apiKey must be a string');
      }
      if (!apiKey) warnings.push('calcom.apiKey is missing');
      const apiBase = calcom.apiBase;
      if (apiBase !== undefined && typeof apiBase !== 'string') {
        errors.push('calcom.apiBase must be a string');
      }
      const webhookSecret = calcom.webhookSecret;
      if (webhookSecret !== undefined && typeof webhookSecret !== 'string') {
        errors.push('calcom.webhookSecret must be a string');
      }
    }

    const access = parsed.access;
    if (access !== undefined && !isPlainObject(access)) {
      errors.push('access must be an object');
    }

    if (isPlainObject(access)) {
      const owners = access.ownerTokens;
      const staff = access.staffTokens;
      if (owners !== undefined && !isStringArray(owners)) {
        errors.push('access.ownerTokens must be an array of strings');
      }
      if (staff !== undefined && !isStringArray(staff)) {
        errors.push('access.staffTokens must be an array of strings');
      }
      if (!owners || owners.length === 0) {
        warnings.push('access.ownerTokens is empty');
      }
    }

    return { parsed, errors, warnings };
  }, [configText]);

  const applyTemplate = (template: Record<string, unknown>) => {
    setConfigText(toJson(template));
  };

  const loadConfig = async () => {
    if (!baseUrl || !tenantId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/salonhelp/tenant-config/${encodeURIComponent(tenantId)}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      const data = (await response.json()) as { config?: unknown; role?: string };
      setConfigText(JSON.stringify(data.config ?? {}, null, 2));
      if (data.role) setRole(data.role);
      toast({ title: 'Loaded', description: 'Tenant config loaded.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!baseUrl || !tenantId) return;
    if (validation.errors.length > 0) {
      toast({
        title: 'Invalid config',
        description: validation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/salonhelp/tenant-config/${encodeURIComponent(tenantId)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validation.parsed || {}),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      toast({ title: 'Saved', description: 'Tenant config saved.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async () => {
    if (!baseUrl || !tenantId) return;
    if (!window.confirm(`Delete config for ${tenantId}?`)) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/salonhelp/tenant-config/${encodeURIComponent(tenantId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }
      toast({ title: 'Deleted', description: 'Tenant config deleted.' });
      setConfigText('{\n  \n}');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const canWrite = role === 'owner' || role === 'admin' || currentUser?.isOwner;

  return (
    <PageContainer>
      <ScrollArea>
        <section className="mx-auto max-w-3xl w-full relative">
          <h2 className="font-semibold text-lg mt-4 mb-6 px-4">
            SalonHELP Tenant Config
          </h2>
          <div className="flex flex-col gap-4 px-4 w-full h-auto">
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <Alert.Title>Invalid config</Alert.Title>
                <Alert.Description>
                  {validation.errors.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </Alert.Description>
              </Alert>
            )}
            {validation.errors.length === 0 && validation.warnings.length > 0 && (
              <Alert variant="warning">
                <Alert.Title>Warnings</Alert.Title>
                <Alert.Description>
                  {validation.warnings.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </Alert.Description>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tenant ID</Label>
                <Input
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  placeholder="salon-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={role || 'unknown'} readOnly />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={loadConfig} disabled={loading || !tenantId}>
                Load
              </Button>
              <Button
                onClick={saveConfig}
                disabled={loading || !tenantId || !canWrite}
              >
                Save
              </Button>
              <Button
                onClick={deleteConfig}
                disabled={loading || !tenantId || !canWrite}
                variant="destructive"
              >
                Delete
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Templates</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => applyTemplate(TEMPLATE_MINIMAL)}
                  disabled={loading || !canWrite}
                  variant="outline"
                >
                  Minimal
                </Button>
                <Button
                  onClick={() => applyTemplate(TEMPLATE_BOTS)}
                  disabled={loading || !canWrite}
                  variant="outline"
                >
                  Bots
                </Button>
                <Button
                  onClick={() => applyTemplate(TEMPLATE_WEBHOOKS)}
                  disabled={loading || !canWrite}
                  variant="outline"
                >
                  Webhooks
                </Button>
                <Button
                  onClick={() => applyTemplate(TEMPLATE_FULL)}
                  disabled={loading || !canWrite}
                  variant="outline"
                >
                  Full
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Config JSON</Label>
              <Textarea
                value={configText}
                onChange={(event) => setConfigText(event.target.value)}
                rows={18}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label>Schema (read-only)</Label>
              <Textarea
                value={schemaText}
                readOnly
                rows={16}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </section>
        <ScrollArea.Bar />
      </ScrollArea>
    </PageContainer>
  );
}
