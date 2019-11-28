require("dotenv").config();

const config = require(__dirname + "/config.json");

const crypto = require("crypto");
const request = require("request-promise-native");

const { getVal } = require("./src/getVal");

const commands = {
  feature: require("./src/commands/feature").default,
  resetCache: require("./src/commands/resetCache").default,
  auth: require("./src/commands/auth").default,
};

const Discord = require("discord.js");
const client = new Discord.Client();

const db = require("./src/db").default;

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const helpMsgs = {
  help: config.prefix + "help",
  toggle: config.prefix + "toggle | Toggle ability to trade (admin only)",
  auth: config.prefix + "auth [codeforces username]. e.g. `" + config.prefix + "auth gamesterrex`",
  verify: config.prefix + "verify",
  list: config.prefix + "list | Lists what stocks you own",
  sales: config.prefix + "sales | List what stocks you can purchase",
  sell: config.prefix + "sell [stock] [amt] | Sell [amt] of [stock]",
  buy: config.prefix + "buy [stock] [amt]",
  resetCache:
    config.prefix + "resetcache | Resets the cache. You should run this after a contest to see updated rating values",
};

let trading = true;

client.on("message", async msg => {
  if (msg.author.bot) return;

  if (msg.content.startsWith(config.prefix)) {
    const txt = msg.content.substring(config.prefix.length);

    const cmd = txt.split(" ")[0];
    const parts = txt.split(" ").slice(1);

    const uid = msg.author.id;
    if (
      !db
        .get("users")
        .has(uid)
        .value()
    ) {
      console.log("Writing");
      db.get("users")
        .set(uid, {})
        .write();
    }

    const verified = db
      .get("users")
      .get(uid)
      .get("auth")
      .value();

    if (cmd === "help") {
      msg.channel.send("```" + Object.values(helpMsgs).join("\n") + "\n```");
    } else if (cmd === "resetcache") commands.resetCache.resolve(parts, msg);
    else if (cmd === "toggle") {
      if (msg.member.roles.find("name", "Admin")) {
        trading = !trading;
        msg.channel.send(trading ? "Trading is now activated" : "Trading is now deactivated");
      } else msg.channel.send("No permission. Admin role required");
    } else if (cmd === "feature") {
      commands.feature.resolve(parts, msg);
    } else if (cmd === "auth") {
      if (verified) return msg.channel.send("You've already been verified.");

      commands.auth.resolve(parts, msg);
    } else if (cmd === "verify") {
      if (verified) return msg.channel.send("You've already been verified.");

      const uname = db
        .get("users")
        .get(uid)
        .get("username")
        .value();
      const token = db
        .get("users")
        .get(uid)
        .get("token")
        .value();
      if (!uname) return msg.channel.send("Please generate a token with `" + helpMsgs.auth + "` first!");

      request(`https://codeforces.com/api/user.info?handles=${uname}`, (err, res, body) => {
        const data = JSON.parse(body);
        const user = data.status === "FAILED" ? undefined : data.result[0];

        if (!user)
          return msg.channel.send(
            "Invalid username `" + uname + "`. Please generate a new token with " + helpMsgs.auth + ".",
          );

        const age = user.lastOnlineTimeSeconds - user.registrationTimeSeconds;

        if (age < 60 * 60 * 24 * 30) return msg.channel.send("Sorry, user account is too new. Cannot be verified");

        if (user.firstName != token) {
          return msg.channel.send("Invalid token. Found `" + user.firstName + "` while expected `" + token + "`.");
        } else {
          msg.channel.send("Authenticated as " + uname + " successfully!");

          db.get("users")
            .get(uid)
            .set("auth", true)
            .set("stock", {
              [uname]: config.startingStock,
            })
            .set("money", 20)
            .write();
        }
      });
    } else if (["list", "sell", "sales", "buy"].includes(cmd)) {
      if (verified) {
        const stocks = db
          .get("users")
          .get(uid)
          .get("stock")
          .value();
        const sales = db.get("sales").value();
        const bal = db
          .get("users")
          .get(uid)
          .get("money")
          .value();
        if (cmd === "list") {
          let ret = "Your Money: `$" + bal.toFixed(2) + "`";
          ret += "\nYour Stocks: ```";

          for (const [name, amt] of Object.entries(stocks)) {
            if (amt === 0) continue;

            const value = await getVal(name);
            ret += name + " : " + amt + " stocks each at $" + value.toFixed(2) + "\n";
          }
          ret += "\n```";

          msg.channel.send(ret);
        } else if (cmd === "sell") {
          if (!trading) return msg.channel.send("Trading is currently deactivated");

          const name = parts[0];
          const amt = Math.floor(+parts[1]);

          if (!name || !amt) return msg.channel.send(helpMsgs.sell);

          if (!stocks[name]) return msg.channel.send("Error, you currently do not own any stock of type " + name);

          const curr = stocks[name];
          if (curr < amt) return msg.channel.send("Error, you only have " + curr + " stocks");
          if (amt <= 0) return msg.channel.send("You can't sell " + amt + " stock");

          const value = await getVal(name);

          const stock = db
            .get("users")
            .get(uid)
            .get("stock")
            .value();
          stock[name] = curr - amt;
          db.get("users")
            .set("stock", stock)
            .write();

          db.get("users")
            .get(uid)
            .set("money", value * amt + bal)
            .write();

          if (!sales[name]) sales[name] = 0;
          sales[name] += amt;

          db.set("sales", sales).write();

          return msg.channel.send("Successfully sold `" + amt + "` of stock `" + name + "`");
        } else if (cmd === "sales") {
          let ret = "Stock Availble:\n```";
          console.log(db.get("sales").value());
          for (const [name, amt] of Object.entries(db.get("sales").value())) {
            if (amt === 0) continue;
            console.log(name);

            const value = await getVal(name);
            ret += name + " : " + amt + " each at $" + value.toFixed(2) + "\n";
          }
          ret += "\n```";

          return msg.channel.send(ret);
        } else if (cmd === "buy") {
          if (!trading) return msg.channel.send("Trading is currently deactivated");

          const name = parts[0];
          const amt = Math.floor(+parts[1]);

          if (!name || !amt) return msg.channel.send(helpMsgs.buy);
          if (amt <= 0) return msg.channel.send("You can't sell " + amt + " stock");
          if (!sales[name]) return msg.channel.send("Error, no stock of type " + name + " is currently for sale");

          const curr = sales[name];

          const value = await getVal(name);
          if (curr < amt) return msg.channel.send("Error, only " + curr + " stocks for sale");
          if (value * amt > bal) return msg.channel.send("You cannot afford to purchase this much stock");

          const stock = db
            .get("users")
            .get(uid)
            .get("stock")
            .value();
          if (!stock[name]) stock[name] = 0;
          stock[name] += amt;
          db.get("users")
            .get(uid)
            .set("stock", stock)
            .write();

          db.get("users")
            .get(uid)
            .set("money", bal - value * amt)
            .write();

          sales[name] = curr - amt;
          db.set("sales", sales).write();

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
