import Command from "./commands/command";
import config from "../config.json";

/**
 * Returns a help message for a given command
 * @param cmd Command to generate help for
 */
export const getHelp = (cmd: Command): string => {
  return `${config.prefix + cmd.cmd} ${cmd.params} | ${cmd.desc}`;
};
