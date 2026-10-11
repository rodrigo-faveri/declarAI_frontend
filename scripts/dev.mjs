import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const servicesOnly = process.argv.includes("--services-only");
const autoStartAuthentik = process.env.AUTHENTIK_AUTO_START !== "false";
const defaultComposeFile = isWindows
  ? "C:\\authentik\\compose.yml"
  : join(homedir(), "authentik", "compose.yml");
const composeFile = process.env.AUTHENTIK_COMPOSE_FILE || defaultComposeFile;
const healthUrl =
  process.env.AUTHENTIK_HEALTH_URL || "http://localhost:9000/-/health/live/";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

function dockerIsReady() {
  const result = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    stdio: "ignore",
    shell: false,
  });
  return result.status === 0;
}

function startDockerDesktop() {
  if (!isWindows) return false;

  const dockerDesktop = join(
    process.env.ProgramFiles || "C:\\Program Files",
    "Docker",
    "Docker",
    "Docker Desktop.exe"
  );

  if (!existsSync(dockerDesktop)) return false;

  console.log("[dev] Docker não está ativo. Iniciando Docker Desktop...");
  const child = spawn(dockerDesktop, [], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return true;
}

async function waitFor(check, { attempts, intervalMs, message }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await check()) return true;
    if (attempt === 1) console.log(message);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

async function authentikIsHealthy() {
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(3_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startAuthentik() {
  if (!autoStartAuthentik) {
    console.log("[dev] Inicialização automática do Authentik desativada.");
    return;
  }

  if (!existsSync(composeFile)) {
    throw new Error(
      `Compose do Authentik não encontrado em ${composeFile}. ` +
        "Defina AUTHENTIK_COMPOSE_FILE ou use AUTHENTIK_AUTO_START=false."
    );
  }

  if (!dockerIsReady()) {
    const started = startDockerDesktop();
    if (!started) {
      throw new Error(
        "Docker não está disponível. Inicie-o manualmente ou use AUTHENTIK_AUTO_START=false."
      );
    }

    const ready = await waitFor(dockerIsReady, {
      attempts: 60,
      intervalMs: 2_000,
      message: "[dev] Aguardando o Docker ficar disponível...",
    });

    if (!ready) {
      throw new Error("Docker não ficou disponível dentro de 120 segundos.");
    }
  }

  console.log(`[dev] Subindo Authentik com ${composeFile}...`);
  const compose = run("docker", ["compose", "-f", composeFile, "up", "-d"]);
  if (compose.status !== 0) {
    throw new Error("Não foi possível iniciar os containers do Authentik.");
  }

  const healthy = await waitFor(authentikIsHealthy, {
    attempts: 30,
    intervalMs: 2_000,
    message: `[dev] Aguardando o Authentik responder em ${healthUrl}...`,
  });

  if (!healthy) {
    throw new Error("O Authentik iniciou, mas o healthcheck não ficou saudável em 60 segundos.");
  }

  console.log("[dev] Authentik está saudável.");
}

function startNext() {
  console.log("[dev] Iniciando Next.js...");
  const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev"], { stdio: "inherit" });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}

try {
  await startAuthentik();
  if (!servicesOnly) startNext();
} catch (error) {
  console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
