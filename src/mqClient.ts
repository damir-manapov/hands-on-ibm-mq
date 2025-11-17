import mq from 'ibmmq';
import type { MqConnectionConfig } from './config';

const { MQC } = mq;

function connect(config: MqConnectionConfig): Promise<mq.MQQueueManager> {
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
    }

    mq.Connx(config.queueManager, cno, (err, manager) => {
      if (err || !manager) {
        reject(err ?? new Error('Unknown MQ connection failure'));
        return;
      }
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
  return new Promise((resolve, reject) => {
    const od = new mq.MQOD();
    od.ObjectName = queueName;
    mq.Open(manager, od, openOptions, (err, queue) => {
      if (err || !queue) {
        reject(err ?? new Error(`Unable to open queue ${queueName}`));
        return;
      }
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
  const queue = await openQueue(manager, queueName, openOptions);
  try {
    return await handler(queue);
  } finally {
    await closeQueue(queue);
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
  const md = new mq.MQMD();
  const gmo = new mq.MQGMO();
  gmo.Options = MQC.MQGMO_WAIT | MQC.MQGMO_NO_SYNCPOINT | MQC.MQGMO_FAIL_IF_QUIESCING;
  gmo.WaitInterval = waitIntervalMs;

  return new Promise((resolve, reject) => {
    mq.Get(queue, md, gmo, (err, data) => {
      if (err) {
        if (err.mqrc === MQC.MQRC_NO_MSG_AVAILABLE) {
          resolve(null);
          return;
        }
        reject(err);
        return;
      }
      if (!data) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(data.toString('utf-8')) as T;
        resolve(parsed);
      } catch (parseError) {
        const normalizedError =
          parseError instanceof Error ? parseError : new Error(String(parseError));
        reject(normalizedError);
      }
    });
  });
}
