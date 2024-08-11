# Form Analysis Application

## Overview

This application is a MERN (MongoDB, Express.js, React, Node.js) stack project that allows users to analyze form data using advanced natural language processing techniques. It implements a Retrieval-Augmented Generation (RAG) system to answer questions about form data, utilizing embeddings for efficient retrieval and Gemini for question-answering.

To install the Application, follow these steps:

## Features

- Form data storage and retrieval
- Question-answering based on form data
- Embedding-based similarity search for relevant form responses
- Responsive web interface for interacting with the system

## Tech Stack

- Frontend: React
- Backend: Node.js with Express
- Database: MongoDB
- Embedding Model: Sentence Transformers (all-MiniLM-L6-v2)
- Question-Answering Model: Google's Gemini

## Form Schema

The application uses the following MongoDB schema for storing form data:

```javascript
const FormSchema = new mongoose.Schema({
  name: String,
  fields: [
    {
      name: String,
      type: String,
    },
  ],
  responses: [
    {
      data: mongoose.Schema.Types.Mixed,
      embedding: [Number],
    },
  ],
});
```

## Approach

### 1. Data Storage and Embedding

1. The response data is stored in the data field.
2. An embedding is generated for the response using a Sentence Transformers (all-MiniLM-L6-v2).
3. The embedding is stored alongside the response data in the embedding field.

### 2. Retrieval-Augmented Generation (RAG)

When a user asks a question:

1. Retrieval:

- An embedding is generated for the user's question.
- The system performs a similarity search using cosine similarity between the question embedding and the stored response embeddings.
- The most relevant responses are retrieved.

2. Augmentation:

- The retrieved responses are used to create a context for the question.

3. Generation:

- The question and the augmented context are sent to the Gemini model.
- Gemini generates an answer based on the provided context and question.

### 3. Question-Answering with Gemini

Google's Gemini model is used for the final question-answering step. Gemini takes the user's question and the context created from relevant form responses to generate an accurate and contextually appropriate answer.

## API Endpoints

`GET /api/forms:` Retrieve all forms
`POST /api/forms`: Create a new form
`POST /api/analyze`: Analyze a question for a specific form

5. Navigate to the project directory
   ```
   cd customer-portal
   ```
6. Install the dependencies
   ```
   npm install
   ```

## Setup and Installation

1. Clone the repository:

   ```
   git clone https://github.com/ShlokRamteke/rag_forms.git
   ```

2. Install dependencies:

   ```
   cd backend && npm install
   cd ../frontend && npm install

   ```

3. Set up environment variables:

- Backend: Create a `.env` file with:

  ```
  MONGODB_URI=your_mongodb_connection_string
  GEMINI_API_KEY=your_gemini_api_key
  PORT=you_port
  ```

- Frontend: Create a `.env` file with:

  ```
   VITE_APP_API_URL=your_backed_link
  ```

4. Start the backend and front end server:

   ```
   cd backend && npm start
   cd frontend && npm run dev
   ```
