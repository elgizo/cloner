const fs = require("fs");
const { exec } = require("child_process");
const { parse } = require("node-html-parser");
const path = require("path");

let inputUrl = decodeURIComponent(process.argv[2] || "");

let outputFile = process.argv[3];

outputFile =
  outputFile &&
  path.join(__dirname, "../static", decodeURIComponent(outputFile));

let folderPath = outputFile?.split("/");
folderPath = folderPath?.slice(0, folderPath.length - 1);
folderPath = folderPath?.join("/");
console.log("\x1b[33m%s\x1b[0m", "HTML2CSS", inputUrl);
const start = async () => {
  if (inputUrl.indexOf("//") >= 0) {
    exec(
      `npm run html ${encodeURIComponent(inputUrl)}`,
      async (err, stdout, stderr) => {
        const root = parse(stdout);
        const list = root.querySelectorAll("style");
        let result = list.map((e) => e.textContent).join("\r\n");

        await fs.promises.mkdir(folderPath, { recursive: true });
        fs.writeFileSync(outputFile, result);

        exec(
          `npm run css ${encodeURIComponent(outputFile)}`,
          (err, stdout, stderr) => {
            console.log(err);
            console.log(stdout);
            console.log(stderr);
          }
        );
      }
    );
  } else {
    const root = parse(fs.readFileSync(inputUrl).toString());
    const list = root.querySelectorAll("style");
    let result = list.map((e) => e.textContent).join("\r\n");

    for (let el of list) {
      el.remove();
    }

    await fs.promises.mkdir(folderPath, { recursive: true });
    fs.writeFileSync(outputFile, result);

    exec(
      `npm run css ${encodeURIComponent(outputFile)}`,
      (err, stdout, stderr) => {
        process?.send?.(root.outerHTML);
        console.log(err);
        console.log(stdout);
        console.log(stderr);
      }
    );
  }
};

start();
