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

app.post('/backend-api/codex/responses', (req, res) => {
  const input = Array.isArray(req.body?.input) ? req.body.input : [];
  const inputJson = JSON.stringify(input);
  const isToolScenario = /codex tool round trip/i.test(inputJson);
  const hasToolResult = input.some(item => item?.type === 'function_call_output');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  if (isToolScenario && !hasToolResult) {
    streamCodexToolCall(res, {
      name: 'get_table_schema',
      arguments: { table_name: 'Artist' },
    });
    return;
  }

  streamCodexTextResponse(
    res,
    isToolScenario
      ? 'Codex completed the tool round trip after inspecting the Artist table.'
      : 'Codex mock streamed response.'
  );
});

// POST /openrouter/v1/chat/completions
app.post('/openrouter/v1/chat/completions', (req, res) => {
  const messages = req.body.messages || [];
  const hasExecutionReviewTool = req.body.tools?.some(tool => tool?.function?.name === 'review_execution');
  if (hasExecutionReviewTool) {
    return streamToolCallResponse(res, [
      {
        name: 'review_execution',
        arguments: {
          decision: 'allow',
          reason: 'The requested test-data update is narrowly scoped and matches the inspected values.',
        },
      },
    ]);
  }


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

function createCodexResponse() {
  return {
    id: `resp_codex_mock_${Date.now()}`,
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'in_progress',
    model: 'gpt-5.6-sol',
    output: [],
  };
}

function getCodexUsage() {
  return {
    input_tokens: 10,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens: 8,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 18,
  };
}

function streamCodexTextResponse(res, content) {
  const response = createCodexResponse();
  const itemId = `msg_codex_mock_${Date.now()}`;
  const outputItem = {
    id: itemId,
    type: 'message',
    status: 'in_progress',
    role: 'assistant',
    content: [],
  };

  writeSSE(res, { type: 'response.created', sequence_number: 0, response });
  writeSSE(res, {
    type: 'response.output_item.added',
    sequence_number: 1,
    output_index: 0,
    item: outputItem,
  });
  writeSSE(res, {
    type: 'response.content_part.added',
    sequence_number: 2,
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    part: { type: 'output_text', text: '', annotations: [], logprobs: [] },
  });

  const chunks = content.match(/.{1,16}/g) || [];
  chunks.forEach((delta, index) => {
    writeSSE(res, {
      type: 'response.output_text.delta',
      sequence_number: index + 3,
      item_id: itemId,
      output_index: 0,
      content_index: 0,
      delta,
      logprobs: [],
    });
  });

  const doneSequence = chunks.length + 3;
  const completedItem = {
    ...outputItem,
    status: 'completed',
    content: [{ type: 'output_text', text: content, annotations: [], logprobs: [] }],
  };
  writeSSE(res, {
    type: 'response.output_text.done',
    sequence_number: doneSequence,
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    text: content,
    logprobs: [],
  });
  writeSSE(res, {
    type: 'response.content_part.done',
    sequence_number: doneSequence + 1,
    item_id: itemId,
    output_index: 0,
    content_index: 0,
    part: completedItem.content[0],
  });
  writeSSE(res, {
    type: 'response.output_item.done',
    sequence_number: doneSequence + 2,
    output_index: 0,
    item: completedItem,
  });
  writeSSE(res, {
    type: 'response.completed',
    sequence_number: doneSequence + 3,
    response: {
      ...response,
      status: 'completed',
      output: [completedItem],
      usage: getCodexUsage(),
    },
  });
  res.end();
}

function streamCodexToolCall(res, toolCall) {
  const response = createCodexResponse();
  const itemId = `fc_codex_mock_${Date.now()}`;
  const callId = `call_codex_mock_${++callCounter}`;
  const argumentsJson = JSON.stringify(toolCall.arguments);
  const outputItem = {
    id: itemId,
    type: 'function_call',
    status: 'in_progress',
    call_id: callId,
    name: toolCall.name,
    arguments: '',
  };

  writeSSE(res, { type: 'response.created', sequence_number: 0, response });
  writeSSE(res, {
    type: 'response.output_item.added',
    sequence_number: 1,
    output_index: 0,
    item: outputItem,
  });
  writeSSE(res, {
    type: 'response.function_call_arguments.delta',
    sequence_number: 2,
    item_id: itemId,
    output_index: 0,
    delta: argumentsJson,
  });
  writeSSE(res, {
    type: 'response.function_call_arguments.done',
    sequence_number: 3,
    item_id: itemId,
    output_index: 0,
    arguments: argumentsJson,
  });

  const completedItem = { ...outputItem, status: 'completed', arguments: argumentsJson };
  writeSSE(res, {
    type: 'response.output_item.done',
    sequence_number: 4,
    output_index: 0,
    item: completedItem,
  });
  writeSSE(res, {
    type: 'response.completed',
    sequence_number: 5,
    response: {
      ...response,
      status: 'completed',
      output: [completedItem],
      usage: getCodexUsage(),
    },
  });
  res.end();
}

const port = process.env.PORT || 3110;
app.listen(port, () => {
  console.log(`[aigwmock] AI Gateway mock server listening on port ${port}`);
});
