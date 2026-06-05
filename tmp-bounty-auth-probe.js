const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET || "fallback_secret";
const token = jwt.sign({ userId: "22", role: "service" }, secret, { expiresIn: "1h" });

const urls = [
  "http://localhost:8081/api/v1/bounty-hall/tasks",
  "http://localhost:8081/api/v1/bounty-hall/my/published",
  "http://localhost:8081/api/v1/bounty-hall/my/claimed",
];

async function main() {
  for (const url of urls) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    console.log(`URL=${url}`);
    console.log(`STATUS=${response.status}`);
    console.log(text);
    console.log("---");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
