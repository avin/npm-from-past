import which from "which";

export function getVoltaPrefix(): string {
  // https://blog.volta.sh/2020/11/25/command-spotlight-volta-run/
  const VOLTA_PREFIX = "volta run";
  const hasVoltaCommand = which.sync("volta", { nothrow: true }) !== null;
  return hasVoltaCommand ? VOLTA_PREFIX : "";
}
