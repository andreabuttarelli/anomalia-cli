import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api } from '../../lib/api.ts';
import { resolveArticleId, withAuth } from '../util.ts';

const slug = z.string().min(1).describe('Brand URL slug');

export function registerWebTools(server: McpServer) {
  server.registerTool(
    'get_seo',
    {
      title: 'SEO overview',
      description: 'Tech score, search performance, SEO grade and initiatives.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => withAuth((token) => api.getSeo(token, slug)),
  );

  server.registerTool(
    'seo_action',
    {
      title: 'SEO action',
      description:
        'Run SEO actions: run (tech audit), plan, more (append initiatives), asset, article. For asset/article pass initiativeId.',
      inputSchema: z.object({
        slug,
        action: z.enum(['run', 'plan', 'more', 'asset', 'article']),
        initiativeId: z.string().optional(),
        guidance: z.string().optional().describe('Optional guidance when action=more'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug, action, initiativeId, guidance }) =>
      withAuth((token) => api.seoAction(token, slug, { action, initiativeId, guidance })),
  );

  server.registerTool(
    'get_geo',
    {
      title: 'GEO overview',
      description:
        'AI visibility. Returns `citability` (the five weighted levers — extractability 25%, evidence 25%, entity 20%, corroboration 20%, machine access 10% — with its coverage, the BINDING CONSTRAINT that is actually limiting citation, anti-citation disqualifiers, and ranked fixes), plus citations and ready artifacts. Read `citability.score` and NOT `audit.tech_score` when asked whether a model will cite the brand: tech_score only answers whether a crawler can reach the site and is 10% of the answer. `audit.share_of_voice` (named in the answer) and `citability.domainCitedShare` (own domain cited as a source) are two different events with different fixes. A `citability.score` of null means coverage was too thin to grade — report that, do not substitute tech_score.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => withAuth((token) => api.getGeo(token, slug)),
  );

  server.registerTool(
    'geo_action',
    {
      title: 'GEO action',
      description:
        'Run a GEO citation audit or generate fix artifacts. The audit asks every question several times per engine because citation is non-deterministic — a single observation is noise — so it is slow (1-2 min) and should not be re-run to "check" a result. Returns citabilityScore, shareOfVoice, domainCitedShare and the binding constraint.',
      inputSchema: z.object({
        slug,
        action: z.enum(['audit', 'fix']),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug, action }) => withAuth((token) => api.geoAction(token, slug, action)),
  );

  server.registerTool(
    'get_keywords',
    {
      title: 'Keywords',
      description: 'Keyword strategy: volume, difficulty, opportunity, action.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => withAuth((token) => api.getKeywords(token, slug)),
  );

  server.registerTool(
    'refresh_keywords',
    {
      title: 'Refresh keywords',
      description: 'Regenerate keyword research for the brand.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug }) => withAuth((token) => api.refreshKeywords(token, slug)),
  );

  server.registerTool(
    'list_articles',
    {
      title: 'List blog articles',
      description: 'List web/blog articles. status: draft, scheduled, published, or all.',
      inputSchema: z.object({
        slug,
        status: z.enum(['draft', 'scheduled', 'published', 'all']).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug, status }) => withAuth((token) => api.getWeb(token, slug, status)),
  );

  server.registerTool(
    'generate_article',
    {
      title: 'Generate article',
      description: 'Generate a blog article draft from a topic.',
      inputSchema: z.object({
        slug,
        topic: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug, topic }) =>
      withAuth((token) => api.webAction(token, slug, { action: 'generate', topic })),
  );

  server.registerTool(
    'optimize_article',
    {
      title: 'Optimize article',
      description: 'Rewrite an article for SEO (meta title/description included). id accepts a short prefix.',
      inputSchema: z.object({
        slug,
        id: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug, id }) =>
      withAuth(async (token) => {
        const articleId = await resolveArticleId(token, slug, id);
        return {
          id: articleId,
          ...(await api.webAction(token, slug, { action: 'optimize', id: articleId })),
        };
      }),
  );

  server.registerTool(
    'publish_article',
    {
      title: 'Publish article',
      description: 'Publish a blog article. id accepts a short prefix.',
      inputSchema: z.object({
        slug,
        id: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ slug, id }) =>
      withAuth(async (token) => {
        const articleId = await resolveArticleId(token, slug, id);
        return {
          id: articleId,
          ...(await api.webAction(token, slug, { action: 'publish', id: articleId })),
        };
      }),
  );

  server.registerTool(
    'unpublish_article',
    {
      title: 'Unpublish article',
      description: 'Unpublish a blog article. id accepts a short prefix.',
      inputSchema: z.object({
        slug,
        id: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ slug, id }) =>
      withAuth(async (token) => {
        const articleId = await resolveArticleId(token, slug, id);
        return {
          id: articleId,
          ...(await api.webAction(token, slug, { action: 'unpublish', id: articleId })),
        };
      }),
  );

  server.registerTool(
    'delete_article',
    {
      title: 'Delete article',
      description: 'Delete a blog article. id accepts a short prefix.',
      inputSchema: z.object({
        slug,
        id: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ slug, id }) =>
      withAuth(async (token) => {
        const articleId = await resolveArticleId(token, slug, id);
        return {
          id: articleId,
          ...(await api.webAction(token, slug, { action: 'delete', id: articleId })),
        };
      }),
  );

  server.registerTool(
    'get_ads',
    {
      title: 'Ads overview',
      description:
        'Ad campaigns summary, boost candidates and connected ad accounts. Each campaign carries `fatigue`: WHY its numbers moved, read from the joint pattern of CTR/CPM/CVR/frequency — creative_fatigue, audience_exhaustion, auction_pressure, post_click, message_match, tracking_failure, bad_concept, learning_reset, insufficient_data or healthy. These call for OPPOSITE actions: never recommend new creative without reading it first, and when it says tracking_failure say so before anything else. `fatigue.wouldChangeMyMind` states what would overturn the read.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => withAuth((token) => api.getAds(token, slug)),
  );

  server.registerTool(
    'ads_action',
    {
      title: 'Ads action',
      description:
        'Run an ads action. Common actions: sync, propose, create, reject, pause, resume, toggle, duplicate, delete. Pass campaignId; for a single creative add adId (and next active|paused for toggle). duplicate creates a paused copy as a new proposal; approve it to launch. Pass extra fields as needed.',
      inputSchema: z.object({
        slug,
        action: z.string().min(1),
        campaignId: z.string().optional(),
        extra: z.record(z.string(), z.unknown()).optional().describe('Additional action payload fields'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ slug, action, campaignId, extra }) =>
      withAuth((token) =>
        api.adsAction(token, slug, { action, campaignId, ...(extra ?? {}) }),
      ),
  );

  server.registerTool(
    'ads_remix',
    {
      title: 'Ads remix',
      description:
        'Harvest competitor/trending ads, analyze with vision, and return ranked remix briefs in brand voice (hook, headline, body, CTA, product, strategy, visualPrompt). Replaces previous briefs. Costs credits.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug }) => withAuth((token) => api.adsRemix(token, slug)),
  );

  server.registerTool(
    'chat',
    {
      title: 'Anomalia AI chat',
      description:
        'Natural-language assistant with full read/write access to the brand (same as the web chatbot / `anomalia ai`). Prefer specific tools for deterministic ops; use chat for multi-step or exploratory work.',
      inputSchema: z.object({
        slug,
        message: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ slug, message }) =>
      withAuth(async (token) => {
        const reply = await api.chat(token, slug, message);
        return { reply };
      }),
  );
}
