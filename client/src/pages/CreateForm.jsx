import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import instance from '../axios';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';

function toFieldKey(input, fallback) {
    const base = String(input ?? '').trim();
    if (!base) return fallback;
    const key = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return key || fallback;
}

const PRIVACY_BY_TYPE = {
    text: 'redacted_analyzable',
    textarea: 'redacted_analyzable',
    number: 'analyzable',
    email: 'derived',
    tel: 'derived',
    date: 'derived',
    enum: 'analyzable',
    boolean: 'analyzable',
};

const PRIVACY_LABELS = {
    private: '🔒 Private / Encrypted Only',
    derived: '🌐 Derived Metadata',
    redacted_analyzable: '🛡️ Redacted Analysis',
    analyzable: '📊 Fully Analyzable',
};

const PRIVACY_DESCRIPTIONS = {
    private: 'Value is encrypted at rest. Completely hidden from AI analysis.',
    derived: 'Only safe metadata extracted (e.g. country code from phone). Raw value encrypted.',
    redacted_analyzable: 'PII auto-redacted (emails, phones, IDs) before AI sees it. Raw value encrypted.',
    analyzable: 'Content included in AI context for analytics. Suitable for non-sensitive fields.',
};

const DRAFT_STORAGE_KEY = 'cipherform:create_form_draft:v1';

const createEmptyField = (required = false) => ({
    label: '',
    type: 'text',
    required,
    description: '',
    privacy: getDefaultPrivacy('text'),
    optionsText: '',
    validation: { min: '', max: '', minLength: '', maxLength: '', pattern: '' },
});

function normalizeDraftField(field, index) {
    const baseField = createEmptyField(index === 0);
    return {
        ...baseField,
        ...field,
        type: field?.type || baseField.type,
        privacy: field?.type === 'section'
            ? undefined
            : field?.privacy || getDefaultPrivacy(field?.type || baseField.type),
        optionsText: field?.optionsText || (Array.isArray(field?.config?.options) ? field.config.options.join('\n') : ''),
        validation: {
            min: field?.validation?.min ?? field?.config?.validation?.min ?? '',
            max: field?.validation?.max ?? field?.config?.validation?.max ?? '',
            minLength: field?.validation?.minLength ?? field?.config?.validation?.minLength ?? '',
            maxLength: field?.validation?.maxLength ?? field?.config?.validation?.maxLength ?? '',
            pattern: field?.validation?.pattern ?? field?.config?.validation?.pattern ?? '',
        },
    };
}

function getDefaultPrivacy(type) {
    return PRIVACY_BY_TYPE[type] || 'private';
}

const CreateForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const draftKey = searchParams.get('draft') || 'create-form';
    const draftStorageKey = `cipherform:create_form_draft:${draftKey}`;
    const isEditMode = Boolean(id);

    const [name, setName] = useState('');
    const [privacyMode, setPrivacyMode] = useState('encrypted');
    const [fields, setFields] = useState([createEmptyField(true)]);
    const [loading, setLoading] = useState(false);
    const [createdForm, setCreatedForm] = useState(null);
    const [copied, setCopied] = useState(false);
    const [draftStatus, setDraftStatus] = useState('');

    const buildShareUrl = (formId) => `${window.location.origin}/share/${formId}`;

    const copyShareLink = async (formId) => {
        const url = buildShareUrl(formId);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (error) {
            console.error('Copy failed:', error);
            window.prompt('Copy this share link:', url);
        }
    };

    useEffect(() => {
        if (isEditMode) {
            const fetchExistingForm = async () => {
                try {
                    setLoading(true);
                    const response = await instance.get(`/api/forms/${id}/admin`);
                    const form = response.data;
                    setName(form.name || '');
                    setPrivacyMode(form.privacyMode || 'encrypted');
                    if (Array.isArray(form.fields) && form.fields.length > 0) {
                        setFields(form.fields.map(normalizeDraftField));
                    }
                    setCreatedForm(form);
                    setDraftStatus('Form loaded for editing');
                } catch (error) {
                    console.error('Unable to fetch form for editing:', error);
                    alert('Could not load form definition for editing.');
                } finally {
                    setLoading(false);
                }
            };
            fetchExistingForm();
            return;
        }

        const restoreDraft = async () => {
            try {
                const response = await instance.get(`/api/drafts/${draftKey}`);
                const draft = response.data;
                if (typeof draft?.name === 'string') setName(draft.name);
                if (draft?.privacyMode === 'encrypted' || draft?.privacyMode === 'none') {
                    setPrivacyMode(draft.privacyMode);
                }
                if (Array.isArray(draft?.fields) && draft.fields.length > 0) {
                    setFields(draft.fields.map(normalizeDraftField));
                }
                window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
                setDraftStatus('Draft restored from remote');
                return;
            } catch (error) {
                if (error?.response?.status && error.response.status !== 404) {
                    console.error('Unable to restore remote draft:', error);
                }
            }

            try {
                const rawDraft = window.localStorage.getItem(draftStorageKey);
                if (!rawDraft) return;
                const draft = JSON.parse(rawDraft);
                if (typeof draft?.name === 'string') setName(draft.name);
                if (draft?.privacyMode === 'encrypted' || draft?.privacyMode === 'none') {
                    setPrivacyMode(draft.privacyMode);
                }
                if (Array.isArray(draft?.fields) && draft.fields.length > 0) {
                    setFields(draft.fields.map(normalizeDraftField));
                }
                setDraftStatus('Draft restored locally');
            } catch (error) {
                console.error('Unable to restore local draft:', error);
            }
        };

        restoreDraft();
    }, [id, isEditMode, draftKey, draftStorageKey]);

    const handleAddField = () => {
        setFields([
            ...fields,
            createEmptyField(false),
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

    const handleValidationChange = (index, key, value) => {
        const newFields = [...fields];
        newFields[index].validation = {
            ...(newFields[index].validation || {}),
            [key]: value,
        };
        setFields(newFields);
    };

    const handleTypeChange = (index, nextType) => {
        const newFields = [...fields];
        const current = newFields[index];
        const defaultValidation = { min: '', max: '', minLength: '', maxLength: '', pattern: '' };
        let nextValidation = { ...(current.validation || defaultValidation) };

        if (nextType === 'email' && !nextValidation.pattern) {
            nextValidation.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
        }
        if (nextType === 'tel' && !nextValidation.pattern) {
            nextValidation.pattern = '^\\+?[0-9\\s()-]{7,20}$';
        }
        if (nextType === 'section') {
            nextValidation = defaultValidation;
        }

        newFields[index] = {
            ...current,
            type: nextType,
            required: nextType === 'section' ? false : current.required,
            privacy: nextType === 'section' ? undefined : getDefaultPrivacy(nextType),
            optionsText: nextType === 'enum' ? current.optionsText : '',
            validation: nextValidation,
        };
        setFields(newFields);
    };

    const cacheDraft = async () => {
        if (isEditMode) {
            setDraftStatus('Editing published form. Click Save Changes to apply.');
            return;
        }
        const draftPayload = {
            name,
            privacyMode,
            fields,
        };

        try {
            window.localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
            await instance.put(`/api/drafts/${draftKey}`, draftPayload);
            setDraftStatus('Draft saved remotely');
        } catch (error) {
            console.error('Unable to cache draft remotely:', error);
            setDraftStatus('Draft cached locally');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const fieldsPayload = fields.map((field, index) => {
                const label = String(field.label ?? '').trim();
                const type = String(field.type ?? '').trim() || 'text';
                if (type !== 'section' && !label) {
                    throw new Error(`Field label is required at position ${index + 1}.`);
                }
                const key = String(field.key ?? '').trim() || toFieldKey(label, `field_${index + 1}`);

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

                if (type === 'email' && !config?.validation?.pattern) {
                    config = {
                        ...(config || {}),
                        validation: {
                            ...(config?.validation || {}),
                            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                        },
                    };
                }

                if (type === 'tel' && !config?.validation?.pattern) {
                    config = {
                        ...(config || {}),
                        validation: {
                            ...(config?.validation || {}),
                            pattern: '^\\+?[0-9\\s()-]{7,20}$',
                        },
                    };
                }

                return {
                    key,
                    label: label || key,
                    type,
                    required: Boolean(field.required),
                    description: field.description || undefined,
                    privacy: type === 'section' ? undefined : field.privacy || getDefaultPrivacy(type),
                    config,
                };
            });

            if (isEditMode) {
                const response = await instance.put(`/api/forms/${id}`, {
                    name,
                    privacyMode,
                    fields: fieldsPayload,
                });
                setCreatedForm(response.data);
                setDraftStatus('Changes saved successfully');
                alert('Form updated successfully.');
            } else {
                const response = await instance.post('/api/forms', {
                    name,
                    privacyMode,
                    fields: fieldsPayload,
                });
                window.localStorage.removeItem(draftStorageKey);
                try {
                    await instance.delete(`/api/drafts/${draftKey}`);
                } catch (error) {
                    console.error('Unable to clear remote draft:', error);
                }
                setDraftStatus('');
                setCreatedForm(response.data);
            }
        } catch (error) {
            console.error('Error saving form:', error);
            alert(error?.message || 'Failed to save form');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-[#f5f5f0] text-[#1a1a1a]">
            <form onSubmit={handleSubmit} className="flex h-full">
                <Sidebar />

                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto px-12 py-12">
                        <div className="text-[10px] uppercase tracking-[4px] text-[#64748b]">
                            {isEditMode ? 'Form Editor / 01' : 'Process / 01'}
                        </div>
                        <h1 className="font-crimson text-[72px] uppercase tracking-[-3.6px]">
                            {isEditMode ? <>Edit<br />Structure</> : <>Builder<br />Interface</>}
                        </h1>
                        <div className="mt-6 border-l border-[#1a1a1a] pl-6 text-[18px] font-light leading-[28px] text-[#64748b]">
                            {isEditMode
                                ? 'Modify schema attributes, field validation, and encryption protocols for your active form.'
                                : 'The construction of encrypted data structures through minimalist architectural principles.'}
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
                                <div className="mt-2 border border-[#1a1a1a] p-4 font-sans text-[16px] font-medium">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Untitled"
                                        className="w-full bg-transparent font-sans text-[16px] outline-none placeholder:text-[#9ca3af]"
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
                            {createdForm?._id && (
                                <div className="mt-6 border border-[#1a1a1a] bg-[#f9f9f5] p-5">
                                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Share Link</div>
                                    <div className="mt-2 border border-[#1a1a1a] bg-white px-4 py-3 text-[12px] break-all">
                                        {buildShareUrl(createdForm._id)}
                                    </div>
                                    <div className="mt-3 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => copyShareLink(createdForm._id)}
                                            className="border border-[#1a1a1a] px-4 py-2 text-[10px] uppercase tracking-[1px]"
                                        >
                                            {copied ? 'Copied' : 'Copy Share Link'}
                                        </button>
                                        <a
                                            href={buildShareUrl(createdForm._id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-[#1a1a1a] px-4 py-2 text-[10px] uppercase tracking-[1px] text-[#f5f5f0]"
                                        >
                                            Open Public Form
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/app')}
                                            className="border border-[#1a1a1a] px-4 py-2 text-[10px] uppercase tracking-[1px]"
                                        >
                                            Back to Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="mt-8">
                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Integrity Level</div>
                                <div className="mt-2 border border-[#1a1a1a]">
                                    <select
                                        value={privacyMode}
                                        onChange={(e) => setPrivacyMode(e.target.value)}
                                        className="w-full bg-transparent p-4 font-sans text-[14px] font-medium outline-none cursor-pointer"
                                    >
                                        <option value="encrypted">Level A: Full Encryption</option>
                                        <option value="none">Level B: Owner Analysis</option>
                                    </select>
                                </div>
                                <div className="mt-4 bg-[#1a1a1a] px-6 py-4 text-[11px] uppercase tracking-[1.1px] text-[#f5f5f0]">
                                    Level A protocol encrypts responses at rest automatically. Admin analysis remains available through authorized access.
                                </div>
                            </div>
                        </section>

                        <section className="mt-16 pb-16">
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
                                                <div className="mt-2 border-b border-[#1a1a1a] pb-2 font-sans text-[15px] font-medium">
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                                                        placeholder="How satisfied are you with our service?"
                                                        className="w-full bg-transparent font-sans text-[15px] outline-none placeholder:text-[#9ca3af]"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Component Type</div>
                                                <div className="mt-2 border border-[#1a1a1a] px-3 py-2 text-[12px] uppercase tracking-[1.2px]">
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => handleTypeChange(index, e.target.value)}
                                                        className="w-full bg-transparent outline-none"
                                                    >
                                                        <option value="text">Short Answer</option>
                                                        <option value="textarea">Paragraph</option>
                                                        <option value="number">Number</option>
                                                        <option value="email">Email</option>
                                                        <option value="tel">Phone</option>
                                                        <option value="date">Date</option>
                                                        <option value="enum">Dropdown</option>
                                                        <option value="boolean">Yes/No</option>
                                                        <option value="section">Section</option>
                                                    </select>
                                                </div>
                                                {field.type !== 'section' && (
                                                    <div className="mt-3">
                                                        <div className="text-[9px] uppercase tracking-[0.9px] text-[#64748b] mb-1">Field Privacy</div>
                                                        <div className="border border-[#1a1a1a] px-2 py-1">
                                                            <select
                                                                value={field.privacy || getDefaultPrivacy(field.type)}
                                                                onChange={(e) => handleFieldChange(index, 'privacy', e.target.value)}
                                                                className="w-full bg-transparent text-[10px] uppercase tracking-[0.8px] outline-none cursor-pointer"
                                                            >
                                                                <option value="private">🔒 Private</option>
                                                                <option value="redacted_analyzable">🛡️ Redacted</option>
                                                                <option value="derived">🌐 Derived</option>
                                                                <option value="analyzable">📊 Analyzable</option>
                                                            </select>
                                                        </div>
                                                        <div className="mt-1 text-[8.5px] leading-[1.4] text-[#94a3b8]">
                                                            {PRIVACY_DESCRIPTIONS[field.privacy || getDefaultPrivacy(field.type)]}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {field.type === 'enum' && (
                                            <div className="mt-6">
                                                <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Dropdown Options (one per line)</div>
                                                <textarea
                                                    value={field.optionsText || ''}
                                                    onChange={(e) => handleFieldChange(index, 'optionsText', e.target.value)}
                                                    className="mt-2 w-full border border-[#1a1a1a] bg-transparent p-3 text-[12px] outline-none"
                                                    rows={4}
                                                    placeholder={'Option A\nOption B\nOption C'}
                                                />
                                            </div>
                                        )}
                                        {(field.type === 'number' || field.type === 'date') && (
                                            <div className="mt-6 grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Min</div>
                                                    <input
                                                        type={field.type === 'number' ? 'number' : 'date'}
                                                        value={field.validation?.min ?? ''}
                                                        onChange={(e) => handleValidationChange(index, 'min', e.target.value)}
                                                        className="mt-2 w-full border border-[#1a1a1a] bg-transparent px-3 py-2 text-[12px] outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Max</div>
                                                    <input
                                                        type={field.type === 'number' ? 'number' : 'date'}
                                                        value={field.validation?.max ?? ''}
                                                        onChange={(e) => handleValidationChange(index, 'max', e.target.value)}
                                                        className="mt-2 w-full border border-[#1a1a1a] bg-transparent px-3 py-2 text-[12px] outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {(field.type === 'text' || field.type === 'textarea' || field.type === 'email' || field.type === 'tel') && (
                                            <div className="mt-6 grid grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Min Length</div>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={field.validation?.minLength ?? ''}
                                                        onChange={(e) => handleValidationChange(index, 'minLength', e.target.value)}
                                                        className="mt-2 w-full border border-[#1a1a1a] bg-transparent px-3 py-2 text-[12px] outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Max Length</div>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={field.validation?.maxLength ?? ''}
                                                        onChange={(e) => handleValidationChange(index, 'maxLength', e.target.value)}
                                                        className="mt-2 w-full border border-[#1a1a1a] bg-transparent px-3 py-2 text-[12px] outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-[1px] text-[#64748b]">Pattern (regex)</div>
                                                    <input
                                                        type="text"
                                                        value={field.validation?.pattern ?? ''}
                                                        onChange={(e) => handleValidationChange(index, 'pattern', e.target.value)}
                                                        className="mt-2 w-full border border-[#1a1a1a] bg-transparent px-3 py-2 text-[12px] outline-none"
                                                        placeholder={field.type === 'email' ? 'Email regex preset' : field.type === 'tel' ? 'Phone regex preset' : 'Optional'}
                                                    />
                                                </div>
                                            </div>
                                        )}
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
                                <div className="text-[10px] uppercase">
                                    {isEditMode ? 'Published Form (Editing)' : createdForm?._id ? 'Structure Created' : 'Unsaved Draft'}
                                </div>
                                {draftStatus && (
                                    <div className="mt-2 text-[9px] uppercase tracking-[0.9px] text-[#64748b]">{draftStatus}</div>
                                )}
                            </div>
                            <div className="flex gap-4">
                                {!isEditMode && (
                                    <button
                                        type="button"
                                        onClick={cacheDraft}
                                        className="border border-[#1a1a1a] px-8 py-3 text-[10px] uppercase tracking-[1px]"
                                    >
                                        Cache Draft
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#1a1a1a] px-12 py-3 text-[10px] uppercase tracking-[1px] text-[#f5f5f0] shadow-[1px_1px_0px_0px_#1a1a1a]"
                                >
                                    {loading ? (isEditMode ? 'Saving Changes...' : 'Finalizing...') : (isEditMode ? 'Save Changes' : 'Finalize Structure')}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                <aside className="hidden h-full w-[450px] shrink-0 flex-col bg-[#1a1a1a] text-[#f5f5f0] lg:flex">
                    <div className="min-h-0 flex-1 overflow-y-auto p-12">
                        <div className="border-b border-white/20 pb-8">
                            <div className="font-crimson text-[36px] uppercase tracking-[-1.8px]">{name || 'Untitled'}</div>
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
                                        <div className="mt-3 text-[8px] uppercase tracking-[0.8px] text-[#64748b]">
                                            {PRIVACY_LABELS[field.privacy || getDefaultPrivacy(field.type)]}
                                        </div>
                                        <div className="mt-1 text-[7px] leading-[1.3] text-[#64748b] opacity-70">
                                            {PRIVACY_DESCRIPTIONS[field.privacy || getDefaultPrivacy(field.type)]}
                                        </div>
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
