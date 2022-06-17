// read a json file and return the data
const fs = require("fs");
require("dotenv").config();

const callOpenAIAPI = async (text, prompt) => {
  const response = await fetch("https://api.openai.com/v1/engines/text-davinci-002/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.apiKey}`,
      "Content-Type": "application/json",
    },
    contentType: "application/json",
    body: JSON.stringify({
      prompt: prompt,
      max_tokens: 250,
      temperature: 0.3,
      best_of: 3,
    }),
  });

  const responseJSON = await response.json();
  return responseJSON.choices[0].text;
};

const readMDFile = async (file) => {
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

  const metadata = data
    .split("## Highlights")[0]
    .split("\n")
    .filter((line) => line.length > 0);
  const title = metadata[2].split(":")[1].trim();
  const author = metadata[1]
    .split(":")[1]
    .trim()
    .replace("[[", "")
    .replace("]]", "");

  const highlights = data.split("## Highlights")[1];
  // split on new lines
  var lines = highlights.split("\n").filter((line) => line.length > 0);
  // remove any lines starting with ##
  lines = lines.filter(function (line) {
    return !line.startsWith("##");
  });
  // remove any lines that start with [[
  lines = lines.filter(function (line) {
    return !line.startsWith("- [[");
  });

  // remove any lines that start with - Tags:
  lines = lines.filter(function (line) {
    return !line.trim().startsWith("- Tags: ");
  });

  // remove - from the start of each line
  lines = lines.map(function (line) {
    return line.substring(2);
  });

  // remove "([Location" from the end of each line
  lines = lines.map(function (line) {
    return line.split("([Location")[0].trim();
  });

  console.log(lines.length);
  console.log(`Cite :: ${title} by ${author}`);

  // const summary = await summaries(lines[7]);
  // console.log(summary);
};

const summaries = async (originalText) => {
  const summaryPrompt = `Summarize this text into one tweet.\n\nText:\n${originalText}\n\nSummary:\n`;
  const summary = await callOpenAIAPI(originalText, summaryPrompt);
  const tagsPrompt = `Summarize this text into a comma separated list of tags.\n\nText:\n${originalText}\n\nTags:\n`;
  const tags = await callOpenAIAPI(originalText, tagsPrompt);
  const titlePrompt = `Suggest a one line title for the following text.\n\nText:\n${originalText}\n\nTitle:\n`;
  const title = await callOpenAIAPI(originalText, titlePrompt);
  return `# ${title.trim()}\n\n## Tags:\n${tags}\n\n## Summary:\n${summary}\n\n## Original Text:\n\n${originalText}`;
};

main();
