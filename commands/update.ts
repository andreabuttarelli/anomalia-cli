import { c } from '../lib/display.ts';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

export async function cmdUpdate() {
  console.log(c.bold('\nAggiornamento Anomalia CLI…\n'));

  // Detect current platform
  const platform = process.platform;
  const arch = process.arch;
  let platformName: string;

  if (platform === 'darwin') {
    platformName = arch === 'arm64' ? 'macos-arm64' : 'macos-x64';
  } else if (platform === 'linux') {
    platformName = arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  } else {
    console.error(`Piattaforma non supportata: ${platform}-${arch}`);
    process.exit(1);
  }

  console.log(`  Piattaforma: ${platformName}`);

  // Detect install method:
  // - If .git exists in the CLI directory → source install (dev)
  // - Otherwise → binary install (user who used curl installer or downloaded manually)
  const cliDir = dirname(new URL(import.meta.url).pathname);
  const projectRoot = join(cliDir, '..', '..');
  const gitDir = join(projectRoot, '.git');
  const isSourceInstall = existsSync(gitDir);

  if (isSourceInstall) {
    // Source install — dev mode with git repo
    console.log('  Installazione da sorgente rilevata');
    console.log(`\n  Per aggiornare:`);
    console.log(`  cd ${join(cliDir, '..')}`);
    console.log(`  git pull`);
    console.log(`  bun install\n`);
  } else {
    // Binary install — download from GitHub Releases
    console.log('  Download in corso…');

    // Must match what scripts/build.ts produces and what install.sh downloads: `anomalia-<platform>`.
    const url = `https://github.com/andreabuttarelli/anomalia-cli/releases/latest/download/anomalia-${platformName}`;
    const binPath = process.argv[0];

    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          console.error(`  ✗ Release non trovata per ${platformName}`);
          console.log(`  Scarica manualmente da: https://github.com/andreabuttarelli/anomalia-cli/releases`);
        } else {
          console.error(`  ✗ Errore download: ${res.status}`);
        }
        process.exit(1);
      }

      // Write to temp file next to current binary
      const tempPath = `${binPath}.tmp`;
      const data = await res.arrayBuffer();
      await Bun.write(tempPath, data);

      // Replace current binary
      const { renameSync, chmodSync } = await import('fs');
      chmodSync(tempPath, 0o755);
      renameSync(tempPath, binPath);

      console.log(`\n  ${c.green('✓')} Anomalia CLI aggiornato!`);
      console.log(`  Riavvia la CLI per usare la nuova versione.\n`);
    } catch (e) {
      console.error(`  ✗ Errore: ${String(e)}`);
      console.log(`\n  Aggiorna manualmente:`);
      console.log(`  curl -sSL https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/scripts/install.sh | bash\n`);
      process.exit(1);
    }
  }
}
