import { Message } from "discord.js";
import request from "request-promise-native";

import db from "../db";
import Command from "./command";
import config from "../../config.json";
import { getHelp } from "../util";

const verify: Command = {
  cmd: "verify",
  params: "",
  desc: "Verifies your account",
  requiresAuth: false,
  resolve: (parts: string[], msg: Message) => {
    const uid = msg.author.id;
    const $user = (db.get("users") as any).get(uid);
    const uname = $user.get("username").value();
    const token = $user.get("token").value();

    if (!uname) return msg.channel.send(`Please generate a token with \`${getHelp(verify)}\` first!`);

    request(`https://codeforces.com/api/user.info?handles=${uname}`, (err, res, body) => {
      const data = JSON.parse(body);

      if (data.status === "FAILED") {
        return msg.channel.send(`Invalid username \`${uname}\`. Please generate a new token with ${getHelp(verify)}.`);
      }
      const user = data.result[0];
      const age: number = user.lastOnlineTimeSeconds - user.registrationTimeSeconds;

      if (age < 60 * 60 * 24 * 30) return msg.channel.send("Sorry, user account is too new. Cannot be verified");

      if (user.firstName != token) {
        return msg.channel.send(`Invalid token. Found \`${user.firstName}\` while expected \`${token}\`.`);
      } else {
        msg.channel.send(`Authenticated as ${uname} successfully!`);

        $user
          .set("auth", true)
          .set("stock", {
            [uname]: config.startingStock,
          })
          .set("money", 20)
          .write();
      }
    });
  },
};

export default verify;
