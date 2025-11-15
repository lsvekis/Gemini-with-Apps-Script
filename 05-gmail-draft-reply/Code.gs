function getGeminiApiKey_() {
  const scriptProps = PropertiesService.getScriptProperties();
  const key = scriptProps.getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set in Script Properties.');
  }
  return key;
}

/**
 * Core helper: call Gemini with a text prompt and get back a string.
 *
 * @param {string} prompt The user prompt to send to Gemini.
 * @param {string} [modelId] Optional model ID, defaults to gemini-2.5-flash.
 * @returns {string} The plain text response from Gemini.
 */
function callGemini_(prompt, modelId) {
  modelId = modelId || 'gemini-2.5-flash';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  const apiKey = getGeminiApiKey_();

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': apiKey
    },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code !== 200) {
    // Log for debugging and throw an error
    console.error('Gemini error', code, text);
    throw new Error('Gemini API error: ' + code + ' ' + text);
  }

  const data = JSON.parse(text);

  // Basic extraction of first candidate text
  const candidates = data.candidates || [];
  if (!candidates.length) {
    return '';
  }
  const parts = candidates[0].content?.parts || [];
  const resultText = parts.map(p => p.text || '').join('');
  return resultText;
}

/**
 * Draft a reply to the most recent email in your inbox using Gemini.
 * This is a simple demo for beginners.
 */
function draftReplyWithGemini() {
  const threads = GmailApp.getInboxThreads(0, 1); // newest thread
  if (!threads.length) {
    Logger.log('No threads in inbox.');
    return;
  }

  const thread = threads[0];
  const messages = thread.getMessages();
  const last = messages[messages.length - 1];

  const sender = last.getFrom();
  const subject = last.getSubject();
  const body = last.getPlainBody().slice(0, 2000); // keep it short for demo
  const prompt =
    'You are a polite and concise assistant. Read the email below and write a friendly, professional reply.\n\n' +
    'Subject: ' + subject + '\n' +
    'From: ' + sender + '\n\n' +
    body;

  const replyText = callGemini_(prompt);

  // Create a draft in the same thread
  const draftSubject = 'Re: ' + subject;
  GmailApp.createDraft(sender, draftSubject, replyText, { inReplyTo: last.getId() });

  Logger.log('Draft created. Check Gmail drafts.');
}
