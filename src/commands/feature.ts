import db from "../db";

import Command from "./command";
import { Message } from "discord.js";

const feature: Command = {
  cmd: "feature",
  params: "[Strings]",
  desc: "Request a new feature",
  requiresAuth: false,
  resolve: (parts: string[], msg: Message) => {
    const request: string = parts.join(" ").trim();

    if (request.length !== 0 && !db.get("features").value().includes(request)) {
      (db.get("features") as any).push(request).write();
      msg.channel.send(
      "Feature request saved. Alternatively, make a pull request at https://github.com/chen-robert/nimbus (or shoot me a star :P)",
      );
    }
  },
};

export default feature;
