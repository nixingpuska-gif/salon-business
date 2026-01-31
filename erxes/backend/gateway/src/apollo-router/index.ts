import * as dotenv from 'dotenv';

import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import {
  dirTempPath,
  routerConfigPath,
  routerPath,
  supergraphPath,
} from '~/apollo-router/paths';
import supergraphCompose from '~/apollo-router/supergraph-compose';
import { isDev } from 'erxes-api-shared/utils';

dotenv.config();

const {
  DOMAIN,
  ALLOWED_ORIGINS,
  ALLOWED_DOMAINS,
  WIDGETS_DOMAIN,
  NODE_ENV,
  APOLLO_ROUTER_PORT,
  INTROSPECTION,
} = process.env;

let routerProcess: ChildProcess | undefined = undefined;
const isWindows = process.platform === 'win32';
const routerVersion = 'v1.59.2';
const routerContainerName = 'erxes-apollo-router';

export const stopRouter = (signal: NodeJS.Signals) => {
  if (!routerProcess) {
    return;
  }
  try {
    if (isWindows) {
      execSync(`docker stop ${routerContainerName}`, { stdio: 'ignore' });
      return;
    }
    routerProcess.kill(signal);
  } catch (e) {
    console.error(e);
  }
};
export const apolloRouterPort = Number(APOLLO_ROUTER_PORT) || 50_000;

const downloadRouter = async () => {
  if (NODE_ENV === 'production') {
    // router must be already inside the image
    return;
  }
  if (isWindows) {
    return;
  }
  if (fs.existsSync(routerPath)) {
    return routerPath;
  }

  const downloadCommand = `(export VERSION=${routerVersion}; curl -sSL https://router.apollo.dev/download/nix/${routerVersion} | sh)`;
  try {
    execSync(`cd ${dirTempPath} && ${downloadCommand}`);
  } catch (e) {
    console.error(
      `Could not download apollo router. Run \`${downloadCommand}\` inside ${dirTempPath} manually`,
    );
    throw e;
  }
};

const createRouterConfig = async () => {
  if (NODE_ENV === 'production' && fs.existsSync(routerConfigPath)) {
    // Don't rewrite in production if it exists. Delete and restart to update the config
    return;
  }

  if (
    NODE_ENV === 'production' &&
    (INTROSPECTION || '').trim().toLowerCase() === 'true'
  ) {
    console.warn(
      '----------------------------------------------------------------------------------------------',
    );
    console.warn(
      "Graphql introspection is enabled in production environment. Disable it, if it isn't required for front-end development. Hint: Check gateway config in configs.json",
    );
    console.warn(
      '----------------------------------------------------------------------------------------------',
    );
  }

  const rhaiScriptsPath = isWindows
    ? '/rhai'
    : path.resolve(__dirname, 'rhai');

  const config: any = {
    traffic_shaping: {
      all: {
        timeout: '300s',
      },
      router: {
        timeout: '300s',
      },
    },
    include_subgraph_errors: {
      all: true,
    },
    rhai: {
      scripts: rhaiScriptsPath,
      main: 'main.rhai',
    },
    cors: {
      allow_credentials: true,
      origins: [
        DOMAIN ? DOMAIN : 'http://localhost:3000',
        WIDGETS_DOMAIN ? WIDGETS_DOMAIN : 'http://localhost:3200',
        ...(ALLOWED_DOMAINS || '').split(','),
        'https://studio.apollographql.com',
      ].filter((x) => typeof x === 'string'),
      match_origins: (ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    },
    headers: {
      all: {
        request: [
          {
            propagate: {
              matching: '.*',
            },
          },
        ],
      },
    },
    supergraph: {
      listen: `127.0.0.1:${apolloRouterPort}`,
      introspection:
        NODE_ENV === 'development' ||
        (INTROSPECTION || '').trim().toLowerCase() === 'true',
    },
  };

  fs.writeFileSync(routerConfigPath, yaml.stringify(config));
};

export const startRouter = async (proxy) => {
  await createRouterConfig();
  console.log('Downloading router...');
  await downloadRouter();
  await supergraphCompose(proxy);
  console.log('Creating router config...');

  const devOptions = ['--dev'];

  if (isWindows) {
    const posixTempPath = dirTempPath.replace(/\\/g, '/');
    const posixRhaiPath = path
      .resolve(__dirname, 'rhai')
      .replace(/\\/g, '/');
    try {
      execSync(`docker rm -f ${routerContainerName}`, { stdio: 'ignore' });
    } catch {
      // ignore missing container
    }

    routerProcess = spawn(
      'docker',
      [
        'run',
        '--rm',
        '--name',
        routerContainerName,
        '-p',
        `${apolloRouterPort}:${apolloRouterPort}`,
        '-v',
        `${posixTempPath}:/config`,
        '-v',
        `${posixRhaiPath}:/rhai`,
        '--entrypoint',
        '/dist/router',
        `ghcr.io/apollographql/router:${routerVersion}`,
        ...(NODE_ENV === 'development' ? devOptions : []),
        '--log',
        NODE_ENV === 'development' ? 'warn' : 'error',
        '--supergraph',
        '/config/supergraph.graphql',
        '--config',
        '/config/router.yaml',
      ],
      { stdio: 'inherit' },
    );
    return;
  }

  routerProcess = spawn(
    routerPath,
    [
      ...(NODE_ENV === 'development' ? devOptions : []),
      '--log',
      NODE_ENV === 'development' ? 'warn' : 'error',
      `--supergraph`,
      supergraphPath,
      `--config`,
      routerConfigPath,
    ],
    { stdio: 'inherit' },
  );
};
