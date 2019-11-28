import FileSync from "lowdb/adapters/FileSync";
import low from "lowdb";

const adapter = new FileSync(__dirname + "/ext/db.json");
const db = low(adapter);

export default db;