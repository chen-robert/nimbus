import db from "../src/db";
import config from "../config.json";


const users: string[] = Object.keys(db.get("users").value());

users.forEach(uid => {
  const uname: string = db.get("users").get(uid).get("username").value();

  if(uname === undefined) {
    db.get("users").get(uid).set("auth", false).write();
    return;
  }

  db.get("users")
    .get(uid)
    .set("auth", true)
    .set("stock", {
      [uname]: config.startingStock
    })
    .set("money", 20)
    .write();
});