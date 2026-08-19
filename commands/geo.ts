import { requireSession } from '../lib/auth.ts';
import { api } from '../lib/api.ts';
import { section, table, c, info, ok, fail, formatDate } from '../lib/display.ts';

export async function cmdGeo(slug: string, opts: { action: string }) {
  const { access_token: t } = await requireSession();

  if (opts.action === 'run' || opts.action === 'fix') {
    const action = opts.action === 'run' ? 'audit' : 'fix';
    info(action === 'audit' ? 'Probe di citazione in corso (può richiedere 1-2 min)…' : 'Generazione fix in corso…');
    const res = await api.geoAction(t, slug, action);
    if (action !== 'audit') { ok(`${res.generated} artifact generati`); return; }
    // Citability first: it is the number that answers "will a model cite us". `techScore` answers
    // "can a crawler reach us" and is 10% of it.
    ok(
      `Audit completato — citabilità ${res.citabilityScore ?? '—'}/100, nominati nel ${Math.round(res.shareOfVoice ?? 0)}% delle risposte, dominio citato nel ${Math.round(res.domainCitedShare ?? 0)}%`
    );
    if (res.bindingConstraint) info(`Vincolo che sta limitando la citazione: ${res.bindingConstraint}`);
    return;
  }
  if (opts.action !== 'show') { fail(`Azione sconosciuta: ${opts.action} (show, run, fix)`); process.exit(1); }

  const data = await api.getGeo(t, slug);

  section('GEO — visibilità AI');
  if (!data.audit) { info(`Nessun audit. Lancia: anomalia geo ${slug} run\n`); return; }

  const cit = data.citability;
  if (cit) {
    const tier = cit.tier === 'provisional' ? c.yellow(' (provvisorio)') : cit.tier === 'ungraded' ? c.dim(' (non assegnabile)') : '';
    console.log(`  Citabilità:     ${c.bold(cit.score === null ? '—' : `${cit.score}/100`)}${tier} ${c.dim(`su ${cit.coverage}% delle leve`)}`);
  }
  // "Nominati" and "dominio citato" are two different events with two different fixes: being named
  // is won on third-party sources, being cited on your own page.
  console.log(`  Nominati:       ${c.bold(`${Math.round(data.audit.share_of_voice ?? 0)}%`)} ${c.dim('delle risposte')}`);
  if (cit) console.log(`  Dominio citato: ${c.bold(`${Math.round(cit.domainCitedShare)}%`)} ${c.dim('delle risposte (evento diverso dall\'essere nominati)')}`);
  console.log(`  Tech score:     ${c.bold(String(data.audit.tech_score ?? '—'))}/100 ${c.dim('(solo accesso macchina — il 10% della citabilità)')}`);
  console.log(`  Ultimo run:     ${formatDate(data.audit.created_at)}${cit?.samplesPerPrompt ? c.dim(` · ${cit.samplesPerPrompt} campioni per domanda`) : ''}`);

  if (cit) {
    if (cit.bindingConstraint) {
      section('Vincolo vincolante');
      console.log(`  ${c.bold(cit.bindingConstraint.label)} — ${cit.bindingConstraint.why}\n`);
    }

    section('Le cinque leve');
    table(
      ['leva', 'peso', 'punteggio', 'lettura'],
      cit.levers.map((l) => [
        l.label,
        `${l.weight}%`,
        l.value === null ? c.dim('non misurata') : `${Math.round(l.value * 100)}/100`,
        String(l.note ?? '—').slice(0, 70)
      ])
    );

    if (cit.antiSignals.length) {
      section('Segnali anti-citazione');
      info('Squalificanti: rimuoverne uno costa quasi sempre meno che aggiungere qualcosa.');
      for (const a of cit.antiSignals) console.log(`  ${c.dim('·')} ${a.note}\n    ${c.cyan('→')} ${a.fix}`);
      console.log();
    }

    if (cit.priorities.length) {
      section('Da fare, in ordine');
      cit.priorities.slice(0, 5).forEach((p, i) => console.log(`  ${c.bold(String(i + 1))}. ${p}`));
      console.log();
    }

    if (cit.gaps) console.log(`${c.dim(cit.gaps)}\n`);
  }

  if (data.trend.length > 1) {
    const spark = data.trend.map((p) => '▁▂▃▄▅▆▇█'[Math.min(7, Math.round(((p.shareOfVoice ?? 0) * 100) / 14))]).join('');
    console.log(`  Trend SoV:      ${c.cyan(spark)}`);
  }

  const cits = data.audit.citations ?? [];
  if (cits.length) {
    section('Citazioni per prompt');
    table(
      ['prompt', 'superficie', 'citato'],
      cits.slice(0, 20).map((x) => [
        String(x.prompt ?? '—').slice(0, 52),
        x.surface ?? '—',
        x.cited ? c.green('✓') : x.mentioned ? c.yellow('~') : c.dim('✗')
      ])
    );
  }

  if (data.artifacts.length) {
    section(`Fix pronti (${data.artifacts.length})`);
    for (const a of data.artifacts.slice(0, 10)) {
      console.log(`  ${c.dim('·')} ${a.title} ${c.dim(`[${a.kind}${a.target_path ? ` → ${a.target_path}` : ''}]`)}`);
    }
  } else {
    info(`\nNessun fix generato. Lancia: anomalia geo ${slug} fix`);
  }
  // No engine publishes its citation criteria. Say so every time, not once.
  if (data.citability?.disclaimer) console.log(c.dim(`\n${data.citability.disclaimer}`));
  console.log();
}
