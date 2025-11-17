export const logger = {
  info(message: string, ...optional: unknown[]): void {
    console.log(`[info] ${message}`, ...optional);
  },
  warn(message: string, ...optional: unknown[]): void {
    console.warn(`[warn] ${message}`, ...optional);
  },
  error(message: string, ...optional: unknown[]): void {
    console.error(`[error] ${message}`, ...optional);
  }
};
