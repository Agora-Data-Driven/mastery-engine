/**
 * MASTERY ENGINE 3.3.0 - FULL BACKEND (WITH TRACKS & SPACED REPETITION)
 */

// NOTE: legacy Apps Script reference only (not deployed). The original hardcoded
// key was removed before publishing and must be rotated — set it via script
// properties / Secret Manager, never inline. See README.
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
const MODEL_NAME = "gemini-3-flash-preview"; 

// COLUMN INDICES (0-based)
const COL_TRACK = 0;    // A (New!)
const COL_COURSE = 1;   // B
const COL_LESSON = 2;   // C
const COL_TOPIC = 3;    // D
const COL_PRIORITY = 8; // I (Make sure this matches your Priority column in Skill Mastery!)

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Mastery AI Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Fetches full data from the Skill Mastery sheet */
function getMasteryData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Skill Mastery");
    if (!sheet) return "ERROR: Sheet 'Skill Mastery' not found";
    const data = sheet.getDataRange().getValues();
    return (data.length < 2) ? [] : data.slice(1).map(row => row.map(cell => cell.toString().trim()));
  } catch (e) { return "ERROR: " + e.message; }
}

/** Packages questions with metadata (Shuffle removed so we can control order) */
function packageQuestions(pool, masteryData, count) {
  if (pool.length === 0) return [];
  
  return pool.slice(0, count).map(q => {
    const meta = masteryData.find(m => m[COL_TOPIC] === q[0]) || ["Unknown Track", "Unknown Course", "Unknown Lesson", q[0]];
    return {
      track: meta[COL_TRACK],
      course: meta[COL_COURSE],
      lesson: meta[COL_LESSON],
      topic: q[0], 
      question: q[1], 
      options: q[2].toString().split("|").map(o => o.trim()), 
      answer: q[3].toString().trim() 
    };
  });
}

/** Global Weakest Topics with Randomized Tie-breaker */
function handlePriorityQuiz(count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masteryData = getMasteryData();
  const bankData = ss.getSheetByName("Question Bank").getDataRange().getValues().slice(1);
  
  let sortedTopics = masteryData
    .filter(r => r[COL_TOPIC] !== "" && !isNaN(parseFloat(r[COL_PRIORITY])))
    .sort((a, b) => {
      const diff = parseFloat(b[COL_PRIORITY]) - parseFloat(a[COL_PRIORITY]);
      return diff !== 0 ? diff : Math.random() - 0.5;
    })
    .slice(0, 15).map(r => r[COL_TOPIC]);

  // Shuffle the targeted questions before packaging
  let targetedQuestions = bankData.filter(r => sortedTopics.includes(r[0])).sort(() => Math.random() - 0.5);
  return packageQuestions(targetedQuestions, masteryData, count);
}

/** Smart Selection: Cascades down, ranks by priority, and serves UNSEEN questions first */
function handleQuizSelection(track, course, lesson, topic, count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bankData = ss.getSheetByName("Question Bank").getDataRange().getValues().slice(1);
  const masteryData = getMasteryData();
  
  // 1. GET SEEN QUESTIONS FROM QUIZ LOG
  let seenQuestions = new Set();
  const logSheet = ss.getSheetByName("Quiz Log");
  if (logSheet) {
    const logData = logSheet.getDataRange().getValues().slice(1);
    // Column index 5 (F) is the 'Question' column in your logFinalResults order
    logData.forEach(row => {
      if (row[5]) seenQuestions.add(row[5].toString().trim());
    });
  }

  // 2. FILTER TOPICS BY USER SELECTION
  let scope = masteryData;
  if (topic && topic !== "Review All" && topic !== "-- N/A --") {
    scope = scope.filter(r => r[COL_TOPIC] === topic);
  } else if (lesson && lesson !== "Review All" && lesson !== "-- N/A --") {
    scope = scope.filter(r => r[COL_LESSON] === lesson);
  } else if (course && course !== "Review All" && course !== "-- N/A --") {
    scope = scope.filter(r => r[COL_COURSE] === course);
  } else if (track && track !== "Review All") {
    scope = scope.filter(r => r[COL_TRACK] === track);
  }

  // 3. RANK SELECTED TOPICS BY PRIORITY
  let targetTopics = scope
    .filter(r => r[COL_TOPIC] !== "" && !isNaN(parseFloat(r[COL_PRIORITY])))
    .sort((a, b) => {
      const diff = parseFloat(b[COL_PRIORITY]) - parseFloat(a[COL_PRIORITY]);
      return diff !== 0 ? diff : Math.random() - 0.5;
    })
    .slice(0, 15) // Expand the slice slightly to give us a good pool of questions
    .map(r => r[COL_TOPIC]);

  // 4. GATHER AND SPLIT QUESTIONS (UNSEEN vs SEEN)
  let validQuestions = bankData.filter(r => targetTopics.includes(r[0]));
  
  let unseen = validQuestions.filter(q => !seenQuestions.has(q[1].toString().trim()));
  let seen = validQuestions.filter(q => seenQuestions.has(q[1].toString().trim()));

  // 5. SHUFFLE WITHIN TIERS (So you don't always get the same Unseen questions first)
  unseen.sort(() => Math.random() - 0.5);
  seen.sort(() => Math.random() - 0.5);

  // 6. COMBINE: Put Unseen at the top, followed by Seen if we run out of Unseen
  let finalQuestionPool = [...unseen, ...seen];

  return packageQuestions(finalQuestionPool, masteryData, count);
}

/** LOGGING ORDER: Track | Course | Lesson | Date | Topic | Question | Result | Review Flag */
function logFinalResults(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("Quiz Log") || ss.insertSheet("Quiz Log");
  results.forEach(res => {
    logSheet.appendRow([res.track, res.course, res.lesson, new Date(), res.topic, res.question, res.isCorrect ? 1 : 0, res.reviewFlag ? 1 : ""]);
  });
  return "Sync Complete";
}

/** THE WISE TEACHER ENGINE: Generates harder, structurally balanced questions */
function handleGenSelection(track, course, lesson, topic, count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bankSheet = ss.getSheetByName("Question Bank");
  const bankData = bankSheet.getDataRange().getValues();
  const masteryData = getMasteryData();
  
  let ts = [];
  if (topic && topic !== "Review All" && topic !== "-- N/A --") {
      ts = [topic];
  } else if (lesson && lesson !== "Review All" && lesson !== "-- N/A --") {
      ts = masteryData.filter(r => r[COL_LESSON] === lesson).map(r => r[COL_TOPIC]);
  } else if (course && course !== "Review All" && course !== "-- N/A --") {
      ts = masteryData.filter(r => r[COL_COURSE] === course).map(r => r[COL_TOPIC]);
  } else if (track && track !== "Review All") {
      ts = masteryData.filter(r => r[COL_TRACK] === track).map(r => r[COL_TOPIC]);
  } else {
      ts = masteryData.map(r => r[COL_TOPIC]); // Absolute worst case fallback
  }

  // Remove duplicates
  ts = [...new Set(ts)].filter(Boolean);

  ts.forEach(t => {
    // Context: Grab up to 8 existing questions to analyze baseline depth
    const ctx = bankData.filter(r => r[0] === t).slice(0, 8).map(r => ({ q: r[1], a: r[3] }));
    
    let p = `You are a Wise Master Educator and Professional Test Developer. 
    Below are the "Baseline Questions" currently in my database for the topic: "${t}".
    
    BASELINE DATA:
    ${JSON.stringify(ctx)}

    YOUR MISSION:
    1. Analyze the depth of these baseline questions and build ON TOP of them.
    2. Increase the rigor. Move beyond simple definitions to conceptual mechanics, implications, and multi-step reasoning.
    
    CRITICAL FORMATTING RULES (TO PREVENT TEST-HACKING):
    - OPTION UNIFORMITY: All 4 options must be of approximately the same character length. 
    - No "Length Bias": Do not make the correct answer the longest or most detailed.
    - PARALLEL STRUCTURE: If one option starts with a verb, all must start with a verb. Keep the phrasing symmetrical.
    - SOPHISTICATED DISTRACTORS: Ensure wrong answers are plausible and address common high-level misconceptions.

    Generate ${count} NEW "Mastery Level" MCQs.
    Return ONLY a JSON array: [{"topic": "${t}", "question": "text", "options": ["A", "B", "C", "D"], "answer": "exact correct option text"}]`;

    try {
      const resp = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`, {
        "method": "POST", "contentType": "application/json", "payload": JSON.stringify({
          "contents": [{"parts": [{"text": p}]}], 
          "generation_config": {"response_mime_type": "application/json"}
        })
      });
      
      const responseText = JSON.parse(resp.getContentText()).candidates[0].content.parts[0].text;
      const generated = JSON.parse(responseText);
      
      generated.forEach(q => {
        bankSheet.appendRow([t, q.question, q.options.join(" | "), q.answer]);
      });
    } catch (e) { 
      console.error("Gen Error for topic " + t + ": " + e.message); 
    }
  });
  return "Advanced, balanced questions generated successfully!";
}