const mockCreateMMKV = jest.fn();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => mockCreateMMKV(),
}));

jest.mock('react-native-nitro-modules', () => ({}));

function loadStorage() {
  return require('./storage') as typeof import('./storage');
}

describe('storage adapter', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateMMKV.mockReset();
  });

  it('stores, reads, and removes string values', () => {
    const values = new Map<string, string>();
    mockCreateMMKV.mockReturnValue({
      getString: (key: string) => values.get(key),
      set: (key: string, value: string) => {
        values.set(key, value);
      },
      remove: (key: string) => {
        values.delete(key);
      },
    });

    const { storage } = loadStorage();

    expect(storage.getItem('token')).toBeNull();
    storage.setItem('token', 'abc');
    expect(storage.getItem('token')).toBe('abc');
    storage.removeItem('token');
    expect(storage.getItem('token')).toBeNull();
  });

  it('throws when MMKV cannot be created', () => {
    mockCreateMMKV.mockImplementation(() => {
      throw new Error('native module missing');
    });

    const { storage, StorageUnavailableError } = loadStorage();

    expect(() => storage.getItem('token')).toThrow(StorageUnavailableError);
    expect(() => storage.getItem('token')).toThrow(
      'MMKV is unavailable. Use an Expo development build.',
    );
  });
});
