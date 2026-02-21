import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import instance from '../axios';
import { Send, Upload, FileText, Info, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ChatInterface = () => {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [citations, setCitations] = useState([]);

    useEffect(() => {
        fetchFormDetails();
    }, [fetchFormDetails]);

    const fetchFormDetails = useCallback(async () => {
        try {
            const response = await instance.get(`/api/forms/${id}`);
            setForm(response.data);
        } catch (error) {
            console.error('Error fetching form:', error);
        }
    }, [id]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const question = input;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: question }]);
        setLoading(true);
        setCitations([]); // Clear previous citations

        try {
            const response = await instance.post('/api/analyze', {
                formId: id,
                question,
            });

            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: response.data.answer },
            ]);
            setCitations(response.data.citations || []);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error analyzing that question.' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await instance.post(`/api/forms/${id}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert('File uploaded successfully! The data is now available for analysis.');
            fetchFormDetails(); // Refresh details/count
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file.');
        } finally {
            setUploading(false);
        }
    };

    if (!form) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Left: Chat Area */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="font-semibold text-gray-800">{form.name} Analysis</h2>
                        <p className="text-xs text-gray-500">Ask questions about your data</p>
                    </div>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".json,.csv"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <label
                            htmlFor="file-upload"
                            className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Import Data'}
                        </label>
                    </div>
                </div>

                {(form?.privacyMode ?? 'encrypted') === 'encrypted' && (
                    <div className="px-4 py-3 text-xs text-amber-800 bg-amber-50 border-b border-amber-100">
                        This form uses encrypted submissions. Owner analysis can only use plaintext imports, not private responses.
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-400 mt-10">
                            <Info className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Ask a question to start analyzing {form.name} data.</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role !== 'user' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-indigo-600" />
                                </div>
                            )}

                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm max-w-none prose-indigo">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-2xl px-4 py-3 text-gray-500 animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right: Citations / Context */}
            {citations.length > 0 && (
                <div className="w-80 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Sources Used
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {citations.map((citation, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                                <div className="font-medium text-gray-500 mb-1 text-xs uppercase tracking-wide">
                                    Result #{idx + 1}
                                </div>
                                <div className="space-y-1">
                                    {Object.entries(citation).map(([key, value]) => (
                                        <div key={key} className="flex gap-2 text-xs">
                                            <span className="font-semibold text-gray-700 shrink-0">{key}:</span>
                                            <span className="text-gray-600 break-words">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
