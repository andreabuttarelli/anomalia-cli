import ora from 'ora';
import { loadSession } from '../lib/auth.ts';
import { api } from '../lib/api.ts';
import { ok, warn, c, table } from '../lib/display.ts';

export async function cmdAds(
  slug: string,
  opts: {
    propose?: boolean;
    approve?: string;
    reject?: string;
    pause?: string;
    sync?: boolean;
    budget?: string;
    create?: boolean;
    platform?: string;
    name?: string;
    headline?: string;
    body?: string;
    url?: string;
    image?: string;
    goal?: string;
  }
) {
  const session = await loadSession();
  if (!session) {
    console.error('Sessione scaduta o non trovata. Esegui: anomalia login');
    process.exit(1);
  }
  const token = session.access_token;

  if (opts.sync) {
    const spinner = ora('Sync ad accounts + metrics…').start();
    try {
      const r = await api.adsAction(token, slug, { action: 'sync' });
      spinner.stop();
      ok(`Accounts: ${r.accounts ?? 0}, metrics: ${r.metrics ?? 0}`);
    } catch (e) {
      spinner.fail(String(e));
      process.exit(1);
    }
    return;
  }

  if (opts.propose) {
    const spinner = ora('Proposing boosts from top organic posts…').start();
    try {
      const r = await api.adsAction(token, slug, { action: 'propose' });
      spinner.stop();
      ok(`Created ${r.created ?? 0} proposals from ${r.candidates ?? 0} candidates`);
    } catch (e) {
      spinner.fail(String(e));
      process.exit(1);
    }
    return;
  }

  if (opts.approve) {
    const spinner = ora(`Approving campaign ${opts.approve}…`).start();
    try {
      const r = await api.adsAction(token, slug, {
        action: 'approve',
        campaignId: opts.approve,
        budgetAmount: opts.budget ? Number(opts.budget) : undefined,
        goal: opts.goal
      });
      spinner.stop();
      ok(`Live on Zernio: ${r.zernioAdId}`);
    } catch (e) {
      spinner.fail(String(e));
      process.exit(1);
    }
    return;
  }

  if (opts.reject) {
    await api.adsAction(token, slug, { action: 'reject', campaignId: opts.reject });
    ok('Rejected');
    return;
  }

  if (opts.pause) {
    await api.adsAction(token, slug, { action: 'pause', campaignId: opts.pause });
    ok('Paused');
    return;
  }

  if (opts.create) {
    if (!opts.name || !opts.headline) {
      warn('Serve --name e --headline per create');
      process.exit(1);
    }
    const spinner = ora('Creating standalone proposal…').start();
    try {
      const r = await api.adsAction(token, slug, {
        action: 'create',
        platform: opts.platform ?? 'metaads',
        name: opts.name,
        headline: opts.headline,
        body: opts.body,
        landingPageUrl: opts.url,
        imageUrl: opts.image,
        goal: opts.goal ?? 'traffic',
        budgetAmount: opts.budget ? Number(opts.budget) : 25
      });
      spinner.stop();
      ok(`Proposal ${r.id} — approve with: anomalia ads ${slug} --approve ${r.id}`);
    } catch (e) {
      spinner.fail(String(e));
      process.exit(1);
    }
    return;
  }

  // Default: list
  const spinner = ora('Loading ads…').start();
  try {
    const data = await api.getAds(token, slug);
    spinner.stop();
    console.log(`\n${c.bold(slug)} — ads\n`);
    console.log(
      `Spend ${data.summary.totals.spend.toFixed(2)} · Imp ${data.summary.totals.impressions} · Clicks ${data.summary.totals.clicks} · Active ${data.summary.totals.active} · Proposed ${data.summary.totals.proposed}\n`
    );

    if (data.adAccounts?.length) {
      console.log(c.bold('Ad accounts'));
      table(
        ['Platform', 'Name', 'Status'],
        data.adAccounts.map((a) => [a.platform, a.name ?? a.zernio_ad_account_id, a.status])
      );
      console.log('');
    }

    if (data.summary.campaigns.length) {
      console.log(c.bold('Campaigns'));
      table(
        ['ID', 'Status', 'Type', 'Platform', 'Budget', 'Name'],
        data.summary.campaigns.map((c) => [
          c.id.slice(0, 8),
          c.status,
          c.ad_type,
          c.platform,
          `${c.budget_amount}/${c.budget_type}`,
          c.name.slice(0, 40)
        ])
      );
    } else {
      warn('Nessuna campagna. Prova: anomalia ads <slug> --propose');
    }

    if (data.candidates?.length) {
      console.log(`\n${c.bold('Boost candidates')}`);
      table(
        ['Platform', 'Score', 'Reason'],
        data.candidates.slice(0, 8).map((c) => [
          c.platform,
          String(Math.round(c.score)),
          c.reason.slice(0, 50)
        ])
      );
    }
  } catch (e) {
    spinner.fail(String(e));
    process.exit(1);
  }
}
