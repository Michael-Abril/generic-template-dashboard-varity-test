# AI/RAG System Architecture

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
│                        (React/Next.js/TypeScript)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                  /ai-assistant Page                            │    │
│  │  - Conversation history sidebar                                │    │
│  │  - Data source selector (QuickBooks, Salesforce, etc.)        │    │
│  │  - Export/Clear chat controls                                  │    │
│  │  - Quick prompt templates                                      │    │
│  └──────────────────────┬─────────────────────────────────────────┘    │
│                         │                                               │
│  ┌──────────────────────▼─────────────────────────────────────────┐    │
│  │              AIChat Component                                   │    │
│  │  - Message history display                                      │    │
│  │  - User input with keyboard support                             │    │
│  │  - Source attribution badges                                    │    │
│  │  - Loading states & animations                                  │    │
│  │  - Wallet integration (Thirdweb + Privy)                       │    │
│  └──────────────────────┬─────────────────────────────────────────┘    │
│                         │                                               │
└─────────────────────────┼───────────────────────────────────────────────┘
                          │
                          │ HTTP POST /api/v1/ai/chat
                          │ {message, wallet_address, use_rag}
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API LAYER                               │
│                           (FastAPI/Python)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              AI API Router (/api/v1/ai)                        │    │
│  │                                                                 │    │
│  │  POST /chat              - AI chatbot with RAG                 │    │
│  │  POST /query             - Advanced RAG query                  │    │
│  │  POST /query/multitenant - Multi-tenant query                  │    │
│  │  GET  /suggestions       - Query suggestions                   │    │
│  │  GET  /history           - Query history                       │    │
│  │  POST /rag/index         - Index business data                 │    │
│  │  GET  /rag/stats         - Collection stats                    │    │
│  │  GET  /health            - Health check                        │    │
│  └──────────────────────┬─────────────────────────────────────────┘    │
│                         │                                               │
│  ┌──────────────────────▼─────────────────────────────────────────┐    │
│  │           AI Query Service (ai_query_service.py)               │    │
│  │                                                                 │    │
│  │  Main Pipeline:                                                │    │
│  │  1. RAG context retrieval (with ZK verification)               │    │
│  │  2. Ollama LLM generation (with context injection)             │    │
│  │  3. ZK rollup logging (privacy-preserving audit)               │    │
│  │                                                                 │    │
│  │  Components:                                                    │    │
│  │  - Query cache (100 entries)                                   │    │
│  │  - Web3 integration (Arbitrum Sepolia)                         │    │
│  │  - ZK hash generation                                          │    │
│  │  - Fallback responses                                          │    │
│  └──────────────────────┬─────────────────────────────────────────┘    │
│                         │                                               │
│  ┌──────────────────────▼─────────────────────────────────────────┐    │
│  │      Ollama Business Service (ollama_service.py)               │    │
│  │                                                                 │    │
│  │  Multi-Tenant Architecture:                                    │    │
│  │  - Business-scoped RAG queries                                 │    │
│  │  - Context-aware LLM prompts                                   │    │
│  │  - Source attribution (Filecoin CIDs)                          │    │
│  │  - Streaming support                                           │    │
│  │  - Integration/data type filtering                             │    │
│  │                                                                 │    │
│  │  query_business_ai(wallet, query) →                            │    │
│  │    {answer, sources, context_used}                             │    │
│  └──────────────────────┬─────────────────────────────────────────┘    │
│                         │                                               │
│  ┌──────────────────────▼─────────────────────────────────────────┐    │
│  │        Business RAG Service (rag_service.py)                   │    │
│  │                                                                 │    │
│  │  Multi-Tenant Isolation:                                       │    │
│  │  - Each business → Own Qdrant collection                       │    │
│  │  - Collection naming: business_{wallet_lowercase}              │    │
│  │  - Zero cross-business data leakage                            │    │
│  │                                                                 │    │
│  │  Core Methods:                                                  │    │
│  │  • create_business_collection(wallet)                          │    │
│  │  • index_business_data(wallet, cid, data, ...)                 │    │
│  │  • query_business_rag(wallet, query, limit)                    │    │
│  │  • get_collection_stats(wallet)                                │    │
│  │                                                                 │    │
│  │  Embedding: Ollama API (nomic-embed-text, 768 dim)            │    │
│  └───────────┬─────────────────────────┬──────────────────────────┘    │
│              │                         │                                │
└──────────────┼─────────────────────────┼────────────────────────────────┘
               │                         │
               │ Embeddings              │ Vector Search
               │                         │
               ▼                         ▼
┌─────────────────────────┐   ┌──────────────────────────────────────┐
│   OLLAMA LLM SERVICE    │   │   QDRANT VECTOR DATABASE             │
│   (localhost:11434)     │   │   (localhost:6334)  ⚠️ PORT ISSUE   │
├─────────────────────────┤   ├──────────────────────────────────────┤
│                         │   │                                      │
│ Available Models:       │   │ Collections (Multi-Tenant):          │
│ ✅ mistral:latest      │   │ ✅ business_{wallet_a}               │
│    - Chat model         │   │ ✅ business_{wallet_b}               │
│    - 4.1 GB             │   │ ✅ business_{wallet_c}               │
│                         │   │                                      │
│ ✅ llama3.1:8b         │   │ Vector Config:                       │
│    - General purpose    │   │ - Dimension: 768 (nomic-embed-text)  │
│    - 4.7 GB             │   │ - Distance: Cosine                   │
│                         │   │ - Indexing: HNSW                     │
│ ✅ codellama:13b       │   │                                      │
│    - Code generation    │   │ Storage:                             │
│    - 7.0 GB             │   │ - Points indexed: Variable per biz   │
│                         │   │ - Persistence: Disk (/qdrant/storage)│
│ ❌ nomic-embed-text    │   │                                      │
│    - MISSING!           │   │ Port Mapping (Docker):               │
│    - Required for RAG   │   │ - Container: 6333 (HTTP)             │
│    - 274 MB             │   │ - Host: 6334 ⚠️ Config uses 6333   │
│                         │   │ - gRPC: 6335                         │
│ API:                    │   │                                      │
│ POST /api/generate      │   │ API:                                 │
│ POST /api/embeddings    │   │ GET  /collections                    │
│ GET  /api/tags          │   │ POST /collections/{name}             │
│                         │   │ POST /collections/{name}/points      │
│                         │   │ POST /collections/{name}/points/search│
└─────────────────────────┘   └──────────────────────────────────────┘
```

---

## Data Flow Diagram

### User Query → AI Response Pipeline

```
┌────────────────┐
│   User Query   │
│ "Show revenue" │
└───────┬────────┘
        │
        ▼
┌────────────────────────────────────────────────┐
│ 1. Frontend (AIChat Component)                 │
│    - Validate wallet connection                │
│    - Prepare API request                       │
└───────┬────────────────────────────────────────┘
        │
        │ POST /api/v1/ai/chat
        │ {message, wallet_address, use_rag: true}
        ▼
┌────────────────────────────────────────────────┐
│ 2. Backend API Router                          │
│    - Route to /chat endpoint                   │
│    - Extract wallet address                    │
└───────┬────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────┐
│ 3. AI Query Service                            │
│    - Start query processing                    │
│    - Initialize RAG retrieval                  │
└───────┬────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────┐
│ 4. Business RAG Service                        │
│    a. Determine collection name:               │
│       collection = business_{wallet_lower}     │
│    b. Generate query embedding:                │
│       → Ollama /api/embeddings                 │
│       → nomic-embed-text model                 │
│       → 768-dim vector                         │
│    c. Search Qdrant collection:                │
│       → Vector similarity search               │
│       → Filter by integration/data_type        │
│       → Return top K results                   │
└───────┬────────────────────────────────────────┘
        │
        │ RAG Results:
        │ [{cid, data, integration, score}, ...]
        ▼
┌────────────────────────────────────────────────┐
│ 5. Ollama Business Service                     │
│    a. Build context from RAG results:          │
│       Source 1 (QuickBooks, Invoices):         │
│       {invoice_total: 5000, ...}               │
│       Source 2 (QuickBooks, Customers):        │
│       {customer: "Acme", ...}                  │
│    b. Construct LLM prompt:                    │
│       System: "You are a business AI..."       │
│       Context: [RAG data]                      │
│       Query: "Show revenue"                    │
└───────┬────────────────────────────────────────┘
        │
        │ LLM Request
        ▼
┌────────────────────────────────────────────────┐
│ 6. Ollama LLM                                  │
│    Model: mistral:latest                       │
│    - Process prompt with context               │
│    - Generate natural language response        │
│    - Return: "Your total revenue is $5,000..." │
└───────┬────────────────────────────────────────┘
        │
        │ AI Response
        ▼
┌────────────────────────────────────────────────┐
│ 7. AI Query Service (Post-Processing)         │
│    - Generate ZK hash of query/response        │
│    - Log to ZK rollup (privacy-preserving)     │
│    - Attach source CIDs                        │
│    - Return complete response                  │
└───────┬────────────────────────────────────────┘
        │
        │ Response: {
        │   response: "Your total...",
        │   sources: ["QmAbc...", "QmDef..."],
        │   metadata: {...}
        │ }
        ▼
┌────────────────────────────────────────────────┐
│ 8. Frontend (AIChat Component)                 │
│    - Display AI message in chat                │
│    - Show source badges                        │
│    - Add timestamp                             │
│    - Enable user interaction                   │
└────────────────────────────────────────────────┘
        │
        ▼
┌────────────────┐
│ User sees AI   │
│ response with  │
│ sources        │
└────────────────┘
```

---

## Multi-Tenant Isolation Architecture

### How Business A Cannot Access Business B's Data

```
┌───────────────────────────────────────────────────────────────────┐
│                  QDRANT VECTOR DATABASE                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Collection: business_0xabc...123                        │     │
│  │ Owner: Business A (Wallet: 0xabc...123)                 │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ Points:                                                  │     │
│  │  - Invoice: Acme Corp, $5,000                           │     │
│  │  - Customer: Acme Corp, rating 5/5                      │     │
│  │  - Expense: Office supplies, $200                       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Collection: business_0xdef...456                        │     │
│  │ Owner: Business B (Wallet: 0xdef...456)                 │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ Points:                                                  │     │
│  │  - Invoice: Globex Inc, $10,000                         │     │
│  │  - Customer: Globex Inc, rating 3/5                     │     │
│  │  - Expense: Marketing, $1,500                           │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Collection: business_0xghi...789                        │     │
│  │ Owner: Business C (Wallet: 0xghi...789)                 │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ Points:                                                  │     │
│  │  - Invoice: Initech LLC, $7,500                         │     │
│  │  - Customer: Initech LLC, rating 4/5                    │     │
│  │  - Expense: Salaries, $5,000                            │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**Query from Business A:**
```python
# User Query: "What's my total revenue?"
query_business_rag(
    business_wallet="0xabc...123",
    query="revenue",
    limit=5
)

# ONLY searches in: business_0xabc...123
# Results: Invoice Acme Corp $5,000
# Cannot access: business_0xdef...456 or business_0xghi...789
```

**Isolation Mechanisms:**
1. Collection name = `business_{wallet.lower()}`
2. Query scoped to wallet's collection only
3. No cross-collection search possible
4. Each business has separate namespace
5. Wallet signature verifies ownership

---

## Storage Architecture (Filecoin + Qdrant)

```
┌─────────────────────────────────────────────────────────────┐
│              BUSINESS DATA STORAGE LAYER                     │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Filecoin/    │  │    Qdrant    │  │  Varity L3   │
│   IPFS       │  │  VectorDB    │  │  Blockchain  │
│ (via Pinata) │  │              │  │              │
├──────────────┤  ├──────────────┤  ├──────────────┤
│              │  │              │  │              │
│ STORES:      │  │ STORES:      │  │ STORES:      │
│ - Raw data   │  │ - Embeddings │  │ - CID refs   │
│ - Encrypted  │  │ - Metadata   │  │ - Ownership  │
│ - Documents  │  │ - Indexes    │  │ - Access log │
│              │  │              │  │              │
│ FORMAT:      │  │ FORMAT:      │  │ FORMAT:      │
│ JSON.enc     │  │ 768-dim      │  │ Smart        │
│ (Lit Proto)  │  │ vectors      │  │ contract     │
│              │  │              │  │              │
│ NAMESPACE:   │  │ COLLECTION:  │  │ EVENT:       │
│ customer-    │  │ business_    │  │ DataStored   │
│ {wallet}/    │  │ {wallet}     │  │ (wallet,cid) │
│ {integ}/     │  │              │  │              │
│ {type}/      │  │              │  │              │
│ {time}.enc   │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  Data Flow:      │
               │                  │
               │  1. User uploads │
               │  2. Encrypt data │
               │  3. Store IPFS   │
               │  4. Get CID      │
               │  5. Index Qdrant │
               │  6. Log chain    │
               └──────────────────┘
```

---

## Configuration Files & Environment

```
generic-company-dashboard/
│
├── backend/
│   ├── .env                          ← Environment variables
│   │   QDRANT_URL=localhost:6334     ← ⚠️ Fix this
│   │   OLLAMA_URL=localhost:11434    ← Correct
│   │   PINATA_API_KEY=...            ← Filecoin/IPFS
│   │
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py             ← Pydantic settings
│   │   │       ├── qdrant_url        ← Uses .env
│   │   │       ├── ollama_url        ← Uses .env
│   │   │       └── ollama_model      ← Default: mistral
│   │   │
│   │   ├── services/
│   │   │   ├── rag_service.py        ← Qdrant + Ollama
│   │   │   ├── ai_query_service.py   ← Query pipeline
│   │   │   └── ollama_service.py     ← LLM integration
│   │   │
│   │   └── api/v1/
│   │       └── ai.py                 ← API endpoints
│   │
│   └── main.py                       ← FastAPI app
│
├── src/
│   ├── app/
│   │   └── ai-assistant/
│   │       └── page.tsx              ← AI Assistant page
│   │
│   └── components/
│       └── AIChat.tsx                ← Chat component
│
└── docker-compose.yml                ← Service definitions
    ├── qdrant:                       ← Port 6334:6333
    ├── ollama:                       ← Port 11435:11434
    └── backend:                      ← Port 8001:8000
```

---

## Key Design Decisions

### Why Multi-Tenant Collections (Not Single Collection with Filters)?

**Chosen Approach:** Separate Qdrant collection per business

**Alternative:** Single collection with wallet filters

**Reasoning:**
1. **Security:** Physical isolation prevents accidental data leakage
2. **Performance:** Smaller collections = faster searches
3. **Scalability:** Easy to distribute across nodes
4. **Compliance:** Easier to prove data isolation for regulations
5. **Deletion:** Can delete entire business without affecting others

### Why Local Ollama (Not Cloud LLM)?

**Chosen Approach:** Self-hosted Ollama on Docker/Akash

**Alternative:** OpenAI, Anthropic, Google Cloud

**Reasoning:**
1. **Cost:** $0/query vs $0.01-0.10/query
2. **Privacy:** Data never leaves infrastructure
3. **Control:** Model versioning, customization
4. **Speed:** No network latency to cloud
5. **Compliance:** No third-party data sharing

### Why nomic-embed-text (Not OpenAI Embeddings)?

**Chosen Approach:** nomic-embed-text (768-dim)

**Alternative:** OpenAI text-embedding-3-small (1536-dim)

**Reasoning:**
1. **Local:** Works with Ollama (no API calls)
2. **Fast:** Sub-second embedding generation
3. **Quality:** Comparable to OpenAI for business data
4. **Cost:** $0 vs $0.0001/1K tokens
5. **Privacy:** Stays in-house

---

## Performance Characteristics

**Embedding Generation:**
- Model: nomic-embed-text
- Dimension: 768
- Speed: ~50ms per document
- Batch: ~1000 docs/minute

**Vector Search:**
- Database: Qdrant
- Algorithm: HNSW
- Search time: <100ms for 10K docs
- Memory: ~50MB per 10K vectors

**LLM Generation:**
- Model: mistral:latest (7B params)
- Speed: ~50 tokens/second
- Latency: 200-500ms first token
- Context: Up to 8K tokens

**End-to-End Query:**
- Total: 1-3 seconds
- Breakdown:
  - Embedding: 50ms
  - RAG search: 100ms
  - Context prep: 50ms
  - LLM generation: 1-2s
  - Post-processing: 50ms

---

## Security Model

**Layers of Security:**

1. **Wallet-Based Authentication**
   - User proves ownership via wallet signature
   - No passwords, no credentials

2. **Multi-Tenant Isolation**
   - Physical separation in Qdrant
   - Collection = business_{wallet}

3. **Encrypted Storage**
   - Lit Protocol encryption
   - Data encrypted at rest on Filecoin

4. **ZK Privacy**
   - Query logging with ZK proofs
   - No plaintext queries on blockchain

5. **Access Control**
   - Smart contract enforces ownership
   - Cannot query other business's data

---

## Error Handling & Fallbacks

**Service Failure Scenarios:**

| Failure | Fallback | User Experience |
|---------|----------|-----------------|
| Ollama down | Return error message | "AI temporarily unavailable" |
| Qdrant down | Query without RAG | Generic AI response |
| No embeddings | Text search fallback | Lower quality results |
| No RAG data | LLM only | Answer without context |
| Timeout | Cached response | Slightly stale data |

---

## Future Enhancements

**Planned Features:**

1. **Streaming Responses**
   - Real-time token generation
   - Better UX for long answers

2. **Model Selection**
   - User chooses: mistral vs llama3.1 vs codellama
   - Different models for different tasks

3. **Advanced RAG**
   - Reranking results
   - Multi-query expansion
   - Hybrid search (vector + keyword)

4. **Conversation Memory**
   - Track conversation context
   - Remember previous queries
   - Personalized responses

5. **Analytics**
   - Query patterns
   - Popular questions
   - Response quality metrics

---

**For detailed status and fixes, see:**
- [AI_RAG_SYSTEM_STATUS_REPORT.md](./AI_RAG_SYSTEM_STATUS_REPORT.md) - Full technical report
- [AI_RAG_SYSTEM_QUICK_SUMMARY.md](./AI_RAG_SYSTEM_QUICK_SUMMARY.md) - Executive summary
