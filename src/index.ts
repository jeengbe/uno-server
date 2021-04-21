import * as https from "https";
import * as fs from "fs";
import * as chalk from "chalk";
import { Game } from "./game/Game";

process.stdout.write("\x1Bc");
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("source-map-support").install();


// Testing play vailidation engine
// console.log(CardHelper.isValidPlay(
//   false,
//   CardHelper.buildCard(CardHelper.Color.RED, CardHelper.Value.ACTION_CHANGE_COLOR),
//   0,
//   [
//     CardHelper.buildCard(CardHelper.Color.GREEN, CardHelper.Value.ACTION_CHANGE_COLOR),
//     CardHelper.buildCard(CardHelper.Color.GREEN, CardHelper.Value.ACTION_CHANGE_COLOR),
//     CardHelper.buildCard(CardHelper.Color.GREEN, CardHelper.Value.ACTION_CHANGE_COLOR),
//     CardHelper.buildCard(CardHelper.Color.GREEN, CardHelper.Value.ACTION_PLUS_TWO),
//     CardHelper.buildCard(CardHelper.Color.GREEN, CardHelper.Value.ACTION_PLUS_TWO),
//     CardHelper.buildCard(CardHelper.Color.GREEN, CardHelper.Value.ACTION_CHANGE_COLOR),
//   ]
// ));
//
// process.exit(0);

const port = 1234;

const server = https.createServer({
  cert: fs.readFileSync("C:\\Users\\jeengbe\\XAMPP\\SSL\\server.crt"),
  key: fs.readFileSync("C:\\Users\\jeengbe\\XAMPP\\SSL\\server.key")
});

server.listen(port);
console.log(chalk.bold(`Server started on port ${port}`));

new Game(server);