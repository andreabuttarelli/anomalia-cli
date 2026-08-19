# Integrazioni con app esterne — Nango, Composio e il layer connector

Nota di architettura per il layer che collega un brand alle app esterne: gli account
social su cui Anomalia pubblica, e i tool che l'agente usa per pianificare (CRM,
analytics, knowledge base). Il repo di questa CLI espone la superficie utente
(`anomalia connections`, tool MCP `*_connection*`); l'implementazione del connector sta
nel backend. Questo documento fissa il contratto tra i due.

Riferimento esterno: [`elie222/rakazo`](https://github.com/elie222/rakazo) risolve lo
stesso problema con Composio, ed è la fonte di gran parte dei pattern qui sotto.

---

## 1. Le due classi di integrazione

Non sono la stessa cosa e non vanno decise insieme:

| | **Publishing rails** | **Long tail agentico** |
|---|---|---|
| Cosa | Instagram, TikTok, Facebook, LinkedIn, Threads, YouTube, X | HubSpot, Notion, Slack, Google Analytics, Search Console, Sheets, Drive, Canva, Shopify… |
| A cosa serve | pubblicare, leggere lo storico, raccogliere metriche | dare contesto all'agente (lanci, prodotti, traffico, brand assets) |
| Vincoli | app propria con review (Meta, TikTok, LinkedIn), scope sensibili, upload binari multi-step, rate limit per account, sync incrementale dello storico | breadth: contano *quante* app colleghi e in quanto tempo |
| Volume | alto e continuo | basso e a burst |

## 2. Nango e Composio, sui punti che decidono

| | Nango | Composio |
|---|---|---|
| Setup OAuth | **una tua app per integrazione** in produzione. Le shared developer credentials esistono solo per testare: la doc dice esplicitamente di non usarle in prod (violano i ToS della maggior parte dei provider, rate-limited) | **121 toolkit con managed app** (zero setup), **96 che richiedono credenziali proprie**; il resto del catalogo (1000+) usa API key/bearer dell'utente, dove non c'è nessuna app da registrare |
| Mix per integrazione | — | sì: `authConfigs: { instagram: "ac_…" }`, i toolkit non elencati restano su managed auth |
| Branding consent screen | la tua app, sempre | "Composio wants to access your account"; white-label solo della Connect Link page |
| Scope | tuoi | default sensati, sovrascrivibili anche in managed (`credentials: { scopes: "…" }`) |
| Token raw | disponibili (li tieni tu) | mascherati dall'API (primi 4 caratteri); per chiamate custom si passa da **proxy execute**, vincolato al dominio del toolkit |
| Sync incrementale | **syncs** (ingest continuo di record + webhook) | assente: solo trigger (realtime su alcuni toolkit, polling ≥15 min sulle managed app) |
| Tool schema pronti per l'agente | no (chiami tu le API) | sì, è il prodotto |
| Rate limit piattaforma | self-host o cloud | per organizzazione: 2.000 req/min (Starter/Hobby), 10.000 (Growth) |
| Portabilità in uscita | token esportabili | i connected account restano da loro: uscire = far ri-autorizzare la base utenti |

Piattaforme che ci riguardano, per tipo di auth su Composio:

- **Managed** (zero setup): HubSpot, Salesforce, Pipedrive, Notion, Slack, Airtable, Google
  Sheets/Docs/Drive/Calendar, Google Analytics, Google Search Console, Google Ads, Canva,
  Figma, Mailchimp, Stripe, Reddit, Discord, Instagram, Facebook, LinkedIn, YouTube.
- **App propria richiesta**: TikTok, X/Twitter, Pinterest (+ Ads), Shopify, Klaviyo,
  Webflow, WordPress.com, Meta Ads, LinkedIn Ads.

## 3. Decisione

**Ibrido, con il baricentro su Composio per tutto ciò che non è publishing.**

1. **Long tail → Composio.** È esattamente dove Nango costa lavoro (un'app OAuth per
   integrazione, con review) e Composio lo azzera per le app che ci servono davvero.
   Time-to-integration da settimane a zero, e i tool arrivano già con lo schema pronto
   per l'agente e per il server MCP.
2. **Publishing rails → app nostra.** Qui la nostra app Meta/TikTok/LinkedIn serve in
   ogni caso, quindi il setup OAuth non è più il criterio. Decidono: (a) servono i token
   raw? (b) serve il sync incrementale dello storico post/metriche? (c) quanto pesa il
   costo di uscita? Finché la risposta a (a) o (b) è sì, questo pezzo resta su
   Nango/OAuth nostro. Se diventa no, si sposta su Composio con una **custom auth config**
   per piattaforma, senza toccare il resto.
3. **Il vendor non deve essere visibile fuori dal connector.** CLI, MCP e agente vedono
   solo provider slug e stato della connessione. Nessun token attraversa questo repo.

Criteri per una migrazione completa a Composio (tutti e tre veri):

- nessun flusso di publishing ha bisogno del token in chiaro (proxy execute regge upload
  binari e flussi multi-step in un PoC reale su Instagram e TikTok);
- il sync dello storico è riscritto in casa sopra i trigger, oppure accettiamo latenza ≥15 min;
- accettiamo che uscire da Composio significhi re-consent di tutti gli utenti.

## 4. Forma del connector (backend)

Contratto minimo, sul modello di `packages/adapter-kit/src/interfaces.ts` di rakazo. Il
punto è che la scelta del vendor diventi un flag **per piattaforma**, non un refactor:

```ts
export type ConnectorTool = { name: string; description: string; inputSchema: object };

export interface ConnectorProvider {
  describe(): { id: string; capabilities: { discover: boolean; oauth: boolean } };
  /** Solo i tool delle app effettivamente collegate: il catalogo intero non entra nel context. */
  discoverTools(ctx: ConnectorContext): Promise<ConnectorTool[]>;
  execute(call: ConnectorCall, ctx: ConnectorContext): AsyncIterable<ConnectorEvent>;
}

export interface ConnectionAuthProvider {
  begin(req: { provider: string; redirectUrl: string }, ctx: ConnectorContext):
    Promise<{ authorizationUrl: string | null; state: string }>;
  /** Interroga il provider: il callback OAuth atterra nel browser, non da noi. */
  ready(provider: string, ctx: ConnectorContext): Promise<boolean>;
  revoke(connectionRef: string, ctx: ConnectorContext): Promise<void>;
}
```

Implementazioni: `NangoConnector`, `ComposioConnector`, più un `CompositeConnector` che
instrada per provider (`PUBLISHING_PROVIDERS` → Nango, resto → Composio) e **degrada**:
se il long tail non risponde, i tool di publishing restano disponibili. Per i test, un
`FakeConnector` deterministico con un catalogo finto — in rakazo è
`packages/adapters/src/composio-emulator.ts`, attivo quando manca la API key, e permette
di testare tutto il flusso di connessione offline.

## 5. Contratto API consumato dalla CLI e dall'MCP

Tutti gli endpoint sono brand-scoped e usano la stessa sessione OAuth del resto della CLI.

| Metodo | Path | Risposta |
|---|---|---|
| `GET` | `/api/v1/brands/:slug/connections` | `{ connections: Connection[] }` |
| `GET` | `/api/v1/brands/:slug/connections/catalog?query=` | `{ apps: ConnectionCatalogItem[] }` |
| `POST` | `/api/v1/brands/:slug/connections` — body `{ provider, display_name? }` | `{ connection_id, authorization_url \| null }` |
| `POST` | `/api/v1/brands/:slug/connections/:id/complete` | `{ connection: Connection }` |
| `DELETE` | `/api/v1/brands/:slug/connections/:id` | `{ ok: true }` |

```ts
type Connection = {
  id: string;
  provider: string;                // slug upper-snake: HUBSPOT, GOOGLE_ANALYTICS, …
  display_name: string;
  status: 'pending' | 'connected' | 'revoked' | 'error';
  scopes?: string[] | null;
  connected_at?: string | null;
  created_at?: string | null;
};

type ConnectionCatalogItem = {
  provider: string;
  name: string;
  logo?: string | null;
  connected: boolean;
  managed_auth?: boolean;          // false = richiede una nostra OAuth app
  category?: string | null;
};
```

Regole del contratto:

- `authorization_url` è `null` quando non serve consenso utente (auth già valida, o app
  senza OAuth): il client passa comunque da `complete`.
- `complete` è **idempotente e interrogabile in polling**: legge lo stato reale presso il
  provider e aggiorna la riga. Il client lo chiama ogni 2s finché lo stato non è
  `connected` o `error`.
- Il DB è uno specchio, non la verità: se una riga è `pending`/`error` il backend
  riconcilia con lo stato live del provider prima di rispondere (in rakazo:
  `needsLivePluginSync` / `planLiveConnectionSync` in `packages/adapters/src/composio-connector.ts`).
- Nessun token, nessun `client_secret`, nessun refresh token attraversa questi endpoint.
- Un backend che non implementa ancora queste rotte risponde `404`: la CLI lo tratta come
  "non disponibile" con un messaggio, non come un crash.

## 6. Cosa prendiamo da rakazo

| Pattern | Dove sta in rakazo | Perché ci serve |
|---|---|---|
| Contratto connector a 3 metodi + auth separata | `packages/adapter-kit/src/interfaces.ts` | rende il vendor sostituibile per piattaforma |
| Composite + degrado silenzioso | `CompositeConnector` in `composio-connector.ts` | un vendor giù non deve spegnere il publishing |
| Emulatore deterministico | `composio-emulator.ts` | test end-to-end del flusso di connessione senza rete |
| Catalogo in cache TTL + stale-while-revalidate | `composio-catalog-cache.ts` | la schermata integrazioni apre in ms, non in secondi |
| Sessione di esecuzione filtrata sui toolkit connessi | `sessionForExecute` | l'agente vede solo i tool delle app collegate: meno context, meno errori |
| Riga di prompt con le app collegate | `pluginLine` in `packages/adapters/src/executor.ts` | l'agente sa cosa può usare senza doverlo scoprire |
| Redaction su errori **e** payload | `sanitizeComposioError` / `sanitizePayload` | niente token nei log, nelle risposte MCP o nel context del modello |
| `logId` di ogni chiamata esterna salvato come evento | `collectLogIds` → `effect.recorded` | audit di cosa è stato pubblicato e con quale chiamata |
| Skill del vendor vendorizzata con hash | `.agents/skills/composio/` + `skills-lock.json` | l'agente integra il vendor seguendo la sua doc corrente, versionata |

## 7. Piano

1. **Ora** — superficie utente in questa CLI (`anomalia connections`, tool MCP) e
   contratto API congelato (§5).
2. **Backend** — `ConnectorProvider` + `CompositeConnector`, endpoint `connections/*`,
   riconciliazione, redaction, evento di audit per ogni esecuzione esterna.
3. **Composio sul long tail** — managed auth, partendo da Google Analytics, Search
   Console, HubSpot e Notion; i tool scoperti finiscono nell'MCP server e nell'agente.
4. **Publishing** — resta dov'è. Si rivaluta con i criteri di §3 dopo un PoC di proxy
   execute su Instagram e TikTok.

## 8. Uso (CLI)

```bash
anomalia connections <slug>                        # app collegate
anomalia connections <slug> catalog --query hubspot # app collegabili
anomalia connections <slug> connect HUBSPOT         # apre il browser, poi fa polling
anomalia connections <slug> revoke 3f2a             # accetta un prefisso di id
```

Tool MCP corrispondenti: `list_connections`, `connection_catalog`, `connect_app`,
`complete_connection`, `revoke_connection`. `connect_app` restituisce l'URL di
autorizzazione: l'agente non può autorizzare al posto dell'utente, glielo passa e poi fa
polling con `complete_connection`.

---

### Fonti

- Nango — [configurazione integrazione / OAuth app propria](https://docs.nango.dev/guides/api-authorization/configuration)
- Composio — [managed vs custom auth](https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app), [elenco toolkit con managed auth](https://docs.composio.dev/toolkits/managed-auth), [controllo scope](https://docs.composio.dev/docs/authentication/controlling-scopes), [proxy execute](https://docs.composio.dev/docs/proxy-execute), [trigger](https://docs.composio.dev/docs/triggers), [rate limit](https://docs.composio.dev/reference/rate-limits)
