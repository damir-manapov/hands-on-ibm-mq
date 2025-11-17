declare module 'ibmmq' {
  export const MQC: {
    MQCNO_CLIENT_BINDING: number;
    MQOO_OUTPUT: number;
    MQOO_FAIL_IF_QUIESCING: number;
    MQOO_INPUT_AS_Q_DEF: number;
    MQGMO_NO_SYNCPOINT: number;
    MQGMO_WAIT: number;
    MQGMO_FAIL_IF_QUIESCING: number;
    MQPMO_NO_SYNCPOINT: number;
    MQPMO_FAIL_IF_QUIESCING: number;
    MQFMT_STRING: string;
    MQENC_NATIVE: number;
    MQCC_OK: number;
    MQCC_FAILED: number;
    MQRC_NO_MSG_AVAILABLE: number;
  };

  export class MQCNO {
    Options: number;
    ClientConn?: MQCD;
    SecurityParms?: MQCSP;
  }

  export class MQCD {
    ConnectionName?: string;
    ChannelName?: string;
    SSLCipherSpec?: string;
  }

  export class MQCSP {
    UserId?: string;
    Password?: string;
  }

  export class MQOD {
    ObjectName?: string;
  }

  export class MQMD {
    Format: string;
    Encoding: number;
    CodedCharSetId: number;
  }

  export class MQPMO {
    Options: number;
  }

  export class MQGMO {
    Options: number;
    WaitInterval: number;
  }

  export type MQQueueManager = unknown;
  export type MQObject = unknown;

  export interface MQError extends Error {
    mqcc?: number;
    mqrc?: number;
    message?: string;
  }

  export function Connx(
    queueManager: string,
    cno: MQCNO,
    cb: (err: MQError | null, hConn?: MQQueueManager) => void
  ): void;

  export function Disc(hConn: MQQueueManager, cb: (err?: MQError | null) => void): void;

  export function Open(
    hConn: MQQueueManager,
    od: MQOD,
    openOptions: number,
    cb: (err: MQError | null, hObj?: MQObject) => void
  ): void;

  export function Close(
    hObj: MQObject,
    closeOptions: number,
    cb: (err?: MQError | null) => void
  ): void;

  export function Put(
    hObj: MQObject,
    md: MQMD,
    pmo: MQPMO,
    buffer: Buffer,
    cb: (err?: MQError | null) => void
  ): void;

  export function Get(
    hObj: MQObject,
    md: MQMD,
    gmo: MQGMO,
    cb: (err: MQError | null, buf?: Buffer) => void
  ): void;

  export function SetTuningParameters(params: { syncMQICompat?: number }): void;
}
