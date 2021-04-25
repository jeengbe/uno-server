import * as https from "https";
import * as fs from "fs";
import * as chalk from "chalk";
import { Game } from "./game/Game";
import { CardHelper } from "./game/CardHelper";

process.stdout.write("\x1Bc");
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("source-map-support").install();

const port = 1234;

const server = https.createServer({
  cert: fs.readFileSync("C:\\Users\\jeengbe\\XAMPP\\SSL\\server.crt"),
  key: fs.readFileSync("C:\\Users\\jeengbe\\XAMPP\\SSL\\server.key")
});

server.listen(port);
console.log(chalk.bold(`Server started on port ${port}`));

new Game(server);