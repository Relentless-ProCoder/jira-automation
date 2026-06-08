import express from "express";
import jira from "../config/jiraClient.js";
import { processTicket } from "../functionalities/firstResponse.js";
import axios from "axios";

const router = express.Router();

// 🧠 In-memory processed ticket cache
const processedTickets = new Set();

// Team mapping (easy to extend later)
const teams = {
  ecds: "EU Central Data Support",
  all: "All Teams",
};


async function sendMessageToChatApp(chatId, message) {
  try {
    await axios.post("http://localhost:3000/api/v1/chat/external/message", {
      chatId,
      content: message,
      senderName: "Jira Bot",
    }, {
      headers: {
        "x-api-key": "mysecretkey"
      }
    });

    console.log("Message sent to chat app");
  } catch (error) {
    console.error("Error sending message to chat app:", error.message);
  }
}

//  Fetch new tickets for a team and send to chat app
async function getNewTickets(teamKey) {
  const teamName = teams[teamKey];
  if (!teamName) throw new Error("Invalid team name");

  // const jql =
  //   teamKey === "all"
  //     ? `
  //       project = SD
  //       AND status = "Waiting for Support"
  //       AND created >= -300m
  //       ORDER BY created DESC
  //     `
  //     : `
  //       project = SD
  //       AND status = "Waiting for Support"
  //       AND "Assigned Team" = "${teamName}"
  //       AND created >= -300m
  //       ORDER BY created DESC
  //     `;

const jql =
`
    project = SD
    AND "Assigned Team" = "${teamName}"
    AND created >= -300m
    AND priority != "Critical"
    AND issuetype != "Incident"
    AND assignee IS EMPTY
    ORDER BY created DESC
  `;
/*
const jql =
teamKey === "all"
  ? `
    project = SD
    AND status = "Waiting for Support"
    AND created >= -300m
    AND priority != "Critical"
    AND issuetype != "Incident"
    AND assignee IS EMPTY
    ORDER BY created DESC
  `
  : `
    project = SD
    AND status = "Waiting for Support"
    AND "Assigned Team" = "${teamName}"
    AND created >= -300m
    AND priority != "Critical"
    AND issuetype != "Incident"
    AND assignee IS EMPTY
    ORDER BY created DESC
  `;
  */
  const { data } = await jira.get("/rest/api/3/search/jql", {
    params: {
      jql,
      fields: "key,created",
      maxResults: 5,
    },
  });

  const ticketKeys = data.issues.map(issue => issue.key);

  // 🔥 SEND TO CHAT APP
  if (ticketKeys.length > 0) {
    const formattedMessage = `🎫 New Tickets:\n${ticketKeys.join("\n")}`;

    await sendMessageToChatApp(
      "69a6b671912cf60cb10282e6", // your chatId
      formattedMessage
    );
  }

  return ticketKeys;
}


/**
 * Core handler
 * mutate = false → GET (dry-run)
 * mutate = true  → POST (real execution)
 */
async function handleTickets(teamKey, { mutate }) {
  const tickets = await getNewTickets(teamKey);
  const processedNow = [];

  for (const issueKey of tickets) {
    if (processedTickets.has(issueKey)) continue;

    if (mutate) {
        console.log(`Processing ${issueKey} with mutations...`);
      processedTickets.add(issueKey);
      await processTicket(issueKey); // 🔥 mutation only for POST
    }

    processedNow.push(issueKey);

    // 🧯 Jira rate-limit safety
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    found: tickets.length,
    processed: processedNow,
  };
}

/**
 * GET → SAFE (no mutations)
 * Preview / dry-run
 */
router.get("/:teamName", async (req, res) => {
  try {
    const result = await handleTickets(req.params.teamName, {
      mutate: false,
    });

    res.json({
      mode: "dry-run",
      message: "Ticket check complete (no mutations)",
      ...result,
    });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST → MUTATING
 * Real execution
 */
router.post("/:teamName", async (req, res) => {
  try {
    const result = await handleTickets(req.params.teamName, {
      mutate: true,
    });

    res.json({
      mode: "execute",
      message: "Tickets processed successfully",
      ...result,
    });
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

export { handleTickets };
