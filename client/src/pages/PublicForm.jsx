import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import instance from '../axios';

function normalizeFormFields(formPayload) {
    const rawFields = Array.isArray(formPayload?.fields) && formPayload.fields.length > 0
        ? formPayload.fields
        : Array.isArray(formPayload?.schema?.fields)
            ? formPayload.schema.fields
            : [];

    return rawFields.map((field, index) => {
        const label = field?.label ?? field?.name ?? `Field ${index + 1}`;
        const key = field?.key ?? field?.name ?? `field_${index + 1}`;
        const type = String(field?.type ?? 'text').toLowerCase();
        return { ...field, key, label, type };
    });
}

const PublicForm = () => {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [progress, setProgress] = useState(null);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const response = await instance.get(`/api/forms/${id}`);
                setForm(response.data);
                const fields = normalizeFormFields(response.data);

                const initialData = {};
                fields.forEach((field) => {
                    if (field?.key) initialData[field.key] = '';
                });
                setFormData(initialData);
            } catch (error) {
                console.error('Error loading form:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [id]);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const sanitizePhoneInput = (value) => {
        const cleaned = String(value || '').replace(/[^0-9+\s()-]/g, '');
        if (!cleaned.includes('+')) return cleaned;
        const noPlus = cleaned.replace(/\+/g, '');
        return cleaned.trim().startsWith('+') ? `+${noPlus}` : noPlus;
    };

    const coerceValue = (field, rawValue) => {
        const type = String(field?.type ?? 'text').toLowerCase();

        if (type === 'number') {
            if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
            const numberValue = Number(rawValue);
            if (Number.isNaN(numberValue)) throw new Error(`Invalid number for "${field?.label ?? field?.key}"`);
            return numberValue;
        }

        if (type === 'boolean') return Boolean(rawValue);

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
            const numberValue = Number(rawValue);
            if (validation.min !== undefined && numberValue < Number(validation.min)) {
                throw new Error(`"${field?.label ?? field?.key}" must be at least ${validation.min}`);
            }
            if (validation.max !== undefined && numberValue > Number(validation.max)) {
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

        if (type === 'email' && rawValue) {
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRe.test(String(rawValue).trim())) {
                throw new Error(`"${field?.label ?? field?.key}" must be a valid email`);
            }
        }

        if (type === 'tel' && rawValue) {
            const compact = String(rawValue).replace(/[\s()-]/g, '');
            if (!/^\+?[0-9]{7,15}$/.test(compact)) {
                throw new Error(`"${field?.label ?? field?.key}" must be a valid phone number`);
            }
        }

        if (type === 'enum' && rawValue) {
            const options = field?.config?.options || [];
            if (!options.includes(rawValue)) {
                throw new Error(`"${field?.label ?? field?.key}" has an invalid option`);
            }
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const privacyMode = form?.privacyMode ?? 'encrypted';

        setSubmitting(true);
        try {
            const fields = normalizeFormFields(form);
            const payload = {};

            for (const field of fields) {
                const key = field?.key;
                if (!key || String(field?.type ?? '').toLowerCase() === 'section') continue;
                const rawValue = formData[key];
                validateFieldValue(field, rawValue);
                payload[key] = coerceValue(field, rawValue);
            }

            setProgress('Submitting...');
            await instance.post(`/api/forms/${id}/submit`, {
                data: payload,
                mode: privacyMode,
            });

            setSubmitted(true);
        } catch (error) {
            console.error('Submission failed:', error);
            const message = error?.response?.data?.error || error?.message || 'Failed to submit form. Please try again.';
            alert(message);
        } finally {
            setSubmitting(false);
            setProgress(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#1a1a1a] text-[#f5f5f0]">
                <div className="h-12 w-12 border border-[#f5f5f0] mb-4"></div>
                <p className="text-sm uppercase tracking-[2px] text-[#f5f5f0]">Initializing Secure Environment...</p>
            </div>
        );
    }

    if (!form) {
        return <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a] text-[#f5f5f0]">Form not found</div>;
    }

    const fields = normalizeFormFields(form);

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6 text-[#f5f5f0]">
                <div className="border border-white/20 p-8 max-w-md w-full text-center">
                    <h2 className="font-crimson text-3xl mb-2 uppercase">Transmission Complete</h2>
                    <p className="text-sm uppercase tracking-[1px] text-[#64748b]">Your submission was saved securely.</p>
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
                    {(form?.privacyMode ?? 'encrypted') === 'encrypted' && (
                        <div className="border border-white/20 p-4 text-[10px] uppercase tracking-[1px] text-[#64748b]">
                            Encryption Active
                            <div className="mt-2 text-[11px] tracking-[0.8px] normal-case text-[#9ca3af]">
                                Your data is encrypted automatically and handled securely by the system.
                            </div>
                        </div>
                    )}

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
                                        {String(idx + 1).padStart(2, '0')}. {field.label}{field.required ? ' *' : ''}
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
                                                minLength={field?.config?.validation?.minLength !== undefined ? Number(field.config.validation.minLength) : undefined}
                                                maxLength={field?.config?.validation?.maxLength !== undefined ? Number(field.config.validation.maxLength) : undefined}
                                                pattern={field?.config?.validation?.pattern || undefined}
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
                                                            : String(field.type ?? '').toLowerCase() === 'tel'
                                                                ? 'tel'
                                                                : 'text'}
                                                required={Boolean(field.required)}
                                                min={String(field.type ?? '').toLowerCase() === 'number' || String(field.type ?? '').toLowerCase() === 'date'
                                                    ? field?.config?.validation?.min
                                                    : undefined}
                                                max={String(field.type ?? '').toLowerCase() === 'number' || String(field.type ?? '').toLowerCase() === 'date'
                                                    ? field?.config?.validation?.max
                                                    : undefined}
                                                minLength={field?.config?.validation?.minLength !== undefined ? Number(field.config.validation.minLength) : undefined}
                                                maxLength={String(field.type ?? '').toLowerCase() === 'tel'
                                                    ? 20
                                                    : field?.config?.validation?.maxLength !== undefined
                                                        ? Number(field.config.validation.maxLength)
                                                        : undefined}
                                                pattern={String(field.type ?? '').toLowerCase() === 'tel'
                                                    ? '^\\+?[0-9\\s()-]{7,20}$'
                                                    : String(field.type ?? '').toLowerCase() === 'email'
                                                        ? '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
                                                    : field?.config?.validation?.pattern || undefined}
                                                inputMode={String(field.type ?? '').toLowerCase() === 'tel' ? 'tel' : undefined}
                                                title={String(field.type ?? '').toLowerCase() === 'tel'
                                                    ? 'Enter a valid phone number'
                                                    : String(field.type ?? '').toLowerCase() === 'email'
                                                        ? 'Enter a valid email address'
                                                        : undefined}
                                                value={formData[field.key]}
                                                onChange={(e) => {
                                                    const fieldType = String(field.type ?? '').toLowerCase();
                                                    if (fieldType === 'tel') {
                                                        handleChange(field.key, sanitizePhoneInput(e.target.value));
                                                        return;
                                                    }
                                                    handleChange(field.key, e.target.value);
                                                }}
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
