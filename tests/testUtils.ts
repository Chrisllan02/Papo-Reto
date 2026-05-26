export const createJsonResponse = () => {
  let statusCode = 200;
  const headers = new Map<string, string>();
  let body = '';

  return {
    res: {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), value);
      },
      end(value?: string | Buffer) {
        body = Buffer.isBuffer(value) ? value.toString('utf8') : value || '';
      },
    },
    get statusCode() {
      return statusCode;
    },
    get headers() {
      return headers;
    },
    get body() {
      return body;
    },
    json<T = any>() {
      return JSON.parse(body || '{}') as T;
    },
  };
};
