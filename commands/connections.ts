import { loadSession } from '../lib/auth.ts';
import { api, type Connection, type ConnectionCatalogItem } from '../lib/api.ts';
import { c, fail, formatDate, info, ok, section, table, warn } from '../lib/display.ts';
import { filterCatalog, isConnectionsApiMissing, normalizeProvider } from '../lib/connections.ts';
import { resolveByPrefix } from '../lib/select.ts';

type Opts = { query?: string; timeout?: number };

const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_S = 120;

export async function cmdConnections(
  slug: string,
  action: string,
  target: string | undefined,
  opts: Opts,
) {
  const session = await loadSession();
  if (!session) {
    console.error('Sessione scaduta o non trovata. Esegui: anomalia login');
    process.exit(1);
  }
  const token = session.access_token;

  try {
    switch (action) {
      case 'list':
        return await listConnections(token, slug);
      case 'catalog':
        return await showCatalog(token, slug, opts.query);
      case 'connect':
        if (!target) return usage('Specifica l\'app da collegare: anomalia connections <slug> connect <app>');
        return await connectApp(token, slug, target, opts.timeout ?? DEFAULT_TIMEOUT_S);
      case 'revoke':
        if (!target) return usage('Specifica la connessione da revocare: anomalia connections <slug> revoke <id>');
        return await revokeConnection(token, slug, target);
      default:
        return usage(`Azione sconosciuta: ${action}`);
    }
  } catch (e) {
    // The endpoints ship with the backend: an older API answers 404, and that is a
    // "not available yet" for the user, not a stack trace.
    if (isConnectionsApiMissing(e)) {
      warn('Le API connections non sono disponibili su questo backend.');
      info('Richiede /api/v1/brands/:slug/connections* — vedi docs/integrations.md.');
      process.exit(1);
    }
    throw e;
  }
}

function usage(message: string) {
  console.error(message);
  console.log(`
  ${c.green('list')}                 App collegate al brand (default)
  ${c.green('catalog')} [--query x]  App collegabili
  ${c.green('connect')} <app>        Collega un'app (apre il browser se serve OAuth)
  ${c.green('revoke')} <id>          Revoca una connessione (accetta un prefisso di id)
`);
  process.exit(1);
}

function connectionBadge(status: Connection['status']): string {
  const map: Record<Connection['status'], string> = {
    connected: c.green('connected'),
    pending: c.yellow('pending'),
    error: c.red('error'),
    revoked: c.dim('revoked'),
  };
  return map[status] ?? c.dim(status);
}

async function listConnections(token: string, slug: string) {
  const { connections } = await api.listConnections(token, slug);
  section(`App collegate (${connections.length})`);
  if (!connections.length) {
    info(`Nessuna app collegata. Usa \`anomalia connections ${slug} catalog\` per vedere quelle disponibili.`);
    return;
  }
  table(
    ['Id', 'App', 'Stato', 'Collegata il'],
    connections.map((conn) => [
      conn.id.slice(0, 8),
      `${conn.display_name} ${c.dim(`(${conn.provider})`)}`,
      connectionBadge(conn.status),
      formatDate(conn.connected_at ?? conn.created_at),
    ]),
  );
  const broken = connections.filter((conn) => conn.status === 'error');
  if (broken.length) {
    console.log();
    warn(`${broken.length} connessione/i in errore: ricollegale con \`anomalia connections ${slug} connect <app>\`.`);
  }
  console.log();
}

const CATALOG_ROWS = 30;

async function showCatalog(token: string, slug: string, query?: string) {
  const { apps } = await api.connectionCatalog(token, slug, query);
  // The API already filters when `query` is set; re-filtering client-side keeps the
  // output correct against a backend that ignores the parameter.
  const matching = query ? filterCatalog(apps, query) : apps;
  // Composio carries 1000+ toolkits: a bare `catalog` must not print a thousand-row table.
  const visible = matching.slice(0, CATALOG_ROWS);
  section(`Catalogo app (${matching.length}${matching.length !== apps.length ? ` di ${apps.length}` : ''})`);
  if (!visible.length) {
    info(query ? `Nessuna app per "${query}".` : 'Catalogo vuoto.');
    return;
  }
  table(
    ['App', 'Slug', 'Auth', 'Stato'],
    visible.map((app: ConnectionCatalogItem) => [
      app.name,
      c.dim(app.provider),
      app.managed_auth === false ? c.dim('app propria') : c.dim('gestita'),
      app.connected ? c.green('✓ collegata') : c.dim('—'),
    ]),
  );
  if (matching.length > visible.length) {
    console.log(
      `\n  ${c.dim(`Mostrate ${visible.length} di ${matching.length}. Restringi con --query <testo>.`)}`,
    );
  }
  console.log(`\n  ${c.dim(`Collega con: anomalia connections ${slug} connect <slug>`)}\n`);
}

async function connectApp(token: string, slug: string, provider: string, timeoutSeconds: number) {
  const app = normalizeProvider(provider);
  const started = await api.beginConnection(token, slug, app);

  if (started.authorization_url) {
    console.log(`  Autorizza ${c.bold(app)} nel browser…`);
    console.log(`  ${c.dim(started.authorization_url)}\n`);
    const { default: open } = await import('open');
    await open(started.authorization_url).catch(() => {
      info('Non sono riuscito ad aprire il browser: apri il link qui sopra manualmente.');
    });
  }

  const connection = await waitForConnection(token, slug, started.connection_id, timeoutSeconds);
  if (!connection) {
    warn(`Autorizzazione non completata entro ${timeoutSeconds}s.`);
    info(`Riprova, oppure controlla lo stato con \`anomalia connections ${slug} list\`.`);
    process.exit(1);
  }
  if (connection.status === 'error') {
    fail(`Collegamento di ${app} fallito.`);
    process.exit(1);
  }
  ok(`${connection.display_name} collegata.`);
}

/**
 * The OAuth callback lands in the browser, not in the CLI, so the connection state is
 * pulled from the provider instead of pushed to us — same reason rakazo polls
 * `connectionReady` instead of chasing the redirect.
 */
async function waitForConnection(
  token: string,
  slug: string,
  connectionId: string,
  timeoutSeconds: number,
): Promise<Connection | null> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let last: Connection | null = null;
  while (Date.now() < deadline) {
    const { connection } = await api.completeConnection(token, slug, connectionId);
    last = connection;
    if (connection.status === 'connected' || connection.status === 'error') return connection;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return last?.status === 'connected' ? last : null;
}

async function revokeConnection(token: string, slug: string, idOrPrefix: string) {
  const { connections } = await api.listConnections(token, slug);
  const match = resolveByPrefix(connections, idOrPrefix);
  if (!match.ok) {
    if (match.reason === 'ambiguous') {
      fail(`Prefisso "${idOrPrefix}" ambiguo (${match.count} connessioni). Usa un prefisso più lungo.`);
    } else {
      fail(`Nessuna connessione per "${idOrPrefix}". Elenco: anomalia connections ${slug} list`);
    }
    process.exit(1);
  }
  await api.revokeConnection(token, slug, match.item.id);
  ok(`${match.item.display_name} revocata.`);
}
