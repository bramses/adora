// read a json file and return the data
const fs = require("fs");
require("dotenv").config();

const ROOT = process.env.ROOT_FOLDER;

const titlePath = (title) => {
  return ROOT + "/" + title + "/";
};

const createDir = async (title) => {
  const path = titlePath(title);
  if (!fs.existsSync(path)) {
    return new Promise((resolve, reject) => {
      fs.mkdir(path, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  }
};

const callOpenAIAPI = async (text, prompt, engine = "text-davinci-002", max_tokens = 250, best_of = 1) => {
  const response = await fetch(
    `https://api.openai.com/v1/engines/${engine}/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.apiKey}`,
        "Content-Type": "application/json",
      },
      contentType: "application/json",
      body: JSON.stringify({
        prompt: prompt,
        max_tokens: max_tokens,
        temperature: 0.3,
        best_of: best_of,
        frequency_penalty: 1.5,
      }),
    }
  );

  const responseJSON = await response.json();
  console.log(responseJSON);

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

  // remove any lines that start with - Note:
  lines = lines.filter(function (line) {
    return !line.trim().startsWith("- Note: ");
  });

  // remove - from the start of each line
  lines = lines.map(function (line) {
    return line.substring(2);
  });

  // remove "([Location" from the end of each line
  lines = lines.map(function (line) {
    return line.split("([Location")[0].trim();
  });

  // remove "([View Highlight" from the end of each line
  lines = lines.map(function (line) {
    return line.split("([View Highlight")[0].trim();
  });

  lines.forEach((line, idx) => {
    console.log(idx + ' : ' + line);
    console.log("---");
  });

  console.log(lines.length)
  console.log(`Cite :: ${title} by ${author}`);

  if (process.argv[2] === "--dry-run") {
    return;
  }
  const promises = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const promise = summaries(line);
    promises.push(promise);
  }

  const _summaries = []
  for await (const summary of promises) {
    console.log(summary);
    _summaries.push(summary);
  }

  const resEx = buildFile(
    title,
    author,
    title,
    _summaries.map((summary) => summary.title)
  );
  console.log(resEx);

  await createDir(title);
  const path = titlePath(title);
  await writeFile(path + "index.md", resEx);

  for (let i = 0; i < _summaries.length; i++) {
    const summary = _summaries[i];
    const fileName = summary.title
      .replace(":", "-")
      .replace("/", "-")
      .replace("\\", "-")
      .replace(/"/g, '')
      .trim();
    await writeFile(path + fileName + ".md", buildFrontmatter(title, author, title) + '\n\n' + summary.full);
  }
  };

  const summaries = async (originalText) => {
    const summaryPrompt = `Summarize this text into one 140 character tweet.\n\nText:\n${originalText}\n\nSummary:\n`;
    const summary = await callOpenAIAPI(originalText, summaryPrompt, "curie-instruct-beta", 140, 1);
    // await setTimeout(10000, 'summary');
    const tagsPrompt = `Summarize this text into a comma separated list of tags.\n\nText:\n${originalText}\n\nTags:\n`;
    const tags = await callOpenAIAPI(originalText, tagsPrompt, "curie-instruct-beta", 64);
    // await setTimeout(10000, 'tags');
    const titlePrompt = `Suggest a one line title for the following text.\n\nText:\n${originalText}\n\nTitle:\n`;
    const title = await callOpenAIAPI(originalText, titlePrompt, "curie-instruct-beta", 64);
    let shortTitle = title
    if (title.length > 64) {
      shortTitle = title.substring(0, 64) + "...";
    }
    shortTitle = shortTitle.replace(/\n/g, ' ');

    console.log(shortTitle);

    return {
      full: `# ${shortTitle.trim()}\n\n## Tags:\n${tags}\n\n## Summary:\n${summary}\n\n## Original Text:\n\n${originalText}`,
      title: shortTitle,
      tags: tags,
      summary: summary,
    };
};

main();

const buildFrontmatter = (title, author, readwiseLink) => {
  return `---
title: ${title}
author: ${author}
readwise: "[[${readwiseLink}]]"
---`;
};

const buildFile = (title, author, readwiseLink, highlightFilenames) => {
  const highlightLinks = highlightFilenames.map((filename) => {
    return `[[${filename
      .replace(":", "-")
      .replace("/", "-")
      .replace("\\", "-")
      .replace(/"/g, "")
      .trim()}]]`;
  });

  const md = `${buildFrontmatter(title, author, readwiseLink)}

# Cite

${title}, by ${author}
[[${readwiseLink}]]

# Highlights

${highlightLinks.join("\n")}
`;

  return md;
};
