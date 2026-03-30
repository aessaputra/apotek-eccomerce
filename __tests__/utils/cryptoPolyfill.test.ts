type DigestFn = (
  algorithm: string | { name: string },
  data: ArrayBuffer | ArrayBufferView,
) => Promise<ArrayBuffer>;

interface CryptoShape {
  subtle?: {
    digest?: DigestFn;
  };
}

interface GlobalWithCrypto {
  crypto?: CryptoShape;
}

const globalWithCrypto = globalThis as unknown as GlobalWithCrypto;

function toBase64Url(buffer: ArrayBuffer): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('cryptoPolyfill', () => {
  const originalCrypto = globalWithCrypto.crypto;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, 'crypto');
    }
  });

  test('uses digestStringAsync and returns ArrayBuffer output', async () => {
    const digestStringAsync = jest.fn<Promise<string>, [string, string, { encoding: string }]>();
    digestStringAsync.mockResolvedValue('616263');

    jest.doMock('react-native-get-random-values', () => ({}));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-crypto', () => ({
      CryptoDigestAlgorithm: {
        SHA1: 'SHA1',
        SHA256: 'SHA256',
        SHA384: 'SHA384',
        SHA512: 'SHA512',
      },
      CryptoEncoding: {
        HEX: 'HEX',
      },
      digestStringAsync,
    }));

    require('@/utils/cryptoPolyfill');

    const input = new Uint8Array([112, 107, 99, 101]);
    const digestResult = await globalWithCrypto.crypto?.subtle?.digest?.('SHA-256', input);

    expect(digestStringAsync).toHaveBeenCalledWith('SHA256', 'pkce', {
      encoding: 'HEX',
    });
    expect(digestResult).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(digestResult ?? new ArrayBuffer(0)))).toEqual([97, 98, 99]);
  });

  test('preserves PKCE digest bytes for known verifier vector', async () => {
    const digestStringAsync = jest.fn<Promise<string>, [string, string, { encoding: string }]>();
    digestStringAsync.mockResolvedValue(
      '13d31e961a1ad8ec2f16b10c4c982e0876a878ad6df144566ee1894acb70f9c3',
    );

    jest.doMock('react-native-get-random-values', () => ({}));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-crypto', () => ({
      CryptoDigestAlgorithm: {
        SHA1: 'SHA1',
        SHA256: 'SHA256',
        SHA384: 'SHA384',
        SHA512: 'SHA512',
      },
      CryptoEncoding: {
        HEX: 'HEX',
      },
      digestStringAsync,
    }));

    require('@/utils/cryptoPolyfill');

    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const verifierBytes = new TextEncoder().encode(verifier);
    const digestResult = await globalWithCrypto.crypto?.subtle?.digest?.('SHA-256', verifierBytes);

    expect(digestResult).toBeInstanceOf(ArrayBuffer);
    expect(toBase64Url(digestResult ?? new ArrayBuffer(0))).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  test('overrides existing crypto.subtle.digest on native', async () => {
    const digestStringAsync = jest.fn<Promise<string>, [string, string, { encoding: string }]>();
    digestStringAsync.mockResolvedValue('00');

    const oldDigest: DigestFn = async () => new ArrayBuffer(0);
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          digest: oldDigest,
        },
      },
      writable: true,
      configurable: true,
    });

    jest.doMock('react-native-get-random-values', () => ({}));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('expo-crypto', () => ({
      CryptoDigestAlgorithm: {
        SHA1: 'SHA1',
        SHA256: 'SHA256',
        SHA384: 'SHA384',
        SHA512: 'SHA512',
      },
      CryptoEncoding: {
        HEX: 'HEX',
      },
      digestStringAsync,
    }));

    require('@/utils/cryptoPolyfill');

    const newDigest = globalWithCrypto.crypto?.subtle?.digest;
    expect(newDigest).toBeDefined();
    expect(newDigest).not.toBe(oldDigest);
  });

  test('does not override existing digest on iOS', async () => {
    const digestStringAsync = jest.fn<Promise<string>, [string, string, { encoding: string }]>();
    digestStringAsync.mockResolvedValue('00');

    const oldDigest: DigestFn = async () => new ArrayBuffer(0);
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          digest: oldDigest,
        },
      },
      writable: true,
      configurable: true,
    });

    jest.doMock('react-native-get-random-values', () => ({}));
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    jest.doMock('expo-crypto', () => ({
      CryptoDigestAlgorithm: {
        SHA1: 'SHA1',
        SHA256: 'SHA256',
        SHA384: 'SHA384',
        SHA512: 'SHA512',
      },
      CryptoEncoding: {
        HEX: 'HEX',
      },
      digestStringAsync,
    }));

    require('@/utils/cryptoPolyfill');

    expect(globalWithCrypto.crypto?.subtle?.digest).toBe(oldDigest);
  });
});
