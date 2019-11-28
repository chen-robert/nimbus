import FileSync from "lowdb/adapters/FileSync";
import low from "lowdb";

const adapter = new FileSync(`${__dirname}/../ext/db.json`);
const db = low(adapter);

db.defaults({ users: {}, sales: {}, features: [] }).write();

export default db;
