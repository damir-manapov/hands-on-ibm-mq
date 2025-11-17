## Hands-on IBM MQ

Research playground for experimenting with IBM MQ queues (Docker image `ibmcom/mq:9.2.4.0-r1-amd64`). IBM no longer publishes images newer than 9.2.4 on Docker Hub; use the IBM Container Registry for newer builds if required.

I can't check it for now because i can't get IBM MQ Redistributable Client.

### Prerequisites

- Node.js 20.11+ and pnpm 10.22+.
- Docker (to run the IBM MQ container described in `compose/docker-compose.yml`).
- gitleaks available on your `PATH`.
  - Example install (outside this project folder):
    1. `curl -sSLo /tmp/gitleaks.tar.gz https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz`
    2. `tar -xzf /tmp/gitleaks.tar.gz -C /tmp`
    3. `sudo install /tmp/gitleaks /usr/local/bin/gitleaks`
    4. `rm -f /tmp/gitleaks.tar.gz && rm -f /tmp/gitleaks`
- IBM MQ Redistributable Client (needed to run the Node scripts):
  1. Create/log into an IBM ID at https://www.ibm.com/account/reg/us-en/signup.
  2. Download the latest MQ Redistributable Client for your platform (Linux x86-64: `.tar.gz` bundle).
  3. Extract and install:
     - `tar -xzf IBM_MQ_Clients_*_Linux_x86-64.tar.gz`
     - `cd MQClient && sudo ./mqlicense.sh -accept`
     - Install RPMs (`sudo rpm -ivh MQSeriesRuntime*.rpm MQSeriesClient*.rpm MQSeriesSamples*.rpm`)
       or DEBs (`sudo dpkg -i MQSeriesRuntime*.deb MQSeriesClient*.deb MQSeriesSamples*.deb`) depending on distro.
  4. Load the MQ environment before running the scripts:
     - `. /opt/mqm/bin/setmqenv -s`
     - `export LD_LIBRARY_PATH=/opt/mqm/lib64:/opt/mqm/lib:$LD_LIBRARY_PATH`
  5. Verify `libmqm_r.so` exists in `/opt/mqm/lib64`; keep the exports in your shell profile to avoid repeating the setup.

### Getting started

1. Copy the example environment file:
   - `cp env.example .env`
   - Adjust credentials/queue names to match your MQ setup.
2. Start IBM MQ locally:
   - `docker compose -f compose/docker-compose.yml up -d`
   - Or use the convenience scripts:
     - `pnpm compose:start` – start the stack
     - `pnpm compose:stop` – stop containers
     - `pnpm compose:restart` – stop then start again
     - `pnpm compose:reset` – stop everything and remove volumes/orphans
   - Need to prep the container so you can run the Node scripts inside it? Execute
     `./prepare-scripts-inside-container.sh` to install Node/pnpm in the container,
     copy the project into `/workspace`, and run `pnpm install` there.
3. Install dependencies: `pnpm install`

### Queue scripts

| Script            | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `pnpm mq:write`   | Seeds the first queue with a sample payload.                                  |
| `pnpm mq:process` | Reads from the first queue, enriches data, and publishes to the second queue. |
| `pnpm mq:read`    | Drains the last queue and prints the messages.                                |

All scripts rely on the environment variables described in `env.example`.

### Quality gates

- `./check.sh` – auto-format, lint, type-check (no emit), build, gitleaks scan, and tests.
- `./health.sh` – verifies dependencies are up-to-date and runs `pnpm audit`.
- `./all-checks.sh` – runs both scripts.
- The check script prefers a locally installed `gitleaks`; if it is missing but Docker is
  available, it will pull and run `zricethezav/gitleaks:v8.29.0`.

### Notes

- ESLint is configured with the latest flat config format, disallowing `any` and deprecated APIs.
- TypeScript configuration is strict and shared across code and tests.
- Refer to IBM documentation if you need versions beyond 9.2.4 (available from the IBM Container Registry).
- Need to manually verify MQ with IBM’s sample binaries? See `TryBySampleBinsFromIncideContainer.md` for a step-by-step guide to running `amqsput`/`amqsget` inside the container.
