const httpProxy = require('http-proxy')
const http = require("http")
const {tokens} = require("./config")
const url = require('url')
const targetHost = 'localhost'
const targetHttpPort = 8545
const targetWsPort = 8546
const proxyPort = 3000

// HERE LIES: A reverse proxy server for many ethereum blockchain backends
// - Requires valid web3 HTTP and WebSocket endpoints on target server
// - Proxy listens on port 3000, assumes
// - Proxies http requests to port 8545 of target, ws connections to port 8646 on target
// - Authenticates based on presence of whitelisted tokens (which are sha256 hashes)

// main function
const run = () => {
  const proxy = httpProxy.createProxyServer({})
  const server = handleWsRequests(createServer(proxy), proxy)
  server.listen(proxyPort)

  console.log(`Listening on HTTPS port ${proxyPort}`)
  return server
}

const createServer = proxy => (
  http.createServer((req, res) => {
    hasValidToken(req)
      ? proxy.web(req, res, { target: `http://${targetHost}:${targetHttpPort}` })
      : respondWith401(res)
  })
)
const handleWsRequests = (server, proxy) => {
  server.on("upgrade", (req, socket, head) => {
    hasValidToken(req)
    ? proxy.ws(req, socket, head, { target: `ws://${targetHost}:${targetWsPort}` })
    : socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n")
  })
  return server
}

const hasValidToken = (req)  =>
  tokens[url.parse(req.url, true).query['token']]

const respondWith401 = (res) => {
  res.writeHead(401, {'Content-Type': 'application/json' })
  res.write(JSON.stringify({ error: "access denied" }))
  res.end()
}

module.exports = {
  run,
  targetHost,
  targetHttpPort,
  targetWsPort,
  proxyPort,
}