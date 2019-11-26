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

db.defaults({ users: {}, sales: {}, features: [] }).write();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

if(false) {
  const users = Object.keys(db.get("users").value());

  users.forEach(user => {
    const uname = db.get("users").get(user).get("username").value();

    if(uname === undefined) {
      db.get("users").get(user).set("auth", false).write();
      return;
    }

    db.get("users")
      .get(user)
      .set("auth", true)
      .set("stock", {
        [uname]: config.startingStock
      })
      .set("money", 20)
      .write();
  });
}

const helpMsgs = {
  help: config.prefix + "help",
  auth: config.prefix + "auth [codeforces username]. e.g. `" + config.prefix + "auth gamesterrex`",
  verify: config.prefix + "verify",
  list: config.prefix + "list | Lists what stocks you own",
  sales: config.prefix + "sales | List what stocks you can purchase",
  sell: config.prefix + "sell [stock] [amt] | Sell [amt] of [stock]",
  buy: config.prefix + "buy [stock] [amt]",
  resetCache: config.prefix + "resetcache | Resets the cache. You should run this after a contest to see updated rating values"
}

let cache = {};
const ratings = ["newbie", "pupil", "specialist", "expert", "candidate master", "master", "international master", "grandmaster", "international grandmaster", "legendary grandmaster"];
const getVal = async username => {
  if(cache[username]) return cache[username];

  const data = JSON.parse(await request(`https://codeforces.com/api/user.info?handles=${username}`)).result[0];

  cache[username] = data.rating === undefined ? 
    0 
    : 
    Math.pow(1.2, ratings.indexOf(data.rank)) * Math.max(0, data.rating) / 100;

  return cache[username];
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
    } else if(cmd === "resetcache") {
      cache = {};
      msg.channel.send("Successfully reset rating cache");
    } else if (cmd === "feature") {
      if(msg.author.id === "292493700427415554" || msg.author.id === "530157531314520066") return msg.channel.send(":(");
      console.log(msg.author.id + " just did a feature request");
      const msgs = parts.join(" ");

      db.get("features")
        .push(msgs)
        .write();

      msg.channel.send("Feature request saved. Alternatively, make a pull request at https://github.com/chen-robert/nimbus (or shoot me a star :P)");
    }else if (cmd === "auth") {
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
          .set("money", 20)
          .write();
        }
      });
    } else if (["list", "sell", "sales", "buy"].includes(cmd)) {
      if(verified) {
        const stocks = db.get("users").get(uid).get("stock").value();
        const bal = db.get("users").get(uid).get("money").value();
        if(cmd === "list") {
          let ret = "Your Money: `$" + bal.toFixed(2) + "`";
          ret += "\nYour Stocks: ```";
          
          for(const [name, amt] of Object.entries(stocks)) {
            const value = await getVal(name);
            ret += name + " : " + amt + " stocks each at $" + value.toFixed(2) + "\n";
          }
          ret += "\n```";

          msg.channel.send(ret);
        } else if (cmd === "sell") {
          const name = parts[0];
          const amt = Math.floor(+parts[1]);

          if(!name || !amt) return msg.channel.send(helpMsgs.sell);

          if(!stocks[name]) return msg.channel.send("Error, you currently do not own any stock of type " + name);
          
          const curr = stocks[name];
          if(curr < amt) return msg.channel.send("Error, you only have " + curr + " stocks");
          if(amt <= 0) return msg.channel.send("You can't sell " + amt + " stock");
          
          const value = await getVal(name);
          db.get("users").get(uid).get("stock").set(name, curr - amt).write();
          db.get("users").get(uid).set("money", value * amt + bal).write();
          
          if(!db.get("sales").has(name).value()) db.get("sales").set(name, 0).write();

          db.get("sales").set(name, db.get("sales").get(name).value() + amt).write();

          return msg.channel.send("Successfully sold `" + amt + "` of stock `" + name + "`");
        } else if(cmd === "sales") {
          let ret = "Stock Availble:\n```";
          for(const [name, amt] of Object.entries(db.get("sales").value())) {
            if(amt === 0) continue;

            const value = await getVal(name);
            ret += name + " : " + amt + " each at $" + value.toFixed(2) + "\n";
          }
          ret += "\n```";

          return msg.channel.send(ret);
        } else if(cmd === "buy") {
          const name = parts[0];
          const amt = Math.floor(+parts[1]);

          const sales = db.get("sales").value();

          if(!name || !amt) return msg.channel.send(helpMsgs.buy);
          if(amt <= 0) return msg.channel.send("You can't sell " + amt + " stock");
          if(!sales[name]) return msg.channel.send("Error, no stock of type " + name + " is currently for sale");

          const curr = sales[name];

          const value = await getVal(name);
          if(curr < amt) return msg.channel.send("Error, only " + curr + " stocks for sale");
          if(value * amt > bal) return msg.channel.send("You cannot afford to purchase this much stock");

          const currStockAmt = db.get("users").get(uid).get("stock").get(name).value() || 0;
          db.get("users").get(uid).get("stock").set(name, currStockAmt + amt).write();
          db.get("users").get(uid).set("money", bal - value * amt).write();

          db.get("sales").set(name, curr - amt).write();

          return msg.channel.send("Successfully purchased `" + amt + "` of stock `" + name + "`");
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
