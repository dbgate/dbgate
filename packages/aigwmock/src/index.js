const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const responses = JSON.parse(fs.readFileSync(path.join(__dirname, 'mockResponses.json'), 'utf-8'));

let callCounter = 0;

// GET /openrouter/v1/models
app.get('/openrouter/v1/models', (req, res) => {
  res.json({
    data: [{ id: 'mock-model', name: 'Mock Model' }],
    preferredModel: 'mock-model',
  });
});

// POST /openrouter/v1/chat/completions
app.post('/openrouter/v1/chat/completions', (req, res) => {
  const messages = req.body.messages || [];

  // Find the first user message (skip system messages)
  const userMessage = messages.find(m => m.role === 'user');
  if (!userMessage) {
    return streamTextResponse(res, "I don't have enough context to help. Please ask a question.");
  }

  // Count assistant messages to determine the current step
  const assistantCount = messages.filter(m => m.role === 'assistant').length;

  // Find matching scenario by regex
  const scenario = responses.scenarios.find(s => {
    const regex = new RegExp(s.match, 'i');
    return regex.test(userMessage.content);
  });

  if (!scenario) {
    console.log(`[aigwmock] No scenario matched for: "${userMessage.content}"`);
    return streamTextResponse(res, "I'm a mock AI assistant. I don't have a prepared response for that question.");
  }

  const step = scenario.steps[assistantCount];
  if (!step) {
    console.log(`[aigwmock] No more steps for scenario (step ${assistantCount})`);
    return streamTextResponse(res, "I've completed my analysis of this topic.");
  }

  console.log(`[aigwmock] Scenario matched: "${scenario.match}", step ${assistantCount}, type: ${step.type}`);

  if (step.type === 'tool_calls') {
    return streamToolCallResponse(res, step.tool_calls);
  } else {
    return streamTextResponse(res, step.content);
  }
});

function streamTextResponse(res, content) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const id = `chatcmpl-mock-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  // Split content into chunks for realistic streaming
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.substring(i, i + chunkSize));
  }

  // Send initial role chunk
  writeSSE(res, {
    id,
    object: 'chat.completion.chunk',
    created,
    model: 'mock-model',
    choices: [{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }],
  });

  // Send content chunks
  for (const chunk of chunks) {
    writeSSE(res, {
      id,
      object: 'chat.completion.chunk',
      created,
      model: 'mock-model',
      choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
    });
  }

  // Send finish
  writeSSE(res, {
    id,
    object: 'chat.completion.chunk',
    created,
    model: 'mock-model',
    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
  });

  res.write('data: [DONE]\n\n');
  res.end();
}

function streamToolCallResponse(res, toolCalls) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const id = `chatcmpl-mock-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i];
    const callId = `call_mock_${++callCounter}`;
    const args = JSON.stringify(tc.arguments);

    if (i === 0) {
      // First tool call: include role
      writeSSE(res, {
        id,
        object: 'chat.completion.chunk',
        created,
        model: 'mock-model',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: null,
              tool_calls: [{ index: i, id: callId, type: 'function', function: { name: tc.name, arguments: '' } }],
            },
            finish_reason: null,
          },
        ],
      });
    } else {
      // Additional tool calls
      writeSSE(res, {
        id,
        object: 'chat.completion.chunk',
        created,
        model: 'mock-model',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [{ index: i, id: callId, type: 'function', function: { name: tc.name, arguments: '' } }],
            },
            finish_reason: null,
          },
        ],
      });
    }

    // Stream the arguments
    writeSSE(res, {
      id,
      object: 'chat.completion.chunk',
      created,
      model: 'mock-model',
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [{ index: i, function: { arguments: args } }],
          },
          finish_reason: null,
        },
      ],
    });
  }

  // Send finish with tool_calls reason
  writeSSE(res, {
    id,
    object: 'chat.completion.chunk',
    created,
    model: 'mock-model',
    choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
  });

  res.write('data: [DONE]\n\n');
  res.end();
}

function writeSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const port = process.env.PORT || 3110;
app.listen(port, () => {
  console.log(`[aigwmock] AI Gateway mock server listening on port ${port}`);
});
