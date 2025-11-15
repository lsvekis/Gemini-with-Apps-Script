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

function onOpen() {
  DocumentApp.getUi()
    .createMenu('AI Tools')
    .addItem('Summarize selection with Gemini', 'summarizeSelectionWithGemini')
    .addToUi();
}

/**
 * Summarize the current selection in a Google Doc.
 */
function summarizeSelectionWithGemini() {
  const doc = DocumentApp.getActiveDocument();
  const selection = doc.getSelection();
  if (!selection) {
    DocumentApp.getUi().alert('Please select some text first.');
    return;
  }

  // Collect selected text
  let text = '';
  const elements = selection.getRangeElements();
  elements.forEach(function(el) {
    if (el.getElement().editAsText) {
      const t = el.getElement().editAsText()
        .getText()
        .substring(el.getStartOffset(), el.getEndOffsetInclusive() + 1);
      text += t + '\n';
    }
  });

  const prompt =
    'Summarize the following text for a beginner in 3–5 bullet points:\n\n' +
    text;

  const summary = callGemini_(prompt);

  // Append summary at end of doc
  const body = doc.getBody();
  body.appendParagraph('---');
  body.appendParagraph('Gemini summary:');
  body.appendParagraph(summary);
}
