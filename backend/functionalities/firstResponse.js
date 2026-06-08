import jira from "../config/jiraClient.js";

// 📝 1. Add Public Comment
async function addPublicComment(issueKey) {
  const message = `Thank you for raising the ticket. We have reviewed the initial details and will begin the assessment shortly.
We will keep you updated on the progress and reach out if any further information is required.
Please feel free to share any additional context or attachments that might help with the resolution.`;

  await jira.post(`/rest/api/3/issue/${issueKey}/comment`, {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: message }],
        },
      ],
    },
    properties: [
      {
        key: "sd.public.comment",
        value: { internal: false },
      },
    ],
  });

  console.log(`💬 Public comment added → ${issueKey}`);
}

// 👤 2. Assign Ticket
async function assignIssue(issueKey) {
  await jira.put(
    `/rest/api/3/issue/${issueKey}/assignee`,
    {
      // accountId: process.env.ASSIGNEE_ACCOUNT_ID_GNANA,
      accountId: process.env.ASSIGNEE_ACCOUNT_ID,
    }
  );

  console.log(`👤 Assigned to PRANAY → ${issueKey}`);
}

// 🔄 3. Move Ticket to In Queue
async function moveToInQueue(issueKey) {
  const { data } = await jira.get(
    `/rest/api/3/issue/${issueKey}/transitions`
  );

  const transition = data.transitions.find(
    t => t.to.name === "In Queue"
  );

  if (!transition) {
    console.log(`⚠️ No 'In Queue' transition for ${issueKey}`);
    return;
  }

  await jira.post(
    `/rest/api/3/issue/${issueKey}/transitions`,
    {
      transition: { id: transition.id },
    }
  );

  console.log(`🔄 Moved to In Queue → ${issueKey}`);
}



// 🚀 4. Main Processor
async function processTicket(issueKey) {
  console.log(`🚀 Processing ${issueKey}`);
  // console.log(`No mutations`);
  // return; 
  try {
    console.log(`🚀 Processing ${issueKey}`);

    await assignIssue(issueKey);
    await addPublicComment(issueKey);
    await moveToInQueue(issueKey);

    console.log(`✅ Done → ${issueKey}`);
  } catch (err) {
    console.error(
      `❌ Failed for ${issueKey}:`,
      err.response?.data || err.message
    );
  }
}

export { processTicket };
