import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import instance from '../axios';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';

function toFieldKey(input, fallback) {
    const base = String(input ?? '').trim();
    if (!base) return fallback;
    const key = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return key || fallback;
}

const CreateForm = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [privacyMode, setPrivacyMode] = useState('encrypted');
    const [fields, setFields] = useState([
        {
            label: '',
            type: 'text',
            required: true,
            description: '',
            optionsText: '',
            validation: { min: '', max: '', minLength: '', maxLength: '', pattern: '' },
        },
    ]);
    const [loading, setLoading] = useState(false);

    const handleAddField = () => {
        setFields([
            ...fields,
            {
                label: '',
                type: 'text',
                required: false,
                description: '',
                optionsText: '',
                validation: { min: '', max: '', minLength: '', maxLength: '', pattern: '' },
            },
        ]);
    };

    const handleRemoveField = (index) => {
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
    };

    const handleDuplicateField = (index) => {
        const newFields = [...fields];
        const clone = {
            ...newFields[index],
            label: `${newFields[index].label || 'Question'} (copy)`,
        };
        newFields.splice(index + 1, 0, clone);
        setFields(newFields);
    };

    const moveField = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= fields.length) return;
        const newFields = [...fields];
        const [moved] = newFields.splice(fromIndex, 1);
        newFields.splice(toIndex, 0, moved);
        setFields(newFields);
    };

    const handleFieldChange = (index, key, value) => {
        const newFields = [...fields];
        newFields[index][key] = value;
        setFields(newFields);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const fieldsPayload = fields.map((field, index) => {
                const label = String(field.label ?? '').trim();
                const key = String(field.key ?? '').trim() || toFieldKey(label, `field_${index + 1}`);
                const type = String(field.type ?? '').trim() || 'text';

                let config;
                if (type === 'enum') {
                    const options = String(field.optionsText ?? '')
                        .split('\n')
                        .map((opt) => opt.trim())
                        .filter(Boolean);
                    if (options.length === 0) {
                        throw new Error(`Dropdown field "${label || key}" requires at least one option.`);
                    }
                    config = { options };
                } else {
                    const validation = field.validation || {};
                    const hasValidation = Object.values(validation).some((v) => String(v ?? '').trim() !== '');
                    if (hasValidation) {
                        config = {
                            validation: {
                                min: validation.min !== '' ? Number(validation.min) : undefined,
                                max: validation.max !== '' ? Number(validation.max) : undefined,
                                minLength: validation.minLength !== '' ? Number(validation.minLength) : undefined,
                                maxLength: validation.maxLength !== '' ? Number(validation.maxLength) : undefined,
                                pattern: validation.pattern ? String(validation.pattern) : undefined,
                            },
                        };
                    }
                }

                return {
                    key,
                    label: label || key,
                    type,
                    required: Boolean(field.required),
                    description: field.description || undefined,
                    config,
                };
            });

            await instance.post('/api/forms', {
                name,
                privacyMode,
                fields: fieldsPayload,
                responses: [] // Start empty
            });
            navigate('/app');
        } catch (error) {
            console.error('Error creating form:', error);
            alert(error?.message || 'Failed to create form');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
            <form onSubmit={handleSubmit} className="flex">
                <aside className="w-64 border border-[#1a1a1a] bg-[#f5f5f0]">
                    <div className="border-b border-[#1a1a1a] px-8 py-8">
                        <div className="font-crimson text-[24px] tracking-[-1.2px]">RAG.FORMS</div>
                        <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Architectural Edition</div>
                    </div>
                    <nav className="py-8">
                        <Link to="/app" className="flex items-center gap-4 px-8 py-4 text-[12px] uppercase tracking-[1.2px]">Dashboard</Link>
                        <div className="flex items-center gap-4 bg-[#1a1a1a] px-8 py-4 text-[12px] uppercase tracking-[1.2px] text-[#f5f5f0]">Create New</div>
                    </nav>
                    <div className="border-t border-[#1a1a1a] px-8 py-8">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[1px] text-[#64748b]">
                            <span>Encryption:</span>
                            <span className="text-[#1a1a1a]">Active</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[1px] text-[#64748b]">
                            <span>System:</span>
                            <span className="text-[#1a1a1a]">STARK_03</span>
                        </div>
                    </div>
                </aside>

                <main className="flex-1">
                    <div className="px-12 py-12">
                        <div className="text-[10px] uppercase tracking-[4px] text-[#64748b]">Process / 01</div>
                        <h1 className="font-crimson text-[72px] uppercase tracking-[-3.6px]">Builder<br />Interface</h1>
                        <div className="mt-6 border-l border-[#1a1a1a] pl-6 text-[18px] font-light leading-[28px] text-[#64748b]">
                            The construction of encrypted data structures through minimalist architectural principles.
                        </div>

                        <section className="mt-16">
                            <div className="border-b border-[#1a1a1a] pb-2">
                                <div className="flex items-baseline gap-4 font-crimson uppercase">
                                    <div className="text-[24px]">01</div>
                                    <div className="text-[30px] tracking-[-1.5px]">Structural Info</div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Form Nomenclature</div>
                                <div className="mt-2 border border-[#1a1a1a] p-4 font-crimson text-[20px]">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Customer Feedback 2024"
                                        className="w-full bg-transparent outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="mt-16">
                            <div className="border-b border-[#1a1a1a] pb-2">
                                <div className="flex items-baseline gap-4 font-crimson uppercase">
                                    <div className="text-[24px]">02</div>
                                    <div className="text-[30px] tracking-[-1.5px]">Security Protocols</div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Integrity Level</div>
                                <div className="mt-2 border border-[#1a1a1a]">
                                    <select
                                        value={privacyMode}
                                        onChange={(e) => setPrivacyMode(e.target.value)}
                                        className="w-full bg-transparent p-4 font-crimson text-[18px] outline-none"
                                    >
                                        <option value="encrypted">Level A: Full Encryption</option>
                                        <option value="none">Level B: Owner Analysis</option>
                                    </select>
                                </div>
                                <div className="mt-4 bg-[#1a1a1a] px-6 py-4 text-[11px] uppercase tracking-[1.1px] text-[#f5f5f0]">
                                    Warning: Level A protocols require local decryption keys. Owner cannot access raw data without explicit respondent authorization.
                                </div>
                            </div>
                        </section>

                        <section className="mt-16 pb-32">
                            <div className="border-b border-[#1a1a1a] pb-2">
                                <div className="flex items-baseline gap-4 font-crimson uppercase">
                                    <div className="text-[24px]">03</div>
                                    <div className="text-[30px] tracking-[-1.5px]">Input Modules</div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-between text-[10px] uppercase tracking-[1px] text-[#64748b]">
                                <span>Label</span>
                                <span className="underline">Import Batch</span>
                            </div>

                            <div className="mt-8 space-y-8">
                                {fields.map((field, index) => (
                                    <div key={index} className="relative border border-[#1a1a1a] p-8 shadow-[1px_1px_0px_0px_#1a1a1a]">
                                        <div className="grid grid-cols-[1fr_180px] gap-8">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Label</div>
                                                <div className="mt-2 border-b border-[#1a1a1a] pb-2 font-crimson text-[20px]">
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                                                        placeholder="How satisfied are you with our service?"
                                                        className="w-full bg-transparent outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Component Type</div>
                                                <div className="mt-2 border border-[#1a1a1a] px-3 py-2 text-[12px] uppercase tracking-[1.2px]">
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                                                        className="w-full bg-transparent outline-none"
                                                    >
                                                        <option value="text">Short Answer</option>
                                                        <option value="textarea">Paragraph</option>
                                                        <option value="number">Number</option>
                                                        <option value="email">Email</option>
                                                        <option value="date">Date</option>
                                                        <option value="enum">Dropdown</option>
                                                        <option value="boolean">Yes/No</option>
                                                        <option value="section">Section</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between border-t border-[#1a1a1a]/10 pt-4">
                                            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] text-[#64748b]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(field.required)}
                                                    onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                                                    className="h-3 w-3"
                                                    disabled={field.type === 'section'}
                                                />
                                                Mandatory
                                            </label>
                                            <div className="flex items-center gap-4 text-[#64748b]">
                                                <button type="button" onClick={() => moveField(index, index - 1)} disabled={index === 0}>
                                                    <ArrowUp className="h-4 w-4" />
                                                </button>
                                                <button type="button" onClick={() => moveField(index, index + 1)} disabled={index === fields.length - 1}>
                                                    <ArrowDown className="h-4 w-4" />
                                                </button>
                                                <button type="button" onClick={() => handleDuplicateField(index)}>
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                {fields.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveField(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleAddField}
                                className="mt-8 border border-dashed border-[#1a1a1a] px-12 py-4 text-[10px] uppercase tracking-[1px]"
                            >
                                Append Component
                            </button>
                        </section>
                    </div>

                    <div className="border-t border-[#1a1a1a] bg-[#f5f5f0] px-12 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[9px] uppercase tracking-[0.9px] text-[#64748b]">Current State:</div>
                                <div className="text-[10px] uppercase">Unsaved Draft</div>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" className="border border-[#1a1a1a] px-8 py-3 text-[10px] uppercase tracking-[1px]">
                                    Cache Draft
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#1a1a1a] px-12 py-3 text-[10px] uppercase tracking-[1px] text-[#f5f5f0] shadow-[1px_1px_0px_0px_#1a1a1a]"
                                >
                                    {loading ? 'Finalizing...' : 'Finalize Structure'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                <aside className="hidden w-[450px] bg-[#1a1a1a] text-[#f5f5f0] lg:block">
                    <div className="p-12">
                        <div className="border-b border-white/20 pb-8">
                            <div className="font-crimson text-[36px] uppercase tracking-[-1.8px]">{name || 'Customer Feedback 2024'}</div>
                            <div className="mt-4 text-[12px] uppercase tracking-[1.2px] opacity-50">Secure Transmission Port v.01</div>
                        </div>
                        <div className="mt-10 space-y-8">
                            {fields.filter((f) => f.type !== 'section').map((field, idx) => (
                                <div key={`preview-${idx}`}>
                                    <div className="text-[11px] uppercase tracking-[1.1px] text-[#64748b]">
                                        {String(idx + 1).padStart(2, '0')}. {field.label || 'Untitled'} {field.required ? '*' : ''}
                                    </div>
                                    <div className="mt-4 border border-white/20 p-4">
                                        <div className="h-3 w-3 border border-white" />
                                        <div className="mt-2 font-crimson text-[14px]">{field.type === 'enum' ? 'Option' : 'Entry point...'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-12 bg-[#f5f5f0] py-4 text-center text-[10px] uppercase tracking-[3px] text-[#1a1a1a]">
                            Execute Transmission
                        </div>
                    </div>
                    <div className="border-t border-white/20 py-4 text-center text-[8px] uppercase tracking-[0.8px] text-[#64748b]">
                        Architectural Metadata Protected by RAG.V3
                    </div>
                </aside>
            </form>
        </div>
    );
};

export default CreateForm;
