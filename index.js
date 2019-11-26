require('dotenv').config();

const config = require(__dirname + "/config.json");

const crypto = require("crypto");
const request = require("request-promise-native");

const Discord = require('discord.js');
const client = new Discord.Client();

const dateFormat = require('dateformat');

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(__dirname + "/ext/db.json");
const db = low(adapter);

db.defaults({ users: {}, sales: [] }).write();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const helpMsgs = {
  help: config.prefix + "help",
  auth: config.prefix + "auth [codeforces username]. e.g. `" + config.prefix + "auth gamesterrex`",
  verify: config.prefix + "verify",
  list: config.prefix + "list"
}

const cache = {};
const ratings = ["newbie", "pupil", "specialist", "expert", "candidate master", "master", "international master", "grandmaster", "international grandmaster", "legendary grandmaster"]
const getVal = async username => {
  const data = JSON.parse(await request(`https://codeforces.com/api/user.info?handles=${username}`)).result[0];

  return data.rating === undefined ? 
    0 
    : 
    Math.pow(1.2, ratings.indexOf(data.rank)) * Math.max(0, data.rating) / 100;
}

client.on('message', async msg => {
  if(msg.author.bot) return;

  if (msg.content.startsWith(config.prefix)) {
    const txt = msg.content.substring(config.prefix.length);

    const cmd = txt.split(" ")[0];
    const parts = txt.split(" ").slice(1);
    
    const uid = msg.author.id;
    if(!db.get("users").has(uid).value()) {
      db.get("users").set(uid, {}).write();
    }

    const verified = db.get("users").get(uid).get("auth").value();
    
    if(cmd === "help") {
      msg.channel.send("```" + Object.values(helpMsgs).join("\n") + "\n```");
    } else if(cmd === "auth") {
      if(verified) return msg.channel.send("You've already been verified.");
      
      const uname = parts[0];
      if(!uname) return msg.channel.send(helpMsgs.auth);
      if(!/^[a-z0-9\-_\.]+$/i.test(uname)) return msg.channel.send("Username must be alphanumeric");


      const token = crypto.randomBytes(16).toString("hex");
      msg.channel.send("Please change your First Name in https://codeforces.com/settings/social to `" + token + "` . Then type `" + config.prefix + "verify`. (You can change it back after you verify).");

      db.get("users")
        .get(uid)
        .set("token", token)
        .set("username", uname)
        .write();
    } else if(cmd === "verify") {
      if(verified) return msg.channel.send("You've already been verified.");

      const uname = db.get("users").get(uid).get("username").value();
      const token = db.get("users").get(uid).get("token").value();
      if(!uname) return msg.channel.send("Please generate a token with `" + helpMsgs.auth + "` first!");

      request(`https://codeforces.com/api/user.info?handles=${uname}`, (err, res, body) => {
        const data = JSON.parse(body);
        const user = data.status === "FAILED"? undefined: data.result[0];

        if(!user) return msg.channel.send("Invalid username `" + uname + "`. Please generate a new token with " + helpMsgs.auth + ".");
        
        const age = user.lastOnlineTimeSeconds - user.registrationTimeSeconds;

        if(age < 60 * 60 * 24 * 30) return msg.channel.send("Sorry, user account is too new. Cannot be verified");

        if(user.firstName != token) {
          return msg.channel.send("Invalid token. Found `" + user.firstName + "` while expected `" + token + "`.");
        } else {
          msg.channel.send("Authenticated as " + uname + " successfully!");

          db.get("users")
          .get(uid)
          .set("auth", true)
          .set("stock", {
            [uname]: config.startingStock
          })
          .write();
        }
      });
    } else if (["list"].includes(cmd)) {
      if(verified) {
        if(cmd === "list") {
          const stocks = db.get("users").get(uid).get("stock").value();
          
          let ret = "Your Stocks: ```";
          
          for(const [name, amt] of Object.entries(stocks)) {
            const value = await getVal(name);
            ret += name + " : " + amt + " stocks each at $" + value.toFixed(2) + "\n";
          }
          ret += "\n```";

          msg.channel.send(ret);
        } else if (cmd === "sell") {
          const name = parts[0];
          const amt = parts[1];
        }
      } else {
        msg.channel.send("Please verify your codeforces account first with " + helpMsgs.auth);
      }
    } else {
      msg.channel.send("Command not found");
    }
  }
});




client.login(process.env.API_KEY);
