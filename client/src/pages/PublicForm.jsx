import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import instance from '../axios';
import { encryptData } from '../utils/encryption';
import { pipeline } from '@xenova/transformers';

const PublicForm = () => {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [formData, setFormData] = useState({});
    const [passphrase, setPassphrase] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [progress, setProgress] = useState(null);

    const pipeRef = useRef(null);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await instance.get(`/api/forms/${id}`);
                setForm(response.data);
                const fields = Array.isArray(response.data?.fields) && response.data.fields.length
                    ? response.data.fields
                    : Array.isArray(response.data?.schema?.fields)
                        ? response.data.schema.fields
                        : [];

                const initialData = {};
                fields.forEach((field, index) => {
                    const key = field?.key ?? `field_${index + 1}`;
                    initialData[key] = '';
                });
                setFormData(initialData);

                if ((response.data?.privacyMode ?? 'encrypted') === 'encrypted') {
                    if (!pipeRef.current) {
                        pipeRef.current = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
                    }
                }
            } catch (error) {
                console.error('Error loading form:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [id]);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const coerceValue = (field, rawValue) => {
        const type = String(field?.type ?? 'text').toLowerCase();

        if (type === 'number') {
            if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
            const n = Number(rawValue);
            if (Number.isNaN(n)) throw new Error(`Invalid number for "${field?.label ?? field?.key}"`);
            return n;
        }

        if (type === 'boolean') {
            return Boolean(rawValue);
        }

        if (type === 'object' || type === 'array' || type === 'json') {
            if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
            try {
                return JSON.parse(rawValue);
            } catch {
                throw new Error(`Invalid JSON for "${field?.label ?? field?.key}"`);
            }
        }

        return rawValue;
    };

    const validateFieldValue = (field, rawValue) => {
        const type = String(field?.type ?? 'text').toLowerCase();
        const validation = field?.config?.validation || {};

        if (field?.required) {
            if (type === 'boolean') {
                if (!rawValue) throw new Error(`"${field?.label ?? field?.key}" is required`);
            } else if (rawValue === '' || rawValue === null || rawValue === undefined) {
                throw new Error(`"${field?.label ?? field?.key}" is required`);
            }
        }

        if ((type === 'text' || type === 'textarea') && typeof rawValue === 'string') {
            if (validation.minLength !== undefined && rawValue.length < Number(validation.minLength)) {
                throw new Error(`"${field?.label ?? field?.key}" must be at least ${validation.minLength} characters`);
            }
            if (validation.maxLength !== undefined && rawValue.length > Number(validation.maxLength)) {
                throw new Error(`"${field?.label ?? field?.key}" must be at most ${validation.maxLength} characters`);
            }
            if (validation.pattern) {
                const re = new RegExp(validation.pattern);
                if (!re.test(rawValue)) {
                    throw new Error(`"${field?.label ?? field?.key}" does not match the required pattern`);
                }
            }
        }

        if (type === 'number' && rawValue !== '' && rawValue !== null && rawValue !== undefined) {
            const n = Number(rawValue);
            if (validation.min !== undefined && n < Number(validation.min)) {
                throw new Error(`"${field?.label ?? field?.key}" must be at least ${validation.min}`);
            }
            if (validation.max !== undefined && n > Number(validation.max)) {
                throw new Error(`"${field?.label ?? field?.key}" must be at most ${validation.max}`);
            }
        }

        if (type === 'date' && rawValue) {
            if (validation.min && rawValue < validation.min) {
                throw new Error(`"${field?.label ?? field?.key}" must be on or after ${validation.min}`);
            }
            if (validation.max && rawValue > validation.max) {
                throw new Error(`"${field?.label ?? field?.key}" must be on or before ${validation.max}`);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const privacyMode = form?.privacyMode ?? 'encrypted';
        if (privacyMode === 'encrypted' && !passphrase) {
            return alert('Please enter a secret passphrase to encrypt your data.');
        }

        setSubmitting(true);
        try {
            const fields = Array.isArray(form?.fields) && form.fields.length
                ? form.fields
                : Array.isArray(form?.schema?.fields)
                    ? form.schema.fields
                    : [];

            const payload = {};
            for (const field of fields) {
                const key = field?.key;
                if (!key || String(field?.type ?? '').toLowerCase() === 'section') continue;
                const rawValue = formData[key];

                validateFieldValue(field, rawValue);

                payload[key] = coerceValue(field, rawValue);
            }

            if (privacyMode === 'encrypted') {
                setProgress('Generating Private Embedding...');
                const output = await pipeRef.current(JSON.stringify(payload), {
                    pooling: 'mean',
                    normalize: true,
                });
                const embedding = Array.from(output.data);

                setProgress('Encrypting Data...');
                const { encryptedData, iv, salt } = await encryptData(payload, passphrase);

                setProgress('Submitting Securely...');
                await instance.post(`/api/forms/${id}/submit`, {
                    encryptedData,
                    iv,
                    salt,
                    embedding
                });
            } else {
                setProgress('Submitting...');
                await instance.post(`/api/forms/${id}/submit`, {
                    data: payload
                });
            }

            setSubmitted(true);
        } catch (error) {
            console.error('Submission failed:', error);
            alert('Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
            setProgress(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a1a1a] text-[#f5f5f0]">
            <div className="h-12 w-12 border border-[#f5f5f0] mb-4"></div>
            <p className="text-sm uppercase tracking-[2px] text-[#f5f5f0]">Initializing Secure Environment...</p>
        </div>
    );
    if (!form) return <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-[#f5f5f0]">Form not found</div>;

    const fields = Array.isArray(form?.fields) && form.fields.length
        ? form.fields
        : Array.isArray(form?.schema?.fields)
            ? form.schema.fields
            : [];

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6 text-[#f5f5f0]">
                <div className="border border-white/20 p-8 max-w-md w-full text-center">
                    <h2 className="font-crimson text-3xl mb-2 uppercase">Transmission Complete</h2>
                    <p className="text-sm uppercase tracking-[1px] text-[#64748b]">Your submission is secured. Store your passphrase.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-[#f5f5f0]">
            <div className="mx-auto max-w-[450px] px-8 py-12">
                <div className="text-[10px] uppercase tracking-[1.2px] opacity-70">Real-time Spec</div>
                <div className="mt-8 font-crimson text-[36px] uppercase tracking-[-1.8px]">{form.name}</div>
                <div className="mt-3 text-[12px] uppercase tracking-[1.2px] opacity-50">Secure Transmission Port v.01</div>

                <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                    {(form?.privacyMode ?? 'encrypted') === 'encrypted' ? (
                        <div className="border border-white/20 p-4 text-[10px] uppercase tracking-[1px] text-[#64748b]">
                            Passphrase Required
                            <input
                                type="password"
                                required
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="mt-3 w-full bg-transparent text-[14px] outline-none"
                                placeholder="Enter key..."
                            />
                        </div>
                    ) : null}

                    {fields.map((field, idx) => (
                        <div key={idx}>
                            {String(field.type ?? '').toLowerCase() === 'section' ? (
                                <div className="border-t border-white/20 pt-4">
                                    <div className="font-crimson text-[16px] uppercase">{field.label ?? 'Section'}</div>
                                    {field.description ? (
                                        <div className="text-[11px] text-[#64748b]">{field.description}</div>
                                    ) : null}
                                </div>
                            ) : (
                            <>
                            <div className="text-[11px] uppercase tracking-[1.1px] text-[#64748b]">
                                {String(idx + 1).padStart(2, '0')}. {field.label ?? field.key}{field.required ? ' *' : ''}
                            </div>
                            <div className="mt-3 border border-white/20 p-4">
                                {String(field.type ?? '').toLowerCase() === 'boolean' ? (
                                    <label className="inline-flex items-center gap-3 text-[14px]">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(formData[field.key])}
                                            onChange={(e) => handleChange(field.key, e.target.checked)}
                                            className="h-3 w-3"
                                        />
                                        {field.label ?? field.key}
                                    </label>
                                ) : (String(field.type ?? '').toLowerCase() === 'category' || String(field.type ?? '').toLowerCase() === 'enum') ? (
                                    <select
                                        required={Boolean(field.required)}
                                        value={formData[field.key]}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        className="w-full bg-transparent text-[14px] outline-none"
                                    >
                                        <option value="">Select...</option>
                                        {(field?.config?.options || []).map((opt) => (
                                            <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
                                        ))}
                                    </select>
                                ) : (String(field.type ?? '').toLowerCase() === 'textarea') ? (
                                    <textarea
                                        required={Boolean(field.required)}
                                        value={formData[field.key]}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        className="w-full bg-transparent text-[14px] outline-none"
                                        placeholder="Entry point..."
                                        rows={3}
                                    />
                                ) : (
                                    <input
                                        type={String(field.type ?? '').toLowerCase() === 'number'
                                            ? 'number'
                                            : String(field.type ?? '').toLowerCase() === 'date'
                                                ? 'date'
                                                : String(field.type ?? '').toLowerCase() === 'email'
                                                    ? 'email'
                                                    : 'text'}
                                        required={Boolean(field.required)}
                                        value={formData[field.key]}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        className="w-full bg-transparent text-[14px] outline-none"
                                        placeholder="Entry point..."
                                    />
                                )}
                            </div>
                            </>
                            )}
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#f5f5f0] py-4 text-[10px] uppercase tracking-[3px] text-[#1a1a1a]"
                    >
                        {submitting ? (progress || 'Processing...') : 'Execute Transmission'}
                    </button>
                </form>
            </div>
            <div className="border-t border-white/20 py-4 text-center text-[8px] uppercase tracking-[0.8px] text-[#64748b]">
                Architectural Metadata Protected by RAG.V3
            </div>
        </div>
    );
};

export default PublicForm;
