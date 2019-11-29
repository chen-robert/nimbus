import { Message } from "discord.js";
import crypto from "crypto";

import db from "../db";
import Command from "./command";
import config from "../../config.json";
import { getHelp } from "../util";

const auth: Command = {
  cmd: "auth",
  params: "[name (e.g. gamesterrex)]",
  desc: "Links a codeforces account to your discord account.",
  requiresAuth: false,
  resolve: (parts: string[], msg: Message) => {
    const uid = msg.author.id;
    const uname = parts[0];
    if (!uname) return msg.channel.send(getHelp(auth));
    if (!/^[a-z0-9\-_\.]+$/i.test(uname)) return msg.channel.send("Username must be alphanumeric");

    const token = `nimbus-verification-token-${crypto.randomBytes(16).toString("hex")}`;
    msg.channel.send(
      `Please change your First Name in https://codeforces.com/settings/social to \`${token}\` . Then type \`${config.prefix}verify\`. (You can change it back after you verify).`,
    );

    (db.get("users") as any)
      .get(uid)
      .set("token", token)
      .set("username", uname)
      .write();
  },
};

export default auth;
