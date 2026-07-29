Once retrieval feeds a language model, the user's raw query stops being a fixed input and becomes raw material. The system can rewrite it, expand it, decompose it, retry it, and route it to a database instead of a document index. This lesson covers that query-side machinery: the cheap single-shot transforms, the agentic search loop with its stop policy, multi-hop decomposition, conversational rewriting, self-correcting retrieval loops, and text-to-SQL as a retrieval tool. Each technique buys recall or robustness with the same currency: extra model calls and latency.

## Single-Shot Query Rewriting, Expansion, and HyDE

A query rewrite is one small model call that transforms the user's text into a better search query before retrieval runs. Users type `renewal terms` when the corpus talks about `subscription renewal policy`, they misspell product names, and they omit context the previous screen made obvious. The rewriter normalizes vocabulary toward the corpus, expands abbreviations, and adds implied constraints. This is the highest-leverage transform in the lesson because retrieval quality is query-bound and the call costs 100 to 300 ms with a small model.

Expansion generalizes the idea: generate several paraphrases of the query, retrieve with each in parallel, and fuse the result lists with RRF as in IR 202. Recall rises because different phrasings catch different documents; cost rises multiplicatively with the number of variants, so two to four variants is the practical range.

HyDE, hypothetical document embeddings, inverts the direction. Instead of embedding the question, ask the model to write a short hypothetical answer, embed that, and search for real documents near it. The mechanism works because answer-shaped text clusters near real answers in embedding space even when the hypothetical answer's facts are wrong: a generated passage about `orthostatic hypotension when standing` sits near genuine medical pages on the topic, pulling the right neighborhood. The failure mode is symmetric: for niche factual lookups the model hallucinates a confident but wrong answer, and the embedding drags retrieval toward the hallucination. HyDE earns its generation cost on conceptual how-to queries and loses it on precise entity lookups.

Judgment: rewriting first, expansion when recall is measurably short, HyDE for conceptual traffic only. All three are stateless and pre-retrieval, so they are trivial to A/B. Always log the original query and keep it as the fallback when the transform degrades results.

## Retrieval as a Tool: Search, Read, Decide-to-Stop

The agentic framing treats retrieval as a tool the model calls in a loop. The model receives a `search(query, filters, top_k)` tool and usually a `read(document_id)` tool; it searches, inspects snippets, reads promising documents, then decides whether to answer or search again with a better query. This converts retrieval from a fixed pipeline stage into a deliberative process that can recover from a bad first query, which is exactly what single-shot RAG cannot do.

The hard part is not searching but stopping. A decide-to-stop policy weighs coverage (does the evidence address every facet of the question), marginal utility (did the last two searches return documents already seen), and budget (a hard cap on tool calls and total latency). Without an explicit cap, agents loop, rephrasing the same failing query while latency and token spend climb. A typical production cap is three to five searches before the model must answer with what it has or declare insufficiency.

The cost profile decides where agentic retrieval belongs. Each loop iteration is one model call plus one retrieval, roughly one to three seconds; three iterations push time-to-answer toward ten seconds before generation starts. Easy questions should never pay that. Route with a cheap classifier or heuristic: questions with multiple entities, constraints, or comparison structure go agentic; simple factual questions go through the single-shot path.

Tool design details carry the reliability: return snippets with stable document IDs so `read` calls are cheap; include filters in the schema so the model can scope searches; cache identical searches within a session; and record the full trace, since the search sequence is the primary debugging artifact when an agent goes wrong.

## Query Decomposition and Multi-hop Retrieval

Some questions are compositional: no single document contains the answer, because answering requires chaining facts. `Which company founded by a Google alumnus raised the largest Series B in 2019` requires finding candidate companies, finding each one's funding history, and comparing. Multi-hop retrieval decomposes the question, retrieves per sub-question, and aggregates.

Three mechanisms cover most systems. Single-pass decomposition: the model writes a numbered plan of sub-queries up front, each is executed, and a final synthesis pass combines the evidence. Iterative retrieval: reasoning and retrieval interleave, so the model reads what it has, emits the next sub-query, retrieves, and repeats until the chain completes. Recursive resolution: the answer to one hop becomes an input to the next query, as when the entity found in hop one fills the template for hop two.

The failure accounting is multiplicative. If each hop retrieves the needed fact with probability 0.9, a three-hop chain succeeds about 0.73 of the time before any reasoning errors. Worse, errors propagate semantically: a wrong entity from hop one poisons the query for hop two, and the chain walks confidently off a cliff. Decomposition itself can be wrong, splitting the question along the wrong joints.

Judgment: decompose only genuinely compositional questions, comparisons and bridging-entity chains, and try a single retrieval first for anything simpler. Evaluate per-hop retrieval success separately from final answer accuracy, because the fixes differ. Cap chain depth, prefer the fewest hops that work, and remember every hop is another model call on the latency bill.

## Conversational Query Rewriting Across Turns

Multi-turn conversations break retrieval because follow-ups are context-dependent. After `Tell me about the Team plan`, the turn `How much does it cost?` is unanswerable by search: the bare query retrieves generic pricing text. Coreference and ellipsis must be resolved against the conversation history before retrieval sees anything.

The standard mechanism is contextualize-then-retrieve. A model call rewrites the latest user turn into a standalone query using the recent history, including the assistant's previous answer, which usually contains the entities being discussed. `How much does it cost?` becomes `Team plan pricing`. Retrieval then runs on the standalone form, which is also what gets logged and evaluated.

Three failure modes deserve engineering attention. Over-anchoring: the user changes topic, but the rewrite drags in stale entities, so the instruction must include `if the turn is already standalone, return it unchanged`. Error lock-in: a wrong previous assistant answer injects its wrong entities into every later rewrite, so confidence-degraded answers should be excluded from rewrite context. History bloat: long conversations exceed prompt budgets, so keep the last few turns or a running summary rather than the full transcript.

The cost is one small model call per turn, which is why this is nearly always worth it for chat interfaces. Evaluate the rewriter as its own component with a small set of history-plus-turn to gold-standalone pairs, because a retrieval failure in conversation is as often a rewriting failure as a search failure.

## Self-Correcting RAG: Reflect, Re-Retrieve, Refine

Single-pass RAG fails silently: weak retrieval produces a confident, fluent, wrong answer. Self-correcting designs insert explicit checks around the two places failure happens. Retrieval grading: after retrieval, a model or small classifier judges whether the documents are relevant and sufficient for the question; on a failing grade the system rewrites the query and retrieves again, the corrective pattern known from CRAG-style systems. Generation reflection: after drafting, the system checks whether every claim in the draft is supported by the retrieved context, flags unsupported sentences, and regenerates or abstains. A third check asks whether the draft addresses the question at all.

Every gate needs a fall-through policy. Allow one or two re-retrieval attempts at most, then answer with explicit caveats or abstain. Abstention is a legitimate output: for a support product, `I could not verify this from our documentation` beats a fabricated policy detail every time.

The accounting is sober. Each check is a model call, so a fully checked pipeline runs two to four times the latency and token cost of single-pass RAG. Apply gates selectively: skip reflection when retrieval scores are strong and the question is simple, and reserve the full loop for low-confidence or high-stakes traffic. The checks are themselves model judgments and can be wrong in both directions, approving bad evidence and rejecting good evidence, which is why they are gates with budgets rather than loops without end. Log which corrective path fired per request; the distribution of those flags is the health metric of the retrieval layer underneath.

## Text-to-SQL as a Retrieval Tool for Structured Data

Some questions are not document questions. `What was churn in Q3 by plan?` is answered by rows in BigQuery, not by any chunk in the index. Text-to-SQL makes the database another retrieval tool: the model generates SQL from the natural-language question plus schema context, the system executes it read-only, and the returned rows become context for the answer.

Three mechanisms determine success. Schema linking: the prompt must contain the right tables and columns, which for large warehouses means retrieving the relevant schema subset first rather than dumping thousands of columns. Few-shot exemplars: a handful of question-to-SQL pairs in the house style outperforms zero-shot generation by a wide margin. Value grounding: the filter `Team plan` must map to a real `plan_id`, which requires either a lookup query or a curated list of dimension values in the prompt.

Guardrails are not optional. Execute through a read-only role against allow-listed tables, enforce row limits and query timeouts, estimate bytes scanned before running, and cap result size. Parse the generated SQL and reject anything that is not a single SELECT; model output is never executed raw.

Failure modes are specific: hallucinated columns or tables; wrong join grain producing fanout duplicates, the exact hazard from DE 102's grain lessons; empty results misread as `zero churn` instead of `wrong query`; and genuinely ambiguous questions that need a clarification loop rather than a guess. In hybrid systems an orchestrator routes each question to document retrieval, to SQL, or to both, and the agentic loop from earlier chooses the tool. Quality is bounded by schema documentation: column descriptions and metric definitions, in effect a semantic layer, matter more than model cleverness. For governed business metrics, prefer curated semantic-layer queries over free-form generation, and keep the SQL and returned rows in the request trace, because they are the audit artifact that makes the answer defensible.
