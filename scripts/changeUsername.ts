import db from "../src/db";
import config from "../config.json";

const u1 = process.env.A;
const u2 = process.env.B;

const $users: any = db.get("users");
const users: string[] = Object.keys($users.value());

users.forEach(uid => {
  const stocks = $users
    .get(uid)
    .get("stock")
    .value();

  if(!stocks) return;

  if(stocks[u1] !== undefined) {
    stocks[u2] = stocks[u1];
    delete stocks[u1];
  }
  
  $users
    .get(uid)
    .set("stock", stocks)
    .write();

  if($users.get(uid).get("username").value() === u1) {
    $users.get(uid).set("username", u2).write();
  }
});

const $sales: any = db.get("sales").value();

if($sales[u1] !== undefined) {
  $sales[u2] = $sales[u1];
  delete $sales[u1];
}

db.set("sales", $sales).write();

console.log("Successfully changed username");
