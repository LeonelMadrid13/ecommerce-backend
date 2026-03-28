export const ORDER_JOBS = {
  PROCESS: 'process-order',
} as const;

export type ProcessOrderPayload = {
  orderId: string;
};
