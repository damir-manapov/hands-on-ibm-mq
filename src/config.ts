export type Credentials = Readonly<{
  username?: string;
  password?: string;
}>;

export interface MqConnectionConfig {
  readonly queueManager: string;
  readonly channel: string;
  readonly connectionName: string;
  readonly inputQueue: string;
  readonly outputQueue: string;
  readonly credentials: Credentials;
  readonly waitIntervalMs: number;
  readonly tlsCipherSpec?: string;
}

const requiredEnv = ['MQ_HOST', 'MQ_PORT', 'MQ_CHANNEL', 'MQ_QMGR'] as const;

function readEnv(key: string): string | undefined {
  return process.env[key];
}

function ensureRequiredEnv(): void {
  const missing = requiredEnv.filter((key) => !readEnv(key));
  if (missing.length > 0) {
    throw new Error(`Missing required IBM MQ environment variables: ${missing.join(', ')}`);
  }
}

function toConnectionName(host: string, port: number): string {
  return `${host}(${String(port)})`;
}

export function loadMqConfig(): MqConnectionConfig {
  ensureRequiredEnv();

  const host = readEnv('MQ_HOST') ?? 'localhost';
  const port = Number.parseInt(readEnv('MQ_PORT') ?? '1414', 10);
  if (Number.isNaN(port)) {
    throw new Error('MQ_PORT must be a valid integer');
  }

  const username = readEnv('MQ_USER');
  const password = readEnv('MQ_PASSWORD');
  const tlsCipherSpec = readEnv('MQ_TLS_CIPHER_SPEC');

  const baseConfig: MqConnectionConfig = {
    queueManager: readEnv('MQ_QMGR') ?? 'QM1',
    channel: readEnv('MQ_CHANNEL') ?? 'DEV.APP.SVRCONN',
    connectionName: toConnectionName(host, port),
    inputQueue: readEnv('MQ_INPUT_QUEUE') ?? 'DEV.QUEUE.1',
    outputQueue: readEnv('MQ_OUTPUT_QUEUE') ?? 'DEV.QUEUE.2',
    credentials: {
      ...(username ? { username } : {}),
      ...(password ? { password } : {})
    },
    waitIntervalMs: Number.parseInt(readEnv('MQ_WAIT_INTERVAL_MS') ?? '5000', 10)
  };

  return tlsCipherSpec && tlsCipherSpec.length > 0
    ? {
        ...baseConfig,
        tlsCipherSpec
      }
    : baseConfig;
}
