import { loadSession } from '../lib/auth.ts';
import { api } from '../lib/api.ts';
import { c } from '../lib/display.ts';

export async function cmdAi(slug: string, opts: { message?: string; pipe?: boolean }) {
  const session = await loadSession();
  if (!session) { console.error('Sessione scaduta o non trovata. Esegui: anomalia login'); process.exit(1); }

  let message = opts.message;

  // Read from stdin if piped
  if (!message && !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    message = Buffer.concat(chunks).toString('utf8').trim();
  }

  if (!message) {
    console.error('Specifica un messaggio con --message "..." o pipe da stdin');
    console.error('');
    console.error('Esempi:');
    console.error(`  anomalia ai ${slug} --message "Analizza i miei ultimi post"`);
    console.error(`  echo "Cambia il tone a friendly" | anomalia ai ${slug}`);
    console.error(`  anomalia ai ${slug} --message "Aggiungi competitor Notion"`);
    process.exit(1);
  }

  try {
    const response = await api.chat(session.access_token, slug, message);
    // In pipe mode, output raw text (for AI agents)
    if (opts.pipe || !process.stdout.isTTY) {
      process.stdout.write(response);
    } else {
      console.log(response);
    }
  } catch (e) {
    console.error(`Errore: ${String(e)}`);
    process.exit(1);
  }
}
