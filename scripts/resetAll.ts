import db from "../src/db";
import config from "../config.json";

if(process.env.CONFIRMATION !== "YES") throw "Confirmation failed. Please set env CONFIRMATION=YES to proceed";

const $users: any = db.get("users");
const users: string[] = Object.keys($users.value());

users.forEach(uid => {
  const uname: string = $users.get(uid).get("username").value();

  if(uname === undefined) {
    $users.get(uid).set("auth", false).write();
    return;
  }

  $users
    .get(uid)
    .set("auth", true)
    .set("stock", {
      [uname]: config.startingStock
    })
    .set("money", 20)
    .write();
});

console.log("Successfully reset all users");