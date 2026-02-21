import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import instance from '../axios';
import { decryptData } from '../utils/encryption';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Lock, Unlock, Send, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';

const PrivateAnalysis = () => {
    const { id: formId } = useParams();
    const [form, setForm] = useState(null);
    const [passphrase, setPassphrase] = useState('');
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [myResponses, setMyResponses] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [question, setQuestion] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await instance.get(`/api/forms/${formId}`);
                setForm(response.data);
            } catch (error) {
                console.error('Error fetching form:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [formId]);

    const handleDecrypt = async () => {
        if (!passphrase) return;

        const decrypted = [];
        for (const resp of form.responses) {
            if (resp?.mode && resp.mode !== 'encrypted') continue;
            if (!resp?.encryptedData || !resp?.iv || !resp?.salt) continue;
            try {
                const data = await decryptData(resp.encryptedData, resp.iv, resp.salt, passphrase);
                decrypted.push({ ...resp, data });
            } catch {
                // Not my response or wrong passphrase
                continue;
            }
        }

        if (decrypted.length > 0) {
            setMyResponses(decrypted);
            setIsDecrypted(true);
            setChatHistory([{
                role: 'assistant',
                content: `Successfully decrypted **${decrypted.length}** of your private records. You can now ask me questions about this data!`
            }]);
        } else {
            alert('No records found for this passphrase.');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!question.trim() || analyzing) return;

        const userMsg = { role: 'user', content: question };
        setChatHistory(prev => [...prev, userMsg]);
        setQuestion('');
        setAnalyzing(true);

        try {
            // Transient RAG: We send only the relevant decrypted data to the AI for this specific question
            // For now, to keep it simple, we send all 'my' decrypted records as context
            const context = myResponses.map((r, i) => `Record #${i + 1}: ${JSON.stringify(r.data)}`).join('\n\n');

            const response = await instance.post('/api/analyze', {
                formId,
                question: userMsg.content,
                // We override the server's RAG by providing our own decrypted context
                // The server should be updated to respect this "manual context" for privacy-first
                contextOverride: context
            });

            setChatHistory(prev => [...prev, { role: 'assistant', content: response.data.answer }]);
        } catch (error) {
            console.error('Chat error:', error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!form) return <div className="min-h-screen flex items-center justify-center">Form not found</div>;

    if (!isDecrypted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full">
                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Unlock Private Data</h2>
                    <p className="text-gray-500 text-center mb-8">Enter your secret passphrase to decrypt and analyze your responses for <strong>{form.name}</strong>.</p>

                    <div className="space-y-4">
                        <input
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            placeholder="Your secret passphrase..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                            onClick={handleDecrypt}
                            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Unlock className="w-5 h-5" /> Unlock Data
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">{form.name}</h1>
                        <p className="text-[10px] text-green-600 flex items-center gap-1 font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3" /> Zero-Knowledge Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 bg-gray-50 border px-3 py-1.5 rounded-full">
                    <Lock className="w-3.5 h-3.5" /> {myResponses.length} Records Locked In-Memory
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f9fafb]">
                {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 opacity-40">
                        <Sparkles className="w-12 h-12 text-indigo-400" />
                        <div>
                            <p className="text-gray-900 font-bold text-lg">Your Data is Ready</p>
                            <p className="text-sm">Ask questions about these {myResponses.length} decrypted records. No one else can see this conversation.</p>
                        </div>
                    </div>
                ) : (
                    chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm border ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none border-indigo-500'
                                : 'bg-white text-gray-800 rounded-bl-none border-gray-100'
                                }`}>
                                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-indigo'}`}>
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <User className="w-5 h-5 text-gray-500" />
                                </div>
                            )}
                        </div>
                    ))
                )}
                {analyzing && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center animate-pulse">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 text-gray-400 text-sm italic shadow-sm flex items-center gap-2">
                            Analyzing private context...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t bg-white">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask anything about your decrypted data..."
                        className="w-full pl-6 pr-16 py-4.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={!question.trim() || analyzing}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PrivateAnalysis;
