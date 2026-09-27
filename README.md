# Screeps Rollup TypeScript

This repository lets you write Screeps code in TypeScript, bundle it with
Rollup, and upload the resulting JavaScript to Screeps. The game does not need
to be installed locally: Screeps runs in the browser, and your code executes on
the Screeps servers each game tick.

## How Screeps code works

Your program exports a loop that Screeps calls once per game tick:

```ts
export const loop = (): void => {
    for (const creep of Object.values(Game.creeps)) {
        creep.say(`tick ${Game.time}`);
    }
};
```

Inside the loop, the in-game API provides objects such as `Game.creeps`,
`Game.rooms`, and `Game.spawns`, plus methods such as `creep.moveTo()` and
`spawn.spawnCreep()`.

- Play in the browser: <https://screeps.com/>
- In-game API reference: <https://docs.screeps.com/api/>
- Game loop documentation: <https://docs.screeps.com/game-loop.html>

## Usage

Place your initial spawn in an owned room and deploy the bundle. No flags,
manually spawned creeps, or preconfigured source IDs are required. The kernel
initializes memory, creates an affordable harvester, establishes miners and
hauling, builds infrastructure, upgrades the controller, and replaces aging
creeps. An established colony returns to recovery mode after losing its
population. A completely empty spawn must first regain enough game-provided
energy to spawn a useful creep; code cannot create energy or spawn without it.

Strategy and safety limits live in [`src/config/policy.ts`](src/config/policy.ts).
Emergency income and defense take precedence over normal development.
Expansion, remote mining, production, and market activity are enabled by
policy but require healthy colonies and the relevant reserves, intel, RCL,
infrastructure, or GCL. Set their enable flags to `false` to opt out.

The architecture follows [`automation.md`](automation.md):

- `kernel`: migration, cleanup, scheduling, and per-process error isolation.
- `colony` / `planning`: room models, stable population demands, source and
  layout planning, construction, defense, logistics, and structure execution.
- `roles`: typed creep assignments; creeps never queue their own replacements.
- `empire`: intel, remote-room and expansion state machines, mineral
  production, terminal balancing, and reserve-aware market activity.

Persistent state is stored in `Memory.colonies[roomName]`, `Memory.intel`,
and `Memory.empire`. Each colony owns its `spawnQueue`, `logisticsJobs`,
`workJobs`, source plans, and remote records. Logistics assignments hold one
string job ID; leases recover when a transporter dies. Positions are
serialized coordinates, not game objects. Invalid spawn requests are
removed into a bounded `quarantine` with a reason.

Layout planning never destroys existing structures. Conflicting locations
are recorded in `construction.blocked`. An incompatible existing base may
need manual adjustments; changing `construction.revision` to `0` requests
replanning without deleting structures.

## Install and build

Install the project dependencies:

```powershell
npm install
```

Compile without uploading:

```powershell
npm run build
```

The `build` script compiles `src\main.ts` once into the CommonJS bundle
`dist\main.js`, including its source map, without uploading.

Screeps accepts JavaScript modules, not TypeScript source. Always upload the
compiled `dist\main.js`.

## Upload with this project's Rollup integration

Create an authentication token under
[Account Settings > Auth Tokens](https://screeps.com/a/#!/account/auth-tokens).
Use a restricted token with code-upload permission when possible.

Create `.secret.json` in the repository root:

```json
{
  "main": {
    "token": "YOUR_SCREEPS_TOKEN",
    "protocol": "https",
    "hostname": "screeps.com",
    "port": 443,
    "path": "/",
    "branch": "default"
  }
}
```

The file is already excluded by `.gitignore`; never commit or share it. Upload
and upload once with:

```powershell
npm run push
```

This selects the `main` configuration from `.secret.json`, builds the bundle,
and uploads it through `rollup-plugin-screeps`. Use `npm run push-watch`
to keep watching and uploading changes; press `Ctrl+C` to stop it.

## Development

Run the mocked Screeps scenarios and pure planner tests with:

```powershell
npm test -- --runInBand
```

The tests run locally without a Screeps server or upload credentials.
They exercise memory migration, emergency spawning, stable-demand
replacement, logistics leases, construction, defense, and empire safety
gates. Real-game travel, terrain, combat, and economy timing still depend
on the shard; watch the contextual console diagnostics after deployment.

## Upload directly through the Web API

The code-upload request is:

```http
POST https://screeps.com/api/user/code
X-Token: YOUR_SCREEPS_TOKEN
Content-Type: application/json; charset=utf-8
```

Its JSON body contains the destination branch and a map of module names to
JavaScript source:

```json
{
  "branch": "default",
  "modules": {
    "main": "module.exports.loop = function () {};"
  }
}
```

For this project, upload the contents of `dist\main.js` as the `main` module.
PowerShell safely handles JSON escaping:

```powershell
$env:SCREEPS_TOKEN = Read-Host 'Screeps token'

$body = @{
    branch = 'default'
    modules = @{
        main = Get-Content -Raw -LiteralPath '.\dist\main.js'
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
    -Method Post `
    -Uri 'https://screeps.com/api/user/code' `
    -Headers @{ 'X-Token' = $env:SCREEPS_TOKEN } `
    -ContentType 'application/json; charset=utf-8' `
    -Body $body
```

A successful request returns JSON equivalent to:

```json
{"ok": 1}
```

For a build containing several JavaScript files, each file must be sent as a
module. The filename without `.js` becomes its module name:

```powershell
$modules = @{}

Get-ChildItem '.\dist' -Filter '*.js' | ForEach-Object {
    $modules[$_.BaseName] = Get-Content -Raw -LiteralPath $_.FullName
}

$body = @{
    branch = 'default'
    modules = $modules
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
    -Method Post `
    -Uri 'https://screeps.com/api/user/code' `
    -Headers @{ 'X-Token' = $env:SCREEPS_TOKEN } `
    -ContentType 'application/json; charset=utf-8' `
    -Body $body
```

Specify an existing branch explicitly and send the complete intended module
set, because an upload may replace that branch's existing modules rather than
merge individual files. Uploading code does not necessarily activate a
different branch.

## Security and API limits

- Keep authentication tokens out of source code, Git, command history, URLs,
  and build logs.
- Prefer the `X-Token` header over the `_token` query parameter because URLs
  are commonly logged.
- Revoke and replace a token immediately if it is exposed.
- The documented token limits include 240 code-upload requests per day and a
  global limit of 120 requests per minute. HTTP `429` indicates rate limiting.
- Check both the HTTP status and response body. Authentication failures
  commonly return `401`.

## Official references

- Authentication tokens: <https://docs.screeps.com/auth-tokens.html>
- Code upload documentation:
  <https://github.com/screeps/docs/blob/master/source/commit.md>
- Official uploader implementation:
  <https://github.com/screeps/grunt-screeps/blob/master/tasks/screeps.js>
