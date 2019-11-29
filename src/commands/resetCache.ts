import Command from "./command";
import { Message } from "discord.js";
import { resetCache } from "../getVal";

const reset: Command = {
  cmd: "resetcache",
  params: "",
  desc: "esets the rating cache",
  requiresAuth: false,
  resolve: (parts: string[], msg: Message) => {
    resetCache();
    msg.channel.send("Successfully reset rating cache");
  },
};

export default reset;
