import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'path';
import type { APIHandlerInfo } from '@modern-js/bff-core';
import type {
  Render,
  ServerManifest,
  ServerPluginLegacy,
} from '@modern-js/server-core';
import type { InternalRequest } from '@modern-js/server-core';
import {
  httpCallBack2HonoMid,
  sendResponse,
} from '@modern-js/server-core/node';
import type { Monitors } from '@modern-js/types';
import type { NodeRequest, NodeResponse } from '@modern-js/types/server';
import { fs, compatibleRequire, logger } from '@modern-js/utils';
import Koa, { type Middleware } from 'koa';
import type Application from 'koa';
import koaBody from 'koa-body';
import Router from 'koa-router';
import { run } from './context';
import registerRoutes from './registerRoutes';

// We will remove express plugin so we just add a mock monitors object here
const defaultMonitor: Monitors = {
  push(monitor) {},
  counter(name, ...args) {},
  info(message, ...args) {},
  debug(message, ...args) {},
  trace(message, ...args) {},
  warn(message, ...args) {},
  error(message, ...args) {},
  timing(name, dur, ...args) {},
};

declare module 'http' {
  interface IncomingMessage {
    __honoRequest?: InternalRequest;
    __templates?: Record<string, string>;
    __serverManifest?: ServerManifest;
  }
}

const findAppModule = async (apiDir: string) => {
  const exts = ['.ts', '.js'];
  const paths = exts.map(ext => path.join(apiDir, `app${ext}`));

  for (const filename of paths) {
    if (await fs.pathExists(filename)) {
      // 每次获取 app.ts 的时候，避免使用缓存的 app.ts
      delete require.cache[filename];
      return compatibleRequire(filename);
    }
  }

  return null;
};

const initMiddlewares = async (
  middleware: (Middleware | string)[],
  app: Application,
) => {
  for (const middlewareItem of middleware) {
    const middlewareFunc =
      typeof middlewareItem === 'string'
        ? await compatibleRequire(middlewareItem)
        : middlewareItem;

    app.use(middlewareFunc);
  }
};

const defaultErrorHandler: Middleware = async (ctx, next) => {
  ctx.onerror = err => {
    if (err === null) {
      return;
    }
    ctx.app.emit('error', err, ctx);
    if (!ctx.res.headersSent) {
      throw err;
    }
  };
  await next();
};

const createApp = async ({
  apiDir,
  middlewares,
  mode,
  apiHandlerInfos,
  render,
}: {
  apiDir: string;
  middlewares: Middleware[];
  mode: 'function' | 'framework';
  apiHandlerInfos: APIHandlerInfo[];
  render?: Render;
}) => {
  let app: Application;
  const router = new Router();

  if (mode === 'framework') {
    app = await findAppModule(apiDir);
    if (!(app instanceof Koa)) {
      app = new Koa();
      app.use(defaultErrorHandler);
      app.use(
        koaBody({
          multipart: true,
        }),
      );
    }

    if (middlewares && middlewares.length > 0) {
      await initMiddlewares(middlewares, app);
    }

    app.use(run);
    registerRoutes(router, apiHandlerInfos);
  } else if (mode === 'function') {
    app = new Koa();
    app.use(defaultErrorHandler);
    app.use(
      koaBody({
        multipart: true,
      }),
    );
    if (middlewares && middlewares.length > 0) {
      await initMiddlewares(middlewares, app);
    }
    app.use(run);
    registerRoutes(router, apiHandlerInfos);
  } else {
    throw new Error(`mode must be function or framework`);
  }

  app.use(router.routes());

  if (render) {
    app.use(async (ctx, next) => {
      const response = await render(ctx.req.__honoRequest!.raw, {
        logger,
        nodeReq: ctx.req,
        templates: ctx.req.__templates!,
        serverManifest: ctx.req.__serverManifest!,
        monitors: defaultMonitor,
      });

      if (response) {
        await sendResponse(response, ctx.res);
      }
      await next();
    });
  }
  return app;
};

export default (): ServerPluginLegacy => {
  let app: Application;
  let apiDir: string;
  let mode: 'function' | 'framework';
  let renderHtml: Render | undefined;
  return {
    name: '@modern-js/plugin-koa',
    pre: ['@modern-js/plugin-bff'],
    post: ['@modern-js/plugin-server'],
    setup: api => ({
      async reset({ event }) {
        if (event.type === 'file-change') {
          const appContext = api.useAppContext();
          const middlewares = appContext.apiMiddlewares as Middleware[];
          const apiHandlerInfos =
            appContext.apiHandlerInfos as APIHandlerInfo[];
          app = await createApp({
            apiDir,
            middlewares,
            mode,
            apiHandlerInfos,
            render: renderHtml,
          });
        }
      },
      async prepareApiServer({ pwd, render }) {
        const appContext = api.useAppContext();
        const apiHandlerInfos = appContext.apiHandlerInfos as APIHandlerInfo[];
        const { apiDirectory } = appContext;
        const userConfig = api.useConfigContext();
        const middlewares = appContext.apiMiddlewares as Middleware[];
        mode = appContext.apiMode as 'function' | 'framework';

        renderHtml =
          userConfig.bff?.enableHandleWeb && render ? render : undefined;
        apiDir = apiDirectory || path.join(pwd, './api');

        app = await createApp({
          apiDir,
          middlewares,
          mode,
          apiHandlerInfos,
          render: renderHtml,
        });

        const callback = async (req: IncomingMessage, res: ServerResponse) => {
          return app.callback()(req, res);
        };

        return httpCallBack2HonoMid(
          callback as (req: NodeRequest, res: NodeResponse) => Promise<void>,
        );
      },
    }),
  };
};
