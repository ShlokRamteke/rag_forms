import React, { useState, useEffect } from "react";

import "./App.css";
import instance from "./axios.js";

function App() {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await instance.get("/api/forms");

      setForms(response.data);
    } catch (error) {
      console.error("Error fetching forms:", error);
    }
  };
  const handleFormSelect = (form) => {
    setSelectedForm(form);
    setAnalysis(null);
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await instance.post("/api/analyze", {
        formId: selectedForm._id,
        question,
      });
      setAnalysis(response.data);
    } catch (error) {
      console.error("Error analyzing question:", error);
      setAnalysis({ error: "An error occurred during analysis" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <h1>Form Analysis</h1>
        <div className="form-selection">
          <label htmlFor="form-select">Select a form:</label>
          <select
            id="form-select"
            value={selectedForm ? selectedForm._id : ""}
            onChange={handleFormSelect}
          >
            <option value="">Choose a form</option>
            {forms.map((form) => (
              <option key={form._id} value={form._id}>
                {form.name}
              </option>
            ))}
          </select>
        </div>
        {selectedForm && (
          <div className="question-form">
            <h2>Ask a question</h2>
            <form onSubmit={handleQuestionSubmit}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Type your question here..."
                rows="4"
              />
              <button type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </form>
          </div>
        )}
        {analysis && (
          <div className="analysis-result">
            <h2>Analysis Result</h2>
            <p>
              <strong>Answer:</strong> {analysis.answer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
