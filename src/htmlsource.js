const fs = require("fs");
const util = require("util");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { fork } = require("child_process");
const { Builder } = require("selenium-webdriver");

const inputUrl = process.argv[2];
let outputFile = process.argv[3];

outputFile = outputFile && path.join(__dirname, "../static", outputFile);
let folderPath = outputFile?.split("/");
folderPath = folderPath?.slice(0, folderPath.length - 1);
folderPath = folderPath?.join("/");

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

const start = async (url) => {
  inputUrl && console.log(url);
  let driver = await new Builder().forBrowser("safari").build();
  await driver.get(url);
  await sleep(process.env.WAIT_SECOND);
  let source = await driver.getPageSource();
  await driver.close();

  outputFile && (await fs.promises.mkdir(folderPath, { recursive: true }));
  source = "<!DOCTYPE html>" + source;

  let ps = fork(`./src/html-beautifier`);
  ps.send(source);
  ps.on("message", async (data) => {
    process?.send?.(data);
    if (outputFile) await fs.promises.writeFile(outputFile, data);
    ps.kill();
  });
};

inputUrl && start(inputUrl);
process.on("message", (url) => {
  start(url);
});
