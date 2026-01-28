const http = require("http");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  port: 5467,
  host: "localhost",
  // Directories to serve (relative to project root)
  serveDirs: ["client", "kehoach", "demo", "dulieu", "live", "vanban", "src"],
  // Root files to serve
  serveRootFiles: ["index.html"],
};

// MIME types
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function isPathAllowed(requestPath) {
  // Check if path is in root files
  if (CONFIG.serveRootFiles.includes(requestPath)) {
    return true;
  }

  // Check if path starts with any allowed directory
  for (const dir of CONFIG.serveDirs) {
    if (requestPath.startsWith(dir + "/") || requestPath === dir) {
      return true;
    }
  }

  return false;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>404 - File Not Found</h1>");
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  });
}

function serveDirectory(res, dirPath, requestPath) {
  // Try to serve index.html if it exists
  const indexPath = path.join(dirPath, "index.html");

  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (!err) {
      serveFile(res, indexPath);
    } else {
      // List directory contents
      fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end("<h1>500 - Internal Server Error</h1>");
          return;
        }

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Directory: ${requestPath}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; }
    a { text-decoration: none; color: #0066cc; }
    a:hover { text-decoration: underline; }
    .dir { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Directory: /${requestPath}</h1>
  <ul>
    ${requestPath !== "" ? '<li><a href="../">..</a></li>' : ""}
    ${entries
      .map((entry) => {
        const isDir = entry.isDirectory();
        const href = path
          .join("/", requestPath, entry.name)
          .replace(/\\/g, "/");
        return `<li><a href="${href}" class="${isDir ? "dir" : ""}">${entry.name}${isDir ? "/" : ""}</a></li>`;
      })
      .join("\n    ")}
  </ul>
</body>
</html>`;

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      });
    }
  });
}

const server = http.createServer((req, res) => {
  let requestPath = req.url.split("?")[0]; // Remove query string

  // Remove leading slash
  if (requestPath.startsWith("/")) {
    requestPath = requestPath.substring(1);
  }

  // Default to index.html for root
  if (requestPath === "" || requestPath === "/") {
    requestPath = "index.html";
  }

  // Security: prevent directory traversal
  if (requestPath.includes("..")) {
    res.writeHead(403, { "Content-Type": "text/html" });
    res.end("<h1>403 - Forbidden</h1>");
    return;
  }

  // Check if path is allowed
  if (!isPathAllowed(requestPath)) {
    res.writeHead(403, { "Content-Type": "text/html" });
    res.end("<h1>403 - Access Denied</h1>");
    return;
  }

  const filePath = path.join(__dirname, requestPath);

  // Check if path exists
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>404 - Not Found</h1>");
      return;
    }

    if (stats.isDirectory()) {
      serveDirectory(res, filePath, requestPath);
    } else if (stats.isFile()) {
      serveFile(res, filePath);
    } else {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h1>404 - Not Found</h1>");
    }
  });
});

server.listen(CONFIG.port, CONFIG.host, () => {
  console.log(
    `\n🚀 Static server running at http://${CONFIG.host}:${CONFIG.port}/`,
  );
  console.log(`\n📁 Serving directories: ${CONFIG.serveDirs.join(", ")}`);
  console.log(`📄 Serving root files: ${CONFIG.serveRootFiles.join(", ")}`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
