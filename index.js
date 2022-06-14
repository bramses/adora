// read a json file and return the data
const fs = require("fs");

const readMDFile = async  (file) => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, "utf8", (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

const writeFile = async (file, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, data, (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
};

const main = async () => {

    const data = await readMDFile("test.md");

    const metadata = data.split('## Highlights')[0].split('\n').filter(line => line.length > 0);
    const title = metadata[2].split(':')[1].trim();
    const author = metadata[1].split(':')[1].trim().replace('[[', '').replace(']]', '');


    const highlights = data.split('## Highlights')[1];  
    // split on new lines
    var lines = highlights.split('\n').filter(line => line.length > 0);
    // remove any lines starting with ##
    lines = lines.filter(function(line) {
        return !line.startsWith('##');
    });
    // remove any lines that start with [[
    lines = lines.filter(function(line) {
        return !line.startsWith('- [[');
    });

    // remove - from the start of each line
    lines = lines.map(function(line) {
        return line.substring(2);
    });

    // remove "([Location" from the end of each line
    lines = lines.map(function(line) {
        return line.split('([Location')[0].trim();
    });


    console.log(lines);
    console.log(`Cite :: ${title} by ${author}`);
}

main()