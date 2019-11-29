import { Message } from "discord.js";
import crypto from "crypto";

import db from "../db";
import Command from "./command";
import AuthType from "./authType";
import { getUserValue } from "../util";

const leaderboard: Command = {
  cmd: "leaderboard",
  params: "",
  desc: "Displays leaderboard information",
  authType: AuthType.NOT_REQUIRED,
  resolve: async (parts: string[], msg: Message) => {
    const users = db.get("users").value();

    const list = [];
    for (const uid of Object.keys(users)) {
      if(!users[uid].auth) continue;

      const value = await getUserValue(uid);

      list.push({
        uid,
        value,
      });
    }

    const val = list
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(({ uid, value }, i) => {
        return `#${i + 1} ${users[uid].username} | ${value.toFixed(2)}`;
      })
      .join("\n");

    msg.channel.send(`\`\`\`\n${val}\n\`\`\``);
  },
};

export default leaderboard;
