import express from "express";
import chalk from "chalk";
import Debug from "debug";
import morgan from "morgan";
import path from "path";
import {fileURLToPath} from 'url';

import {mainRouter} from "./src/routers/mainRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 8080; 
const app = express();
const debug = Debug("app");
const server = app.listen(PORT, () => {
    debug(`Listening on port ${chalk.green(PORT)}`); 
});


app.use(express.static(path.join(__dirname, "/public")));
app.use(morgan("tiny"));

app.set("views","./src/views");
app.set("view engine", "ejs");

app.use("/", mainRouter);
