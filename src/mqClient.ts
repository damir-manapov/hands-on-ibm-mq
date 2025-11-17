import mq from 'ibmmq';
import type { MqConnectionConfig } from './config';
import { logger } from './utils/logger';

const { MQC } = mq;

function isVerbose(): boolean {
  return process.env['MQ_VERBOSE'] === 'true' || process.env['MQ_VERBOSE'] === '1';
}

function verboseLog(message: string, ...optional: unknown[]): void {
  if (isVerbose()) {
    logger.info(message, ...optional);
  }
}

function connect(config: MqConnectionConfig): Promise<mq.MQQueueManager> {
  verboseLog(
    `connect: Connecting to queue manager ${config.queueManager} via ${config.connectionName}, channel ${config.channel}`
  );
  return new Promise((resolve, reject) => {
    const cno = new mq.MQCNO();
    cno.Options = MQC.MQCNO_CLIENT_BINDING;

    const cd = new mq.MQCD();
    cd.ConnectionName = config.connectionName;
    cd.ChannelName = config.channel;
    if (config.tlsCipherSpec) {
      cd.SSLCipherSpec = config.tlsCipherSpec;
    }
    cno.ClientConn = cd;

    if (config.credentials.username && config.credentials.password) {
      const csp = new mq.MQCSP();
      csp.UserId = config.credentials.username;
      csp.Password = config.credentials.password;
      cno.SecurityParms = csp;
      verboseLog(`connect: Using credentials for user ${config.credentials.username}`);
    }

    verboseLog('connect: Calling mq.Connx...');
    mq.Connx(config.queueManager, cno, (err, manager) => {
      verboseLog(
        `connect: Connx callback invoked, err=${err ? String(err) : 'null'}, manager=${manager ? 'present' : 'null'}`
      );
      if (err || !manager) {
        logger.error(
          'connect: Connection failed',
          err ?? new Error('Unknown MQ connection failure')
        );
        reject(err ?? new Error('Unknown MQ connection failure'));
        return;
      }
      verboseLog('connect: Connection successful');
      resolve(manager);
    });
  });
}

function disconnect(manager: mq.MQQueueManager): Promise<void> {
  return new Promise((resolve, reject) => {
    mq.Disc(manager, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function withQueueManager<T>(
  config: MqConnectionConfig,
  handler: (manager: mq.MQQueueManager) => Promise<T>
): Promise<T> {
  const manager = await connect(config);
  try {
    return await handler(manager);
  } finally {
    await disconnect(manager);
  }
}

function openQueue(
  manager: mq.MQQueueManager,
  queueName: string,
  openOptions: number
): Promise<mq.MQObject> {
  verboseLog(`openQueue: Opening queue ${queueName} with options ${String(openOptions)}`);
  return new Promise((resolve, reject) => {
    const od = new mq.MQOD();
    od.ObjectName = queueName;
    verboseLog('openQueue: Calling mq.Open...');
    mq.Open(manager, od, openOptions, (err, queue) => {
      verboseLog(
        `openQueue: Open callback invoked, err=${err ? String(err) : 'null'}, queue=${queue ? 'present' : 'null'}`
      );
      if (err || !queue) {
        logger.error(
          `openQueue: Failed to open queue ${queueName}`,
          err ?? new Error(`Unable to open queue ${queueName}`)
        );
        reject(err ?? new Error(`Unable to open queue ${queueName}`));
        return;
      }
      verboseLog(`openQueue: Successfully opened queue ${queueName}`);
      resolve(queue);
    });
  });
}

function closeQueue(queue: mq.MQObject): Promise<void> {
  return new Promise((resolve, reject) => {
    mq.Close(queue, 0, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function withQueue<T>(
  manager: mq.MQQueueManager,
  queueName: string,
  openOptions: number,
  handler: (queue: mq.MQObject) => Promise<T>
): Promise<T> {
  verboseLog(`withQueue: Starting queue operation for ${queueName}`);
  const queue = await openQueue(manager, queueName, openOptions);
  try {
    verboseLog(`withQueue: Queue opened, calling handler for ${queueName}`);
    const result = await handler(queue);
    verboseLog(`withQueue: Handler completed for ${queueName}`);
    return result;
  } finally {
    verboseLog(`withQueue: Closing queue ${queueName}`);
    await closeQueue(queue);
    verboseLog(`withQueue: Queue ${queueName} closed`);
  }
}

export async function putJson(queue: mq.MQObject, payload: unknown): Promise<void> {
  const md = new mq.MQMD();
  md.Format = MQC.MQFMT_STRING;
  md.Encoding = MQC.MQENC_NATIVE;
  md.CodedCharSetId = 1208;

  const pmo = new mq.MQPMO();
  pmo.Options = MQC.MQPMO_NO_SYNCPOINT | MQC.MQPMO_FAIL_IF_QUIESCING;

  const buffer = Buffer.from(JSON.stringify(payload), 'utf-8');

  await new Promise<void>((resolve, reject) => {
    mq.Put(queue, md, pmo, buffer, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function getJson<T>(queue: mq.MQObject, waitIntervalMs: number): Promise<T | null> {
  verboseLog(`getJson: Starting message retrieval, waitIntervalMs=${String(waitIntervalMs)}`);
  const md = new mq.MQMD();
  md.Encoding = MQC.MQENC_NATIVE;
  md.CodedCharSetId = MQC.MQCCSI_Q_MGR;
  const gmo = new mq.MQGMO();
  gmo.Options =
    MQC.MQGMO_WAIT | MQC.MQGMO_NO_SYNCPOINT | MQC.MQGMO_FAIL_IF_QUIESCING | MQC.MQGMO_CONVERT;
  gmo.WaitInterval = waitIntervalMs;
  verboseLog(
    `getJson: Options=${String(gmo.Options)} (WAIT | NO_SYNCPOINT | FAIL_IF_QUIESCING | CONVERT), WaitInterval=${String(gmo.WaitInterval)}`
  );

  const buffer = Buffer.alloc(4 * 1024 * 1024);

  return new Promise((resolve, reject) => {
    verboseLog('getJson: Attempting GetSync operation with WAIT');
    try {
      const dataLength = mq.GetSync(queue, md, gmo, buffer);
      verboseLog(
        `getJson: GetSync returned, len=${dataLength !== undefined ? String(dataLength) : 'undefined'}`
      );
      if (dataLength === undefined || dataLength === 0) {
        verboseLog('getJson: No message available, returning null');
        resolve(null);
        return;
      }
      try {
        verboseLog(`getJson: Parsing JSON data (${String(dataLength)} bytes)`);
        const parsed = JSON.parse(buffer.subarray(0, dataLength).toString('utf-8')) as T;
        verboseLog('getJson: Successfully parsed message');
        resolve(parsed);
      } catch (parseError) {
        logger.error('getJson: JSON parse error', parseError);
        const normalizedError =
          parseError instanceof Error ? parseError : new Error(String(parseError));
        reject(normalizedError);
      }
    } catch (syncError) {
      const mqError = syncError as mq.MQError;
      verboseLog(
        `getJson: GetSync threw exception, mqrc=${String(mqError.mqrc ?? 'unknown')}, reason=${mqError.message ?? 'unknown'}`
      );
      if (mqError.mqrc === MQC.MQRC_NO_MSG_AVAILABLE) {
        verboseLog('getJson: No message available after wait, returning null');
        resolve(null);
        return;
      }
      logger.error('getJson: Non-recoverable error, rejecting', syncError);
      const normalizedError = syncError instanceof Error ? syncError : new Error(String(syncError));
      reject(normalizedError);
    }
  });
}
