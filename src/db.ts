import { SQL } from "bun";
import { config } from "./config";

const pg = new SQL(config.dbUrl);

export default pg;
