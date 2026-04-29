const PASSWORD_RECOVERY_ROUTE = 'reset-password';
const PASSWORD_RECOVERY_PATH = `/${PASSWORD_RECOVERY_ROUTE}`;
const APP_SCHEME_BASE_URL = 'apotek-ecommerce:///';

type NativeIntentInput = {
  path: string;
  initial: boolean;
};

function appendSearchParamsFromString(target: URLSearchParams, rawParams: string) {
  const params = new URLSearchParams(rawParams.replace(/^[?#]/, ''));

  params.forEach((value, key) => {
    if (!target.has(key)) {
      target.set(key, value);
    }
  });
}

function getUrlSegments(url: URL) {
  return [url.hostname, ...url.pathname.split('/')].map(segment => segment.trim()).filter(Boolean);
}

function isPasswordRecoveryUrl(url: URL) {
  return getUrlSegments(url).some(segment => segment === PASSWORD_RECOVERY_ROUTE);
}

export function getPasswordRecoveryPathFromSystemPath(path: string) {
  try {
    const url = new URL(path, APP_SCHEME_BASE_URL);

    if (!isPasswordRecoveryUrl(url)) {
      return null;
    }

    const recoveryParams = new URLSearchParams(url.search);

    if (url.hash) {
      appendSearchParamsFromString(recoveryParams, url.hash);
    }

    const queryString = recoveryParams.toString();
    return queryString ? `${PASSWORD_RECOVERY_PATH}?${queryString}` : PASSWORD_RECOVERY_PATH;
  } catch {
    return null;
  }
}

export function redirectSystemPath({ path }: NativeIntentInput) {
  return getPasswordRecoveryPathFromSystemPath(path) ?? path;
}
