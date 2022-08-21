#!/usr/bin/env node

import express from "express";
import axios from "axios";
import morgan from "morgan";
import http from "http";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { execSync, spawn } from "child_process";
import { AddressInfo } from "net";
import { getVoltaPrefix } from "./utils";

const app = express();
const server = http.createServer(app);

const cli = yargs(hideBin(process.argv))
  .command("<dateTime> <npmCommand>", "Execute the <npmCommand> back in time to <dateTime>")
  .command("<dateTime> --server", "Run as registry server with packages from the <dateTime>")
  .demandCommand(1)
  .option("debug", {
    alias: "d",
    type: "boolean",
    description: "Output debug messages",
  })
  .option("server", {
    alias: "s",
    type: "boolean",
    description: "Run as registry server",
  })
  .option("port", {
    alias: "p",
    type: "number",
    description: "Server port",
    default: 0,
  })
  .option("package-manager", {
    alias: "p",
    type: "string",
    description: "Package manager",
  });

const cliOptions = cli.parseSync();

const [rootDateString, npmCommand, ...npmCommandArguments] = cliOptions._;

if (!cliOptions.server && !npmCommand) {
  cli.showHelp();
  process.exit(1);
}

const isDebugOn = cliOptions.debug;
const debug = (...args: any) => {
  if (isDebugOn) {
    console.log("[debug]", ...args);
  }
};

if (isDebugOn) {
  app.use(morgan("combined", { stream: { write: (msg) => debug(msg) } }));
}

let packageManager = npmCommand;
if (!["npm", "yarn"].includes(npmCommand as string)) {
  packageManager = "npm";
}

const baseRegistry = execSync(`${packageManager} config get registry`).toString().split("\n")[0];

const parentRegistry = axios.create({
  baseURL: baseRegistry,
});

const rootDate = new Date(rootDateString);

app.get("/", async (req, res) => {
  const { data } = await parentRegistry.get("/");
  res.json(data);
});

app.get("/:package", async (req, res) => {
  const { data } = await parentRegistry.get(`/${req.params.package}`, {
    headers: { "User-Agent": req.get("User-Agent") || "" },
  });

  for (const version of Object.keys(data.time)) {
    if (["modified", "created"].includes(version)) {
      continue;
    }
    const date = new Date(data.time[version]);
    if (date > rootDate) {
      delete data.time[version];
      delete data.versions[version];
    }
  }

  const latest: { date: null | Date; version: null | string } = { date: null, version: null };
  for (const version of Object.keys(data.time)) {
    if (["modified", "created"].includes(version)) {
      continue;
    }
    const isStable = /^\d+\.\d+\.\d+$/.test(version);
    const date = new Date(data.time[version]);
    if (isStable) {
      if (!latest.date || date > latest.date) {
        latest.date = date;
        latest.version = version;
      }
    }
  }
  data["dist-tags"] = {
    latest: latest.version,
  };
  data._rev = `0-${rootDate.getTime()}`;

  res.json(data);
});

app.get("*", async (req, res) => {
  return res.redirect(302, `${parentRegistry.defaults.baseURL}${req.url}`);
});

server.listen(String(cliOptions.port));
const port = (server.address() as AddressInfo).port;
debug(`Registry server is running at http://localhost:${port}`);

if (cliOptions.server) {
  console.info(`Registry server: http://localhost:${port}`);
} else {
  (async () => {
    process.env.NPM_CONFIG_REGISTRY = `http://localhost:${port}`;

    const command = `${getVoltaPrefix()} ${npmCommand} ${npmCommandArguments.join(" ")}`;

    const ps = spawn(command, { stdio: "inherit", shell: true });

    process.on("SIGINT", () => {
      ps.kill();
    });

    ps.on("exit", (code: number) => {
      debug("child process exited with code " + code?.toString());
      ps.kill();
      server.close();
      process.exit(code);
    });
  })();
}
