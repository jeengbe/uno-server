import * as https from "https";
import * as fs from "fs";
import { Game } from "./game/Game";
process.stdout.write("\x1Bc");
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("source-map-support").install();

const server = https.createServer({
  cert: fs.readFileSync("C:\\Users\\jeengbe\\XAMPP\\SSL\\server.crt"),
  key: fs.readFileSync("C:\\Users\\jeengbe\\XAMPP\\SSL\\server.key")
});

new Game(server);

const PORT = 1234;

server.listen(PORT);
console.log(`Game server started on ':${PORT}'`);
