type Options = {
    version?: string;
    offline?: boolean;
    username?: string;
    host?: string;
    port?: number;
    skinData?: Object | null;
}

const defaultOptions: Required<Options> = {
    version: "1.21.0",
    offline: false,
    username: "defaultUser",
    host: "127.0.0.1",
    port: 19132,
    skinData: null
};

export { Options, defaultOptions };
