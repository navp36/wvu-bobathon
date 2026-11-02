# Appendix: MCP Transport Types

MCP (Model Context Protocol) servers can communicate with Bob over three transport mechanisms. The **transport** is how Bob talks to the server — it has nothing to do with what the server actually does.

---

## 1. Local (STDIO) — default for the bobathon

Bob **launches the server itself** as a child process on your machine. Communication happens over stdin/stdout; nothing touches the network.

```json
{
  "mcpServers": {
    "wvu-campus": {
      "command": "node",
      "args": ["${workspaceFolder}/wvu-campus-mcp/build/index.js"],
      "env": { "SOME_SETTING": "value" }
    }
  }
}
```

- `command` is required (`node`, `python`, `npx`, …).
- Optional fields: `args`, `cwd`, `env`, `alwaysAllow`, `disabled`.
- Many published servers run with `"command": "npx", "args": ["-y", "<package>"]`.

**When to use:** local prototypes, the bobathon lab, any server that only needs to serve you.

> **Important for server authors:** log to *stderr*, never stdout. Stdout is the protocol channel Bob reads; anything written there will corrupt the stream.

---

## 2. Remote (Streamable HTTP) — modern standard for shared servers

The server runs somewhere else and Bob connects to it by URL. This is the recommended protocol for any new remote server.

```json
{
  "mcpServers": {
    "campus-data": {
      "type": "streamable-http",
      "url": "https://mcp.example.com/mcp",
      "headers": { "Authorization": "Bearer ${env:CAMPUS_MCP_TOKEN}" }
    }
  }
}
```

- `url` is required; `headers` carries auth (use `${env:VAR}` — never hardcode secrets).
- One deployment can serve many users simultaneously.

**When to use:** a server your whole team shares, or one you've deployed to the cloud.

---

## 3. Remote (SSE, legacy)

Server-Sent Events is the older remote protocol. Still supported, but **use Streamable HTTP for anything new**. You'll mostly encounter SSE when connecting to an existing server that hasn't been updated.

```json
{
  "mcpServers": {
    "legacy-server": {
      "url": "https://mcp.example.com/sse",
      "headers": { "Authorization": "Bearer ${env:LEGACY_MCP_TOKEN}" }
    }
  }
}
```

**When to use:** only when the server you're connecting to exclusively offers an SSE endpoint.

---

## Comparison

|                | STDIO                        | Streamable HTTP / SSE            |
|----------------|------------------------------|----------------------------------|
| **Runs on**    | Your machine only            | Local or remote                  |
| **Users**      | One client                   | Many clients                     |
| **Setup**      | Simple                       | Needs an HTTP server             |
| **Security**   | No network exposure          | You must secure it explicitly    |
| **Updates**    | Each user updates their own  | Update once, centrally           |

---

## Project vs. global config

- **Project** `.bob/mcp.json` — lives with the repo, shareable with your team. If the same server name exists in both places, **project wins**.
- **Global** `~/.bob/mcp.json` — available in every workspace.

Every connected server adds to Bob's fixed context overhead. Prefer project config and only connect what the current work needs.

---

## Troubleshooting

| Symptom | Try |
|---|---|
| Server not listed, or shows an error | Check the JSON is valid (a missing comma is the usual culprit). Confirm the `command` exists on your PATH (`node -v`). |
| STDIO server won't start | Run the exact `command` + `args` in a terminal. Use absolute paths if `${workspaceFolder}` isn't expanding. |
| Connected, but Bob never uses the tools | Make sure you're in a mode that has MCP access and that MCP servers are enabled in settings. Ask directly: "use the \<server\> tool to…". |
| Remote server returns 401/403 | Check the header, and that the environment variable is set in the shell Bob was launched from. Restart Bob after changing it. |
| Bob feels slow or forgetful after adding servers | Open the context breakdown. A large **MCP Tools** section means too many servers or tools; disable what you aren't using. |
