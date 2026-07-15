import { exec } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { handleApiRequest } from "./server/http-api.mjs";

const DIST_DIR = resolve(process.cwd(), "dist");
const HOST = process.env.HOST || "0.0.0.0";
const START_PORT = Number(process.env.PORT || 5175);
const MAX_PORT_ATTEMPTS = 20;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getContentType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function getNetworkUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];

  for (const group of Object.values(interfaces)) {
    for (const detail of group || []) {
      if (detail.family !== "IPv4" || detail.internal) {
        continue;
      }

      urls.push(`http://${detail.address}:${port}/`);
    }
  }

  return [...new Set(urls)];
}

function safeResolveUrlPath(urlPath, distDir) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const cleanPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const normalizedPath = normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return resolve(distDir, `.${normalizedPath}`);
}

async function sendFile(res, filePath) {
  const info = await stat(filePath);
  const contentType = getContentType(filePath);
  const htmlHeaders = contentType.startsWith("text/html")
    ? {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      }
    : {
        "Cache-Control": "no-cache",
      };
  res.writeHead(200, {
    "Content-Length": info.size,
    "Content-Type": contentType,
    ...htmlHeaders,
  });
  createReadStream(filePath).pipe(res);
}

function openBrowser(url) {
  if (process.env.OPEN_BROWSER !== "1") {
    return;
  }

  const escapedUrl = url.replace(/'/g, "''");
  exec(`powershell -NoProfile -Command "Start-Process '${escapedUrl}'"`, error => {
    if (error) {
      console.warn("自动打开浏览器失败，请手动访问：", url);
    }
  });
}

function assertDistExists(distDir) {
  if (!existsSync(distDir)) {
    throw new Error(`未找到 dist 目录: ${distDir}，请先执行 npm run build。`);
  }
}

export async function serveStatic(req, res, distDir = DIST_DIR) {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const requestedFile = safeResolveUrlPath(req.url, distDir);
  const indexFile = join(distDir, "index.html");

  if (requestedFile.startsWith(distDir)) {
    try {
      const info = await stat(requestedFile);
      if (info.isFile()) {
        if (req.method === "HEAD") {
          const contentType = getContentType(requestedFile);
          const htmlHeaders = contentType.startsWith("text/html")
            ? {
                "Cache-Control": "no-store, no-cache, must-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              }
            : {
                "Cache-Control": "no-cache",
              };
          res.writeHead(200, {
            "Content-Length": info.size,
            "Content-Type": contentType,
            ...htmlHeaders,
          });
          res.end();
          return;
        }

        await sendFile(res, requestedFile);
        return;
      }
    } catch {
      // Ignore and fall through to SPA fallback.
    }
  }

  const indexContent = await readFile(indexFile);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(req.method === "HEAD" ? "" : indexContent);
}

function withAsyncControls(server) {
  const listen = server.listen.bind(server);
  const close = server.close.bind(server);

  server.listen = (...args) =>
    new Promise((resolvePromise, rejectPromise) => {
      const onError = error => {
        server.off("error", onError);
        rejectPromise(error);
      };

      server.once("error", onError);
      listen(...args, () => {
        server.off("error", onError);
        resolvePromise(server);
      });
    });

  server.close = () =>
    new Promise((resolvePromise, rejectPromise) => {
      close(error => {
        if (error) {
          rejectPromise(error);
          return;
        }

        resolvePromise();
      });
    });

  return server;
}

export function createHrServer({
  distDir = DIST_DIR,
  dataFilePath = resolve(process.cwd(), "data", "app-db.json"),
} = {}) {
  assertDistExists(distDir);

  const requestHandler = async (req, res) => {
    try {
      if (await handleApiRequest(req, res, { dataFilePath })) {
        return;
      }

      await serveStatic(req, res, distDir);
    } catch (error) {
      console.error("共享服务异常：", error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    }
  };

  return withAsyncControls(createServer(requestHandler));
}

export function startServer(port, attemptsLeft = MAX_PORT_ATTEMPTS) {
  const server = createHrServer();

  server.on("error", error => {
    if (error && error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`端口 ${port} 已被占用，正在尝试端口 ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }

    console.error("共享数据服务启动失败：", error);
    process.exit(1);
  });

  server.listen(port, HOST).then(() => {
    const localUrl = `http://localhost:${port}/`;

    console.log("");
    console.log("==========================================");
    console.log("考勤系统共享数据服务已启动");
    console.log(`本机访问: ${localUrl}`);

    const urls = getNetworkUrls(port);
    if (urls.length) {
      console.log("局域网访问:");
      for (const url of urls) {
        console.log(url);
      }
    } else {
      console.log("局域网访问: 暂未检测到可用 IPv4 地址");
    }

    console.log("首次使用时，请在主机电脑浏览器中导入当前旧数据作为共享主数据");
    console.log("按 Ctrl+C 可停止服务");
    console.log("==========================================");
    console.log("");

    openBrowser(localUrl);
  }).catch(error => {
    console.error("共享数据服务启动失败：", error);
    process.exit(1);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer(START_PORT);
}
