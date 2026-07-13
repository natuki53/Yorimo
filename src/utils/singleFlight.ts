export const createSingleFlight = <Key, Value>() => {
  const pending = new Map<Key, Promise<Value>>();

  return (key: Key, operation: () => Promise<Value>): Promise<Value> => {
    const existing = pending.get(key);
    if (existing) {
      return existing;
    }

    let request: Promise<Value>;
    request = operation().finally(() => {
      if (pending.get(key) === request) {
        pending.delete(key);
      }
    });
    pending.set(key, request);
    return request;
  };
};
