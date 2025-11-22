(function(wp) {
    const { createElement: el, useState, useEffect, useRef, useCallback } = wp.element;

    // Bağımlılıkları al
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;

    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : {
        getPriorityColor: () => '#808080',
        cleanTaskTitle: (t) => t,
        renderRichText: (t) => t,
        calculateDateFromText: () => null
    };
    const { getPriorityColor, cleanTaskTitle, renderRichText, calculateDateFromText } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    // === YARDIMCI FONKSİYONLAR ===
    const ALLOWED_TAGS = {
        title: ['strong', 'em', 'u', 's', 'code', 'a', 'br', 'span'],
        desc: ['strong', 'em', 'u', 's', 'code', 'a', 'br', 'span', 'h1', 'h2', 'blockquote', 'ul', 'ol', 'li']
    };

    const normalizeTag = (tag) => {
        const map = { b: 'strong', i: 'em', del: 's', strike: 's', ins: 'u' };
        return map[tag] || tag;
    };

    const isSafeUrl = (url) => {
        try {
            const parsed = new URL(url, window.location.origin);
            return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
        } catch (e) {
            return false;
        }
    };

    const sanitizeNode = (node, mode) => {
        const allowed = ALLOWED_TAGS[mode];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
        let current = walker.nextNode(); // root elementi atla
        while (current) {
            const tag = normalizeTag(current.tagName.toLowerCase());
            if (!allowed.includes(tag)) {
                const parent = current.parentNode;
                const fragment = document.createDocumentFragment();
                while (current.firstChild) fragment.appendChild(current.firstChild);
                parent.replaceChild(fragment, current);
            } else {
                // Temiz attribute seti
                [...current.attributes].forEach(attr => {
                    if (tag === 'a' && attr.name === 'href') {
                        if (!isSafeUrl(attr.value)) current.removeAttribute('href');
                    } else {
                        current.removeAttribute(attr.name);
                    }
                });
                if (tag === 'a') {
                    current.setAttribute('target', '_blank');
                    current.setAttribute('rel', 'noopener noreferrer');
                }
                if (tag !== current.tagName.toLowerCase()) {
                    const newEl = document.createElement(tag);
                    while (current.firstChild) newEl.appendChild(current.firstChild);
                    current.parentNode.replaceChild(newEl, current);
                }
            }
            current = walker.nextNode();
        }
    };

    const sanitizeHTML = (html, mode) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        sanitizeNode(tmp, mode);
        return tmp.innerHTML;
    };

    const textToFragment = (text, mode) => {
        const frag = document.createDocumentFragment();
        if (!text) return frag;
        const pattern = /(\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
        let lastIndex = 0; let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            const token = match[0];
            if (token.startsWith('**') && token.endsWith('**')) {
                const strong = document.createElement('strong');
                strong.textContent = token.slice(2, -2);
                frag.appendChild(strong);
            } else if ((token.startsWith('_') && token.endsWith('_'))) {
                const em = document.createElement('em');
                em.textContent = token.slice(1, -1);
                frag.appendChild(em);
            } else if (token.startsWith('~~') && token.endsWith('~~')) {
                const s = document.createElement('s');
                s.textContent = token.slice(2, -2);
                frag.appendChild(s);
            } else if (token.startsWith('`') && token.endsWith('`')) {
                const code = document.createElement('code');
                code.textContent = token.slice(1, -1);
                frag.appendChild(code);
            } else {
                const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (linkMatch && isSafeUrl(linkMatch[2])) {
                    const a = document.createElement('a');
                    a.textContent = linkMatch[1];
                    a.href = linkMatch[2];
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    frag.appendChild(a);
                } else {
                    frag.appendChild(document.createTextNode(token));
                }
            }
            lastIndex = pattern.lastIndex;
        }
        if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        return frag;
    };

    const markdownToHtml = (text, mode) => {
        const lines = text.split(/\r?\n/);
        const root = document.createElement('div');
        lines.forEach(raw => {
            let line = raw;
            if (!line.trim()) { root.appendChild(document.createElement('br')); return; }
            if (mode === 'desc') {
                if (line.startsWith('## ')) {
                    const h2 = document.createElement('h2');
                    h2.appendChild(textToFragment(line.replace(/^##\s+/, ''), mode));
                    root.appendChild(h2); return;
                }
                if (line.startsWith('# ')) {
                    const h1 = document.createElement('h1');
                    h1.appendChild(textToFragment(line.replace(/^#\s+/, ''), mode));
                    root.appendChild(h1); return;
                }
                if (line.startsWith('> ')) {
                    const bq = document.createElement('blockquote');
                    bq.appendChild(textToFragment(line.replace(/^>\s+/, ''), mode));
                    root.appendChild(bq); return;
                }
                if (line.match(/^\d+\.\s+/)) {
                    const ol = document.createElement('ol');
                    const li = document.createElement('li');
                    li.appendChild(textToFragment(line.replace(/^\d+\.\s+/, ''), mode));
                    ol.appendChild(li); root.appendChild(ol); return;
                }
                if (line.match(/^(\-|\*)\s+/)) {
                    const ul = document.createElement('ul');
                    const li = document.createElement('li');
                    li.appendChild(textToFragment(line.replace(/^(\-|\*)\s+/, ''), mode));
                    ul.appendChild(li); root.appendChild(ul); return;
                }
            }
            const span = document.createElement('span');
            span.appendChild(textToFragment(line, mode));
            root.appendChild(span);
            root.appendChild(document.createElement('br'));
        });
        sanitizeNode(root, mode);
        return root.innerHTML;
    };

    const applyInlineMarkdown = (editor, mode) => {
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => n.parentElement && !['CODE', 'A'].includes(n.parentElement.tagName)
        });
        const toUpdate = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.match(/\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)/)) {
                toUpdate.push(node);
            }
        }
        toUpdate.forEach(textNode => {
            const frag = textToFragment(textNode.nodeValue, mode);
            textNode.parentNode.replaceChild(frag, textNode);
        });
    };

    const applyBlockMarkdown = (editor, mode) => {
        if (mode !== 'desc') return;
        const children = Array.from(editor.childNodes);
        children.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim()) {
                const span = document.createElement('span');
                span.textContent = child.nodeValue;
                editor.replaceChild(span, child);
                child = span;
            }
            if (!(child.nodeType === Node.ELEMENT_NODE)) return;
            const text = child.textContent.trim();
            if (text.startsWith('## ')) {
                const h2 = document.createElement('h2');
                h2.appendChild(textToFragment(text.replace(/^##\s+/, ''), mode));
                editor.replaceChild(h2, child); return;
            }
            if (text.startsWith('# ')) {
                const h1 = document.createElement('h1');
                h1.appendChild(textToFragment(text.replace(/^#\s+/, ''), mode));
                editor.replaceChild(h1, child); return;
            }
            if (text.startsWith('> ')) {
                const bq = document.createElement('blockquote');
                bq.appendChild(textToFragment(text.replace(/^>\s+/, ''), mode));
                editor.replaceChild(bq, child); return;
            }
            if (text.match(/^\d+\.\s+/)) {
                const ol = document.createElement('ol');
                const li = document.createElement('li');
                li.appendChild(textToFragment(text.replace(/^\d+\.\s+/, ''), mode));
                ol.appendChild(li); editor.replaceChild(ol, child); return;
            }
            if (text.match(/^(\-|\*)\s+/)) {
                const ul = document.createElement('ul');
                const li = document.createElement('li');
                li.appendChild(textToFragment(text.replace(/^(\-|\*)\s+/, ''), mode));
                ul.appendChild(li); editor.replaceChild(ul, child); return;
            }
        });
    };

    const insertHtmlAtSelection = (html, editor) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node; let lastNode = null;
        while ((node = temp.firstChild)) {
            lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
        editor.focus();
    };

    const wrapSelection = (editor, tag, attrs = {}) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) return;
        if (range.collapsed) return;
        const wrapper = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => wrapper.setAttribute(k, v));
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        newRange.collapse(false);
        selection.addRange(newRange);
    };

    const applyLink = (editor, url) => {
        if (!url || !isSafeUrl(url)) return;
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;
        wrapSelection(editor, 'a', { href: url, target: '_blank', rel: 'noopener noreferrer' });
    };

    const toggleBlock = (editor, format) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        while (node && node !== editor && node.nodeType === Node.ELEMENT_NODE && !['DIV', 'P', 'LI', 'H1', 'H2', 'BLOCKQUOTE'].includes(node.tagName)) {
            node = node.parentNode;
        }
        if (!node || node === editor) return;
        const text = node.textContent || '';
        const newTag = format === 'h1' ? 'h1' : format === 'h2' ? 'h2' : format === 'quote' ? 'blockquote' : null;
        if (newTag) {
            if (node.tagName.toLowerCase() === newTag) {
                const span = document.createElement('span');
                span.textContent = text;
                node.parentNode.replaceChild(span, node);
            } else {
                const elBlock = document.createElement(newTag);
                elBlock.textContent = text;
                node.parentNode.replaceChild(elBlock, node);
            }
            return;
        }
        if (format === 'ul' || format === 'ol') {
            const list = document.createElement(format);
            const li = document.createElement('li');
            li.textContent = text;
            list.appendChild(li);
            node.parentNode.replaceChild(list, node);
        }
    };

    const plainTextFromHtml = (html) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || '';
    };

    // === BİLEŞENLER ===
    const LinkPopover = ({ anchor, onSubmit, onClose }) => {
        const [url, setUrl] = useState('');
        const inputRef = useRef(null);
        useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
        if (!anchor) return null;
        const style = { left: anchor.left, top: anchor.top - 50 };
        return el('div', { className: 'h2l-tooltip-popover', style, onMouseDown: (e) => e.preventDefault() },
            el('div', { className: 'h2l-tooltip-link-area' },
                el('input', {
                    ref: inputRef,
                    className: 'h2l-tooltip-input',
                    placeholder: 'https://...',
                    value: url,
                    onChange: e => setUrl(e.target.value),
                    onKeyDown: e => {
                        if (e.key === 'Enter') { e.preventDefault(); onSubmit(url); setUrl(''); }
                        if (e.key === 'Escape') onClose();
                    }
                }),
                el('button', { className: 'h2l-tooltip-btn', onClick: () => { onSubmit(url); setUrl(''); } }, el(Icon, { name: 'check' })),
                el('button', { className: 'h2l-tooltip-btn', onClick: onClose }, el(Icon, { name: 'xmark' }))
            )
        );
    };

    const EditorToolbar = ({ mode, onCommand }) => {
        const buttons = mode === 'title'
            ? [
                { key: 'bold', icon: 'bold', title: 'Kalın (Ctrl/Cmd+B)' },
                { key: 'italic', icon: 'italic', title: 'İtalik (Ctrl/Cmd+I)' },
                { key: 'underline', icon: 'underline', title: 'Altı çizili (Ctrl/Cmd+U)' },
                { key: 'strike', icon: 'strikethrough', title: 'Üstü çizili (Ctrl/Cmd+Shift+X)' },
                { key: 'code', icon: 'code', title: 'Kod ( ` )' },
                { key: 'link', icon: 'link', title: 'Bağlantı (Ctrl/Cmd+K)' }
            ] : [
                { key: 'bold', icon: 'bold', title: 'Kalın' },
                { key: 'italic', icon: 'italic', title: 'İtalik' },
                { key: 'underline', icon: 'underline', title: 'Altı çizili' },
                { key: 'strike', icon: 'strikethrough', title: 'Üstü çizili' },
                { key: 'h1', icon: 'heading', title: 'Başlık 1 (#)' },
                { key: 'h2', icon: 'heading', title: 'Başlık 2 (##)' },
                { key: 'quote', icon: 'quote-right', title: 'Alıntı (> )' },
                { key: 'ul', icon: 'list-ul', title: 'Madde işaretli' },
                { key: 'ol', icon: 'list-ol', title: 'Numaralı' },
                { key: 'code', icon: 'code', title: 'Kod' },
                { key: 'link', icon: 'link', title: 'Bağlantı' }
            ];
        return el('div', { className: 'h2l-editor-toolbar' },
            buttons.map(btn => el('button', {
                key: btn.key,
                className: 'h2l-toolbar-btn',
                title: btn.title,
                type: 'button',
                onMouseDown: e => { e.preventDefault(); onCommand(btn.key); }
            }, el(Icon, { name: btn.icon })))
        );
    };

    const RichEditor = ({ mode = 'title', placeholder, value = '', onChange, autoFocus, onKeyDown }) => {
        const editorRef = useRef(null);
        const [linkAnchor, setLinkAnchor] = useState(null);
        const [html, setHtml] = useState('');

        const syncValue = useCallback((incoming) => {
            const target = editorRef.current;
            if (!target) return;
            const sanitized = sanitizeHTML(incoming || '', mode);
            if (sanitized !== target.innerHTML) target.innerHTML = sanitized || '';
            setHtml(sanitized);
        }, [mode]);

        useEffect(() => { syncValue(value || markdownToHtml(value, mode)); }, [value, syncValue, mode]);

        useEffect(() => {
            if (autoFocus && editorRef.current) {
                editorRef.current.focus();
            }
        }, [autoFocus]);

        const emitChange = () => {
            const target = editorRef.current;
            if (!target) return;
            sanitizeNode(target, mode);
            applyInlineMarkdown(target, mode);
            applyBlockMarkdown(target, mode);
            const updated = target.innerHTML;
            setHtml(updated);
            if (onChange) onChange(updated, target.innerText);
        };

        const handleShortcut = (e) => {
            const mod = e.metaKey || e.ctrlKey;
            const shift = e.shiftKey;
            if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); wrapSelection(editorRef.current, 'strong'); emitChange(); }
            else if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); wrapSelection(editorRef.current, 'em'); emitChange(); }
            else if (mod && e.key.toLowerCase() === 'u') { e.preventDefault(); wrapSelection(editorRef.current, 'u'); emitChange(); }
            else if (mod && shift && e.key.toLowerCase() === 'x') { e.preventDefault(); wrapSelection(editorRef.current, 's'); emitChange(); }
            else if (mod && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
                if (rect) setLinkAnchor({ left: rect.left, top: rect.top + window.scrollY });
            }
            else if (!mod && e.key === '`') {
                const sel = window.getSelection();
                if (sel && sel.rangeCount && !sel.isCollapsed) { e.preventDefault(); wrapSelection(editorRef.current, 'code'); emitChange(); }
            }
            if (onKeyDown) onKeyDown(e);
        };

        const handlePaste = (e) => {
            e.preventDefault();
            const htmlData = e.clipboardData.getData('text/html');
            const textData = e.clipboardData.getData('text/plain');
            const minimal = htmlData ? sanitizeHTML(htmlData, mode) : markdownToHtml(textData, mode);
            insertHtmlAtSelection(minimal, editorRef.current);
            emitChange();
        };

        const handleCommand = (cmd) => {
            if (['bold', 'italic', 'underline', 'strike', 'code'].includes(cmd)) {
                const tag = cmd === 'bold' ? 'strong' : cmd === 'italic' ? 'em' : cmd === 'underline' ? 'u' : cmd === 'strike' ? 's' : 'code';
                wrapSelection(editorRef.current, tag);
                emitChange();
            } else if (['h1', 'h2', 'quote', 'ul', 'ol'].includes(cmd)) {
                toggleBlock(editorRef.current, cmd);
                emitChange();
            } else if (cmd === 'link') {
                const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
                if (rect) setLinkAnchor({ left: rect.left, top: rect.top + window.scrollY });
            }
        };

        const applyLinkFromPopover = (url) => { applyLink(editorRef.current, url); setLinkAnchor(null); emitChange(); };

        return el('div', { className: `h2l-editor-shell ${mode}` },
            el(EditorToolbar, { mode, onCommand: handleCommand }),
            el('div', {
                className: `h2l-rich-editor ${mode === 'title' ? 'h2l-title-editor' : 'h2l-desc-editor'}`,
                contentEditable: true,
                ref: editorRef,
                'data-placeholder': placeholder,
                onInput: emitChange,
                onKeyDown: handleShortcut,
                onPaste: handlePaste,
                spellCheck: true
            }, undefined),
            linkAnchor && el(LinkPopover, { anchor: linkAnchor, onSubmit: applyLinkFromPopover, onClose: () => setLinkAnchor(null) })
        );
    };

    // === INLINE TASK EDITOR ===
    const InlineTaskEditor = ({ task, users, onSave, onCancel }) => {
        const [title, setTitle] = useState(task.title || '');
        const [description, setDescription] = useState(task.content || '');
        const [priority, setPriority] = useState(task.priority || 4);
        const [assigneeId, setAssigneeId] = useState(task.assignees && task.assignees.length > 0 ? task.assignees[0] : null);
        const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split(' ')[0] : '');

        const [activePopup, setActivePopup] = useState(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    if (event.target.closest('.h2l-tooltip-popover')) return;
                    setActivePopup(null);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [wrapperRef]);

        const handleSubmit = () => {
            const titleText = plainTextFromHtml(title);
            if (titleText.trim() && titleText.length <= MAX_CHARS) {
                const cleanTitle = cleanTaskTitle(titleText);
                onSave({ id: task.id, title: cleanTitle, title_html: title, content: description, priority, assignees: assigneeId ? [assigneeId] : [], dueDate });
            }
        };

        const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } if (e.key === 'Escape') onCancel(); };

        const renderPopupContent = () => {
            if (!activePopup) return null;
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu top-aligned' }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu top-aligned' }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') {
                const today = new Date().toISOString().split('T')[0]; const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                return el('div', { className: 'h2l-popover-menu top-aligned', style: { padding: '10px' } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(today); setActivePopup(null); } }, el(Icon, { name: 'sun', style: { color: '#27ae60', marginRight: 8 } }), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(tomorrow); setActivePopup(null); } }, el(Icon, { name: 'sun', style: { color: '#e67e22', marginRight: 8 } }), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: '5px' } }, el('input', { type: 'date', className: 'h2l-input', style: { fontSize: '12px', padding: '4px' }, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } }))));
            }
        };

        const selectedUser = assigneeId ? users.find(u => parseInt(u.id) === parseInt(assigneeId)) : null;
        const charCount = plainTextFromHtml(title).length; const isLimitExceeded = charCount > MAX_CHARS;

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef, style: { marginLeft: 28 } },
            el('div', { className: 'h2l-todoist-editor-body' },
                el(RichEditor, {
                    value: title, onChange: (htmlVal) => setTitle(htmlVal), placeholder: 'Görev adı', mode: 'title', autoFocus: true, onKeyDown: handleKeyDown
                }),
                el(RichEditor, {
                    value: description, onChange: (htmlVal) => setDescription(htmlVal), placeholder: 'Açıklama', mode: 'desc'
                }),
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Limit aşıldı: ${charCount} / ${MAX_CHARS}`),
                el('div', { className: 'h2l-todoist-chips-area' },
                    el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date'), style: dueDate ? { color: '#db4c3f', borderColor: '#db4c3f', background: '#fff5f5' } : {} }, el(Icon, { name: 'calendar' }), dueDate ? ` ${dueDate}` : ' Tarih'),
                    el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 4, display: 'inline-block', verticalAlign: 'middle' } }), ` ${selectedUser.name}`] : [el(Icon, { name: 'user' }), ' Atanan']),
                    el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, { name: 'flag' }), ` P${priority}`),
                    el('div', { style: { position: 'relative', display: 'inline-block' } }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'more' ? null : 'more') }, el(Icon, { name: 'ellipsis' })), renderPopupContent())
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-todoist-footer-actions', style: { marginLeft: 'auto' } },
                    el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'),
                    el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !plainTextFromHtml(title).trim() || isLimitExceeded }, 'Kaydet')
                )
            )
        );
    };

    // === QUICK ADD ===
    const QuickAdd = ({ sectionId, onAdd, projectTitle = 'Proje Adı', users = [] }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const [description, setDescription] = useState('');
        const [priority, setPriority] = useState(4);
        const [assigneeId, setAssigneeId] = useState(null);
        const [dueDate, setDueDate] = useState('');
        const [activePopup, setActivePopup] = useState(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    if (event.target.closest('.h2l-tooltip-popover')) return;
                    setActivePopup(null);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [wrapperRef]);

        useEffect(() => {
            const titleText = plainTextFromHtml(title);
            if (!titleText) return;
            const pMatch = titleText.match(/(?:^|\s)p([1-4])(?:$|\s)/i);
            if (pMatch) setPriority(parseInt(pMatch[1]));
            if (calculateDateFromText) {
                const detectedDate = calculateDateFromText(titleText);
                if (detectedDate) setDueDate(detectedDate);
            }
            const userMatch = titleText.match(/(?:^|\s)@(\w+)/i);
            if (userMatch && users.length > 0) {
                const searchName = userMatch[1].toLowerCase();
                const foundUser = users.find(u => u.name.toLowerCase().includes(searchName));
                if (foundUser) setAssigneeId(foundUser.id);
            }
        }, [title, users]);

        const handleSubmit = () => {
            const titleText = plainTextFromHtml(title);
            if (titleText.trim() && titleText.length <= MAX_CHARS) {
                const cleanTitleValue = cleanTaskTitle(titleText);
                onAdd({ title: cleanTitleValue, title_html: title, content: description, sectionId, priority: priority, assignees: assigneeId ? [assigneeId] : [], dueDate: dueDate });
                setTitle(''); setDescription(''); setPriority(4); setAssigneeId(null); setDueDate(''); setActivePopup(null);
            }
        };

        const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (plainTextFromHtml(title).length <= MAX_CHARS) handleSubmit(); } if (e.key === 'Escape') { setIsEditing(false); setTitle(''); setDescription(''); } };

        const renderPopupContent = () => {
            if (!activePopup) return null;
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu top-aligned' }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu top-aligned' }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') {
                const today = new Date().toISOString().split('T')[0]; const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                return el('div', { className: 'h2l-popover-menu top-aligned', style: { padding: '10px' } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(today); setActivePopup(null); } }, el(Icon, { name: 'sun', style: { color: '#27ae60', marginRight: 8 } }), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(tomorrow); setActivePopup(null); } }, el(Icon, { name: 'sun', style: { color: '#e67e22', marginRight: 8 } }), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: '5px' } }, el('input', { type: 'date', className: 'h2l-input', style: { fontSize: '12px', padding: '4px' }, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } }))));
            }
            if (activePopup === 'more') return el('div', { className: 'h2l-popover-menu top-aligned' }, el('div', { className: 'h2l-menu-item' }, el(Icon, { name: 'tag' }), ' Etiketler (Yakında)'), el('div', { className: 'h2l-menu-item' }, el(Icon, { name: 'location-dot' }), ' Konum (Yakında)'));
        };

        if (!isEditing) return el('div', { className: 'h2l-todoist-add-trigger', onClick: () => setIsEditing(true) }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));

        const selectedUser = assigneeId ? users.find(u => parseInt(u.id) === parseInt(assigneeId)) : null;
        const charCount = plainTextFromHtml(title).length; const isLimitExceeded = charCount > MAX_CHARS;

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef },
            el('div', { className: 'h2l-todoist-editor-body' },
                el(RichEditor, { value: title, onChange: (htmlVal) => setTitle(htmlVal), placeholder: 'Görev adı (Örn: Toplantı p1 yarın @ahmet)', mode: 'title', autoFocus: true, onKeyDown: handleKeyDown }),
                el(RichEditor, { value: description, onChange: (htmlVal) => setDescription(htmlVal), placeholder: 'Açıklama', mode: 'desc' }),
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Limit aşıldı: ${charCount} / ${MAX_CHARS}`),
                el('div', { className: 'h2l-todoist-chips-area' },
                    el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date'), style: dueDate ? { color: '#db4c3f', borderColor: '#db4c3f', background: '#fff5f5' } : {} }, el(Icon, { name: 'calendar' }), dueDate ? ` ${dueDate}` : ' Tarih'),
                    el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 4, display: 'inline-block', verticalAlign: 'middle' } }), ` ${selectedUser.name}`] : [el(Icon, { name: 'user' }), ' Atanan']),
                    el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, { name: 'flag' }), ` P${priority}`),
                    el('div', { style: { position: 'relative', display: 'inline-block' } }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'more' ? null : 'more') }, el(Icon, { name: 'ellipsis' })), renderPopupContent())
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-todoist-project-selector' }, el(Icon, { name: 'list-check', style: { marginRight: 5 } }), projectTitle || 'Proje'),
                el('div', { className: 'h2l-todoist-footer-actions' }, el('button', { className: 'h2l-todoist-btn-cancel', onClick: () => setIsEditing(false) }, 'İptal'), el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !plainTextFromHtml(title).trim() || isLimitExceeded }, 'Görev ekle'))
            )
        );
    };

    window.H2L.TaskInput = {
        RichEditor,
        InlineTaskEditor,
        QuickAdd
    };

})(window.wp);
