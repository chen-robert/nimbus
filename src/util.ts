import Command from "./commands/command";
import config from "../config.json";
import db from "./db";
import { getVal } from "./getVal";

/**
 * Returns a help message for a given command
 * @param cmd Command to generate help for
 */
export const getHelp = (cmd: Command): string => {
  return `${config.prefix + cmd.cmd} ${cmd.params} | ${cmd.desc}`;
};

/**
 * Generates the total value, summing up stock values and balance
 * @param uid Discord ID of the user
 */
export const getUserValue = async (uid: string): Promise<number> => {
  const stocks = (db.get("users") as any)
    .get(uid)
    .get("stock")
    .value();
  const balance = (db.get("users") as any)
    .get(uid)
    .get("money")
    .value();

  let ret = balance;
  for (const [name, amt] of Object.entries(stocks)) {
    const value = await getVal(name);

    ret += +amt * value;
  }
  return ret;
};
