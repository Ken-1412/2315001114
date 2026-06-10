export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogStack = 'backend' | 'frontend';

export type BackendPackage =
    | 'cache' | 'controller' | 'cron_job' | 'db'
    | 'domain' | 'handler' | 'repository' | 'route' | 'service';

export type FrontendPackage =
    | 'api' | 'component' | 'hook' | 'page' | 'state' | 'style';

export type SharedPackage = 'auth' | 'config' | 'middleware' | 'utils';

export type LogPackage = BackendPackage | FrontendPackage | SharedPackage;

export interface LogPayload {
    stack: LogStack;
    level: LogLevel;
    package: LogPackage;
    message: string;
}

export const VALID_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

export const VALID_STACKS: LogStack[] = ['backend', 'frontend'];

export const VALID_PACKAGES: LogPackage[] = [
    // Backend only
    'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service',
    // Frontend only
    'api', 'component', 'hook', 'page', 'state', 'style',
    // Shared
    'auth', 'config', 'middleware', 'utils',
];