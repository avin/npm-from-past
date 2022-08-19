#!/usr/bin/env node

import express from "express";
import axios from "axios";
import morgan from "morgan";
import http from "http";
import { execSync } from "child_process";
import { AddressInfo } from "net";

const app = express();
const server = http.createServer(app);

const [rootDateString, npmCommand, ...npmCommandArguments] = process.argv.slice(2);

const isDebugOn = process.env.NPM_FROM_PAST_DEBUG === "1";
const debug = (...args: any) => {
  if (isDebugOn) {
    console.log("[debug]", ...args);
  }
};

if (isDebugOn) {
  app.use(morgan("combined", { stream: { write: (msg) => debug(msg) } }));
}

const baseRegistry = execSync(`${npmCommand} config get registry`).toString().split("\n")[0];

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

app.get("/:package/-/*", async (req, res) => {
  return res.redirect(302, `${parentRegistry.defaults.baseURL}${req.url}`);
});

server.listen("0");
const port = (server.address() as AddressInfo).port;
debug(`Registry server is running at http://localhost:${port}`);

process.env.NPM_CONFIG_REGISTRY = `http://localhost:${port}`;

const spawn = require("child_process").spawn;
const ls = spawn(npmCommand, npmCommandArguments);

ls.stdout.on("data", (data: Buffer) => {
  console.log(data.toString());
});

ls.stderr.on("data", (data: Buffer) => {
  console.log(data.toString());
});

ls.on("exit", (code: Buffer) => {
  debug("child process exited with code " + code.toString());
  server.close();
});
