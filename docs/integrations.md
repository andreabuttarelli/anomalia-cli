# Integrazioni con app esterne — Nango, Composio e il layer connector

Nota di architettura per il layer che collega un brand alle app esterne: gli account
social su cui Anomalia pubblica, e i tool che l'agente usa per pianificare (CRM,
analytics, knowledge base). Il repo di questa CLI espone la superficie utente
(`anomalia connections`, tool MCP `*_connection*`); l'implementazione del connector sta
nel backend. Questo documento fissa il contratto tra i due.

Riferimento esterno: [`elie222/rakazo`](https://github.com/elie222/rakazo) risolve lo
stesso problema con Composio, ed è la fonte di gran parte dei pattern qui sotto.

---

## 1. Dove stava davvero Nango

Verificato sul codice dell'app (`021-app`), non per assunzione:

| Superficie | Broker | Note |
|---|---|---|
| **Publishing social** (Instagram, TikTok, Facebook, LinkedIn, X, …) | **Zernio** | `social_accounts.zernio_account_id`, `src/lib/server/publish.ts`. Nango non l'ha mai toccato. |
| **Knowledge connectors** (Drive, Notion, GitHub, Gmail → corpus del brand) | **Nango → Composio** | ingest in `brand_documents`, letture live in chat |
| **Integrazioni agentiche** (Supabase, Canva, e qualunque altro toolkit) | **Nango → Composio** | tool che la chat può chiamare |

Quindi la domanda "Composio al posto di Nango" riguardava **solo il long tail**: esattamente il
caso in cui Composio vince. Il rischio che avevo sollevato sulle publishing rails (token raw,
upload multi-step, sync incrementale) non si applica: quel pezzo è di Zernio e resta dov'è.

## 2. Nango e Composio, sui punti che decidono

| | Nango | Composio |
|---|---|---|
| Setup OAuth | **una tua app per integrazione** in produzione. Le shared developer credentials esistono solo per testare: la doc dice esplicitamente di non usarle in prod (violano i ToS della maggior parte dei provider, rate-limited) | **121 toolkit con managed app** (zero setup), **96 che richiedono credenziali proprie**; il resto del catalogo (1000+) usa API key/bearer dell'utente, dove non c'è nessuna app da registrare |
| Mix per integrazione | — | sì: una custom auth config per toolkit, gli altri restano su managed auth |
| Branding consent screen | la tua app, sempre | "Composio wants to access your account"; white-label solo della Connect Link page |
| Scope | tuoi | default sensati, sovrascrivibili anche in managed |
| Token raw | disponibili (li tieni tu) | mascherati dall'API; per chiamate custom si passa da **proxy execute**, vincolato al dominio del toolkit |
| Sync incrementale | **syncs** | assente: solo trigger (polling ≥15 min sulle managed app). Irrilevante qui: l'ingest del corpus è un worker nostro (`/api/v1/knowledge/sources/work`) |
| Tool schema pronti per l'agente | no | sì, è il prodotto |
| Rate limit piattaforma | self-host o cloud | per organizzazione: 2.000 req/min (Starter/Hobby), 10.000 (Growth) |
| Portabilità in uscita | token esportabili | i connected account restano da loro: uscire = far ri-autorizzare la base utenti |

Piattaforme rilevanti, per tipo di auth su Composio:

- **Managed** (zero setup): Google Drive, Gmail, Notion, GitHub, HubSpot, Salesforce, Pipedrive,
  Slack, Airtable, Google Sheets/Docs/Calendar, Google Analytics, Google Search Console, Google
  Ads, Canva, Figma, Mailchimp, Stripe, Reddit, Discord, Instagram, Facebook, LinkedIn, YouTube.
- **App propria richiesta**: TikTok, X/Twitter, Pinterest (+ Ads), Shopify, Klaviyo, Webflow,
  WordPress.com, Meta Ads, LinkedIn Ads.

## 3. Decisione (implementata)

**Composio sostituisce Nango su tutti i connettori.** Il publishing resta su Zernio.

Motivo: in produzione Nango chiedeva una nostra OAuth app *per ogni* integrazione — settimane di
developer portal e review prima di vedere un token. Con Composio aggiungere un'integrazione è una
riga di registro. Quando un toolkit ha bisogno del nostro branding, dei nostri scope o della
nostra quota, si crea una custom auth config nella dashboard Composio: il codice preferisce
automaticamente una config custom a quella managed, senza modifiche.

Cosa questo costa, detto esplicitamente:

- **I token non li vediamo più.** Tutte le chiamate ai provider passano dal proxy Composio, che
  inietta le credenziali server-side. L'ingest e le letture live in chat funzionano identiche.
- **Il Google Picker non funziona più.** Ha bisogno di un access token OAuth nel browser, che
  Composio non consegna: l'endpoint risponde `picker_unavailable` e lo scope Drive si sceglie
  dalla lista di cartelle servita dal server.
- **Le connessioni esistenti vanno rifatte.** Un connection id Nango non significa nulla per
  Composio: la migrazione marca le righe come da ricollegare, preservando righe, scope settings e
  documenti già ingeriti.
- **Costo di uscita.** Uscire da Composio significa far ri-autorizzare gli utenti.

## 4. Forma del connector (backend, `021-app`)

Moduli, con la loro responsabilità:

| Modulo | Cosa fa |
|---|---|
| `src/lib/server/composio.ts` | client REST v3.1: toolkit, auth config, Connect Link, connected account, tool, proxy. Redazione delle chiavi su errori e payload; nessuna funzione qui può restituire un token |
| `src/lib/composio-catalog.ts` (+ `server/`) | catalogo e registro: `app_integration_registry` decide cosa vede un brand, `brand_app_connections` è lo specchio di Composio, riconciliato a ogni lettura |
| `src/lib/server/composio-agent.ts` | tool per l'agente: `list_integrations_tools` / `call_integrations_tools`, su toolkit slug e tool slug, con `query` per cercare dentro un toolkit grande invece di riversarlo nel context |
| `knowledge-connectors/provider-fetch.ts` | `ProviderAuth = { connectedAccountId, toolkit }` al posto del token: ogni chiamata al provider passa dal proxy |

Il flusso di connessione, che è la parte che si sbaglia più facilmente:

```
POST /connections  →  ensureAuthConfig(toolkit)   // managed, o la nostra custom config
                   →  createConnectLink()          // Connect Link ospitata da Composio
                   →  riga `pending` nel DB        // ← è questa che si interroga
       utente autorizza nel browser (il callback NON torna da noi)
POST /connections/:id/complete  →  Composio dice ACTIVE?  →  riga `active` + primo sync
```

Da rakazo (`packages/adapters/src/composio-connector.ts`) vengono: la sessione filtrata sui
toolkit connessi, il polling di `connectionReady` invece dell'inseguimento del callback, la
riconciliazione DB↔provider e la redaction su errori *e* payload.

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

Già in `021-app` dopo questa migrazione: contratto e composite (nella forma di §4), sessione
filtrata sui toolkit connessi, riga di prompt con le app collegate, redaction, riconciliazione.
Ancora aperti: **emulatore deterministico** per i test offline, **cache TTL del catalogo** (oggi
ogni apertura della pagina interroga Composio) e **audit dei `logId`** di ogni chiamata esterna.

## 7. Stato

Fatto (branch `claude/rakazo-composio-nango-7xyfom` su entrambi i repo):

- **CLI + MCP** — `anomalia connections list|catalog|connect|revoke` e i cinque tool MCP.
- **App** — client REST Composio, catalogo + registro, riconciliazione delle righe, agente
  (`list_integrations_tools` / `call_integrations_tools` su toolkit e tool slug), ingest del
  corpus via proxy, endpoint `/api/v1/brands/:slug/connections*`, migrazione `0190`.

Da fare al deploy:

1. `COMPOSIO_API_KEY` in ambiente (senza, i connettori rispondono 503 e il resto dell'app gira).
2. Applicare la migrazione `0190_composio_connections.sql`.
3. Rivedere `app_integration_registry`: quali toolkit sono visibili ai brand e con che `kind`.
4. Avvisare i brand con connettori attivi: devono ricollegare (una volta).
5. Opzionale — custom auth config in Composio per i toolkit dove vogliamo il nostro consent
   screen (tipicamente Google Drive e Gmail).

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
