export const baseField = 'h-11 w-full min-w-0 border border-input bg-card px-2 text-sm tabular-nums';
export const baseRecordsChanged = 'marps-base-records-changed';
export const notifyBaseRecordsChanged = () => window.dispatchEvent(new Event(baseRecordsChanged));
