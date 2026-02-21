import { useState } from "react";

const STORAGE_KEY = "admin_token";

const AdminGate = ({ children }) => {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY) || "");
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem(STORAGE_KEY, input.trim());
    setToken(input.trim());
    setInput("");
  };

  if (token) return children;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm w-full max-w-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Admin Access</h1>
        <p className="text-sm text-gray-500 mb-4">
          Enter the admin password to access form management and analysis.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminGate;
