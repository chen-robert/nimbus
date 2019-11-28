import { Message } from "discord.js";

interface Command {
  cmd: string;
  params: string;
  desc: string;
  requiresAuth: boolean;
  resolve(parts: string[], msg: Message): void;
}

export default Command;
