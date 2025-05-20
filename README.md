# EasyRag - Multimodal Chatbot with Graph Database

A modern web application that combines the power of Large Language Models (LLMs) with graph databases to create an intelligent chatbot capable of processing and understanding various types of media content.

## Features

- **Multimodal Processing**: Handle text, images, audio, and video files
- **Graph Database Integration**: Store and query relationships between documents using Neo4j
- **Interactive Graph Visualization**: Visualize document relationships and connections
- **Advanced Query Interface**: Run custom graph queries with example templates
- **Real-time Chat Interface**: Modern UI for interacting with the chatbot
- **Document Management**: Organize and search through uploaded documents
- **Media Analysis**: Extract text from images and videos using Google Cloud Vision
- **Audio Transcription**: Convert speech to text using OpenAI's Whisper API

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Neo4j Graph Database
- **AI/ML**: OpenAI API, Google Cloud Vision API
- **UI Components**: React Flow (for graph visualization)
- **File Processing**: FFmpeg (for media processing)

## Prerequisites

- Node.js 18+ and npm
- Neo4j Database
- OpenAI API Key
- Google Cloud Vision API credentials
- FFmpeg installed on your system

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
OPENAI_API_KEY=your_openai_api_key_here

```

## Installation


1. Install dependencies:
```bash
cd multimodal-chatbot
npm install
```

2. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
multimodal-chatbot/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── graph/             # Graph visualization page
│   │   ├── graph-query/       # Graph query interface
│   │   └── page.tsx           # Main chat interface
│   ├── components/            # React components
│   ├── lib/                   # Utility functions and services
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
└── package.json              # Project dependencies
```


## API Endpoints

- `POST /api/chat`: Process chat messages and files
- `POST /api/graph/query`: Execute graph queries
- `GET /api/graph`: Fetch graph data for visualization


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the Whisper API
- Google Cloud for Vision API
- Neo4j for the graph database
- Next.js team for the amazing framework 

## Demo

[![Watch the demo](https://img.youtube.com/vi/2Ats7UmW1R0/0.jpg)](https://youtu.be/2Ats7UmW1R0)
