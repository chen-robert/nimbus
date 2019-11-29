import { Message } from "discord.js";
import AuthType from "./authType";

interface Command {
  cmd: string;
  params: string;
  desc: string;
  authType: AuthType;
  resolve(parts: string[], msg: Message): void;
}

export default Command;
