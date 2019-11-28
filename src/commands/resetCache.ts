import config from "../../config.json";
import Command from "./command";
import {Message} from "discord.js";
const {resetCache} = require("./src/getVal");

const reset: Command = {
  cmd: "resetcache",
  helpMsg: config.prefix + "resetcache | Resets the rating cache",
  requiresAuth: false,
  resolve: (parts: string[], msg: Message)=> {
    resetCache();
    msg.channel.send("Successfully reset rating cache");
  }
}

export default reset;