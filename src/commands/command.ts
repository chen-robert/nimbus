import {Message} from "discord.js";

interface Command {
  cmd: string;
  helpMsg: string;
  requiresAuth: boolean;
  resolve(parts: string[], msg: Message): void;  
}


export default Command;