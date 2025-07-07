# AI-Powered Chat with Documents, Stocks & Web Intelligence

An interactive web application that enables users to:
- 💬 Chat with any uploaded PDF using Retrieval-Augmented Generation (RAG) for contextual, document-based answers.
- 📈 Retrieve stock prices and company information via MCP agents.
- 🌐 Search the web when additional or external information is required.

Powered by Large Language Models (LLMs), the app intelligently extracts insights and answers questions using contextual information from data sources. It features a fallback mechanism to web search when the uploaded documents do not contain sufficient or relevant information — ensuring responses remain complete and reliable.

## 🏗️ Architecture
![diagram](https://github.com/user-attachments/assets/37b02fd0-6c82-4772-8c8f-2941cf514c74)

## 🌱 Motivation
Extracting meaningful information from dense PDFs, tracking stock-related data, or finding reliable answers on the web can be time-consuming and fragmented. This application bridges that gap by combining Retrieval-Augmented Generation (RAG) with the reasoning capabilities of Large Language Models (LLMs) — enabling users to ask questions naturally and get fast, context-aware responses. Whether you’re exploring technical documents, retrieving real-time stock data via agents, or searching the web for up-to-date information, this tool acts as a unified conversational interface. 

## 🚀 Getting Started

### Clone the Repository
```bash
git clone https://github.com/sharukat/context-aware-qa-rag-agent.git
cd context-aware-qa-rag-agent
```

### Frontend Setup (Next.js)
Go to the frontend folder: `cd frontend`.

1. Create a `.env` file in the frontend directory with the following content:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

2. Install dependencies and build:
```bash
pnpm install
pnpm build
```

3. Start the server:
```bash
pnpm start
```

The Next.js frontend will be available at http://localhost:3000.

### Backend Setup
Go to the backend folder: `cd backend`.
1. Create a `.env` file in the backend directory with the following content:
```
COHERE_API_KEY=your_cohere_api_key_here
NOMIC_API_KEY=your_nomic_api_key_here
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

#### Go API Gateway
2. The repository already contains the executable binary. Go to `cd api-gateway` and run:
```bash
./bin/app
```

This will start the go server which servers in port `8080`.

#### Microservices
Ensure you have docker installed on your system.

3. Start the docker containers:
```bash
docker-compose up -d
```

4. Check the running docker containers:
```bash
docker ps
```

You will see four docker containers running.
- `rag-container`
- `search-container`
- `stocks-container`
- `file-upload-container`

## Microservices
### 🧾 RAG Document Service
This service powers document-based question answering using Retrieval-Augmented Generation (RAG). It employs the HyDE (Hypothetical Document Embeddings) technique to generate a hypothetical answer, which is then used to retrieve semantically relevant context from the vector database. The retrieved context is passed to the LLM, which responds with a grounded answer, including source document references and page numbers. If the document lacks sufficient information, the service seamlessly falls back to the Web Search Service, ensuring the user still receives a reliable and informed response.

### 🌐 Web Search Service
This service enables real-time web search via the chat interface. It uses a LangGraph React agent integrated with the Tavily Search API, allowing the LLM to search the web and retrieve relevant, citation-backed content. Responses are grounded in retrieved sources and include citations for transparency and trustworthiness. 

### 📊 Stocks MCP Service
This service supports conversational access to stock prices and company data. It utilizes a LangGraph React agent connected to a custom MCP toolset, which interfaces with Yahoo Finance APIs. The LLM is guided through tool usage to fetch structured, up-to-date financial information on demand.

### File-upload Service
This service manages PDF ingestion and vectorization. Upon upload, the PDF is parsed and semantically chunked. Each chunk is prefixed with search_document, then indexed into a Qdrant vector database allowing hybrid retrieval:
- Dense embeddings via `Nomic Embedding`
- Sparse embeddings via `BM25`

This hybrid approach enables high-quality retrieval across both semantic and keyword-based queries, significantly improving the relevance of contextual results.

## Technology Stack
<p align="center">
  <a href="https://go-skill-icons.vercel.app/">
    <img
      src="https://go-skill-icons.vercel.app/api/icons?i=python,golang,typescript,nextjs,tailwindcss,fastapi,langchain,groq,docker"
    />
  </a>
</p>

### LLM Models

This application leverages `llama-3.3-70b-versatil` large language model (LLM) through `Groq`.

### Embedding Models

- **Nomic Embediing**: A powerful embedding model that captures semantic relationships between text chunks, enabling accurate document retrieval.

### Advanced RAG Techniques

#### Chunking Strategy
Documents are processed using an `semantic chunking` strategy that:
- Leverage `Nomic` embeddings to determine breakpoints
- Automatically adjusts chunk sizes based semantics of the text

#### Hypothetical Document Embeddings (HyDE)
This system implements HyDE to improve retrieval relevance:
1. The user query is expanded into a hypothetical document that might answer it
2. The hypothetical embeddings are used to search for relevant document chunks

#### Searching Strategy
This system uses `Hybrid (Dense + Sparse)` embeddings search technique.
1. Leverage `Nomic` embeddings for dense retrieval identifying semantic relationship.
2. The `BM25` algorithm uses sparse embeddings to match specific terms.

### Prefixing Query and Documents
1. Used `search_document` prefix for document chunks.
2. Used `search_query` prefix for the search query.

#### Repacking & Reranking
1. **Reranking**: Improve the relevance of the retrieved documents to ensure the most important information appears first.
2. **Repacking**: The order of the chunks might affect response generation. This technique repacks the chunks in ascending order.


## API Documentation

The API gateway exposes the following endpoints:

- `POST /v1/api/rag`: RAG Document Service.
- `POST /v1/api/stocks`: Stocks MCP Service.
- `POST /v1/api/search`: Web Search Service.
- `POST /v1/api/file-upload`: File-Upload Service.

## Upcoming Improvements
- Semantic Redis caching to reduce latency and inference cost
- Guardrails to prevent prompt injection and block inappropriate queries