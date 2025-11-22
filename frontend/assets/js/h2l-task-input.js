(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    // DÜZELTME: SmartParser'ı aldık
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { 
        getPriorityColor: () => '#808080', 
        SmartParser: { parse: (t) => ({ cleanTitle: t }) } 
    };
    const { getPriorityColor, SmartParser } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    // ... (sanitizeHTML, PasteModal, ContentEditable, TextTooltip AYNI KALIYOR) ...
    const sanitizeHTML = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'A'];
        const clean = (node) => {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                const child = node.childNodes[i];
                if (child.nodeType === 1) { 
                    child.removeAttribute('style'); child.removeAttribute('class'); child.removeAttribute('id');
                    if (!allowedTags.includes(child.tagName)) {
                        if(['DIV', 'P', 'BR', 'LI', 'TR'].includes(child.tagName)) { const space = document.createTextNode(' '); node.insertBefore(space, child); }
                        while (child.firstChild) { node.insertBefore(child.firstChild, child); }
                        node.removeChild(child);
                    } else {
                        const href = child.getAttribute('href');
                        while (child.attributes.length > 0) { child.removeAttribute(child.attributes[0].name); }
                        if (child.tagName === 'A' && href) { child.setAttribute('href', href); child.setAttribute('target', '_blank'); }
                        clean(child);
                    }
                }
            }
        };
        clean(doc.body);
        return doc.body.innerHTML.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const PasteModal = ({ lines, onConfirm, onCancel }) => {
        const [merge, setMerge] = useState(false);
        const taskCount = lines.length;
        return el('div', { className: 'h2l-paste-modal-overlay', onClick: onCancel },
            el('div', { className: 'h2l-paste-modal', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-paste-header' }, el('h3', null, merge ? '1 görev eklensin mi?' : `${taskCount} görev eklensin mi?`)),
                el('div', { className: 'h2l-paste-body' },
                    el('p', null, merge ? 'Yapıştırdığın metin birleştirilerek tek bir görev olarak eklenecek.' : 'Yapıştırdığın metnin her bir satırı ayrı bir görev olarak eklenecek.'),
                    el('div', { className: 'h2l-paste-preview' }, lines.slice(0, 3).map((line, i) => el('div', { key: i, className: 'h2l-preview-line' }, el('span', {className:'bullet'}, '•'), el('span', null, line.substring(0, 50) + (line.length>50?'...':'')))), lines.length > 3 && el('div', { className: 'h2l-preview-more' }, `... ve ${lines.length - 3} satır daha`))
                ),
                el('div', { className: 'h2l-paste-footer' },
                    el('label', { className: 'h2l-paste-checkbox' }, el('input', { type: 'checkbox', checked: merge, onChange: e => setMerge(e.target.checked) }), ' Tek görevde birleştir'),
                    el('div', { className: 'h2l-paste-actions' }, el('button', { className: 'h2l-btn text-cancel', onClick: onCancel }, 'İptal'), el('button', { className: 'h2l-btn primary', onClick: () => onConfirm(merge) }, merge ? 'Görevi ekle' : `${taskCount} görev ekle`))
                )
            )
        );
    };

    const ContentEditable = ({ html, onChange, placeholder, className, autoFocus, onKeyDown, onPasteIntent }) => {
        const contentEditableRef = useRef(null);
        const lastHtml = useRef(html);
        useEffect(() => { if (contentEditableRef.current) { contentEditableRef.current.innerHTML = html; } }, []); 
        useEffect(() => { if (autoFocus && contentEditableRef.current) { contentEditableRef.current.focus(); } }, []);
        const handleInput = (e) => { const newHtml = e.target.innerHTML; lastHtml.current = newHtml; onChange(newHtml); };
        const handleKeyDownLocal = (e) => { if (onKeyDown) onKeyDown(e); };
        const handlePasteLocal = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            const htmlContent = e.clipboardData.getData('text/html');
            const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0);
            if (lines.length > 1 && onPasteIntent) { onPasteIntent(lines, htmlContent); } 
            else { let contentToInsert = htmlContent ? sanitizeHTML(htmlContent) : text; document.execCommand('insertHTML', false, contentToInsert); }
        };
        return el('div', { ref: contentEditableRef, className: `h2l-content-editable ${className}`, contentEditable: true, onInput: handleInput, onKeyDown: handleKeyDownLocal, onPaste: handlePasteLocal, 'data-placeholder': placeholder, suppressContentEditableWarning: true, dir: "ltr", style: { direction: 'ltr', textAlign: 'left', unicodeBidi: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } });
    };

    const TextTooltip = ({ position, onFormat, showLinkInput, onLinkSubmit, onClose }) => {
        const [linkUrl, setLinkUrl] = useState('');
        const inputRef = useRef(null);
        useEffect(() => { if (showLinkInput && inputRef.current) inputRef.current.focus(); }, [showLinkInput]);
        if (!position) return null;
        const handleLinkKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); onLinkSubmit(linkUrl); } if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
        return el('div', { className: 'h2l-tooltip-popover', style: { left: position.left, top: position.top }, onMouseDown: e => e.stopPropagation() },
            showLinkInput ? el('div', { className: 'h2l-tooltip-link-area' }, el('input', { ref: inputRef, className: 'h2l-tooltip-input', placeholder: 'https://...', value: linkUrl, onChange: e => setLinkUrl(e.target.value), onKeyDown: handleLinkKey }), el('button', { className: 'h2l-tooltip-btn', onClick: () => onLinkSubmit(linkUrl) }, el(Icon, {name:'check'})), el('button', { className: 'h2l-tooltip-btn', onClick: onClose }, el(Icon, {name:'xmark'}))) : [ el('button', { key:'b', className: 'h2l-tooltip-btn', title:'Kalın (Ctrl+B)', onClick: () => onFormat('bold') }, el(Icon, {name:'bold'})), el('button', { key:'i', className: 'h2l-tooltip-btn', title:'İtalik (Ctrl+I)', onClick: () => onFormat('italic') }, el(Icon, {name:'italic'})), el('button', { key:'u', className: 'h2l-tooltip-btn', title:'Altı Çizili (Ctrl+U)', onClick: () => onFormat('underline') }, el(Icon, {name:'underline'})), el('button', { key:'s', className: 'h2l-tooltip-btn', title:'Üstü Çizili (Ctrl+Shift+X)', onClick: () => onFormat('strikethrough') }, el(Icon, {name:'strikethrough'})), el('button', { key:'c', className: 'h2l-tooltip-btn', title:'Kod (`)', onClick: () => onFormat('code') }, el(Icon, {name:'code'})), el('div', { key:'div', className: 'h2l-tooltip-divider' }), el('button', { key:'l', className: 'h2l-tooltip-btn', title:'Link (Ctrl+K)', onClick: () => onFormat('link_prompt') }, el(Icon, {name:'link'})) ]
        );
    };

    // --- ANA EDİTÖR (GÜNCELLENDİ) ---
    // sections prop'u eklendi
    const TaskEditor = ({ mode = 'add', initialData = {}, users = [], projects = [], sections = [], activeProjectId = 0, onSave, onCancel }) => {
        const [title, setTitle] = useState(initialData.title || '');
        const [description, setDescription] = useState(initialData.content || '');
        // Smart Parser ile yönetilen state'ler
        const [priority, setPriority] = useState(initialData.priority || 4);
        const [assigneeId, setAssigneeId] = useState(initialData.assignees && initialData.assignees.length > 0 ? initialData.assignees[0] : null);
        const [dueDate, setDueDate] = useState(initialData.due_date ? initialData.due_date.split(' ')[0] : '');
        const [status, setStatus] = useState(initialData.status || 'open');
        const [projectId, setProjectId] = useState(initialData.project_id || activeProjectId);
        const [sectionId, setSectionId] = useState(initialData.section_id || null);
        
        const [activePopup, setActivePopup] = useState(null);
        const [tooltipState, setTooltipState] = useState(null);
        const [pasteLines, setPasteLines] = useState(null);
        
        const savedSelectionRange = useRef(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        const plainTitle = title ? title.replace(/<[^>]*>/g, '').trim() : '';
        const isLimitExceeded = plainTitle.length > MAX_CHARS;

        // NLP / Smart Parsing Effect
        useEffect(() => {
            if (!title || mode === 'edit') return; // Sadece ekleme modunda çalışsın (düzenlemede kullanıcıyı bozmasın)
            
            const plainText = title.replace(/<[^>]*>/g, ' '); 
            
            // SmartParser'ı çağır
            const result = SmartParser.parse(plainText, projects, users, sections);
            
            // Sonuçları State'e işle (Eğer bulunduysa)
            if (result.priority) setPriority(result.priority);
            if (result.assigneeId) setAssigneeId(result.assigneeId);
            if (result.dueDate) setDueDate(result.dueDate);
            if (result.projectId) setProjectId(result.projectId);
            if (result.sectionId) setSectionId(result.sectionId);
            if (result.status) setStatus(result.status);
            
            // UI Geri Bildirimi (Opsiyonel: Highlight edilen kelimeleri title'da işaretleyebiliriz ama contentEditable ile zor)
            // Şimdilik sadece alttaki çipleri (butonları) güncelliyoruz.

        }, [title, users, projects, sections]);

        // ... (Geri kalan logicler: handleSubmit, handlePaste, handleFormat vs. AYNI) ...
        
        useEffect(() => { const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) { if(!event.target.closest('.h2l-tooltip-popover')) { setActivePopup(null); } } }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [wrapperRef]);
        useEffect(() => { const handleSelection = () => { const selection = window.getSelection(); if (!selection.isCollapsed && wrapperRef.current && wrapperRef.current.contains(selection.anchorNode)) { const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect(); setTooltipState(prev => prev && prev.showLinkInput ? prev : { pos: { left: rect.left + (rect.width / 2) - 80, top: rect.top - 45 }, showLinkInput: false }); } else { setTooltipState(prev => prev && prev.showLinkInput ? prev : null); } }; document.addEventListener('selectionchange', handleSelection); return () => document.removeEventListener('selectionchange', handleSelection); }, []);

        const handlePasteIntent = (lines, htmlContent) => { setPasteLines(lines); };
        const handlePasteConfirm = (merge) => {
            if (!pasteLines) return;
            if (merge) {
                const mergedText = pasteLines.join(' ');
                const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode');
                if(titleEl) titleEl.focus();
                document.execCommand('insertHTML', false, mergedText);
            } else {
                pasteLines.forEach(line => {
                    // Parselenmiş veriyi kullan
                    const parsed = SmartParser.parse(line, projects, users, sections);
                    const taskData = { 
                        id: null, 
                        title: parsed.cleanTitle, // Temizlenmiş başlık
                        content: '', 
                        priority: parsed.priority || priority, 
                        assignees: parsed.assigneeId ? [parsed.assigneeId] : (assigneeId ? [assigneeId] : []), 
                        dueDate: parsed.dueDate || dueDate, 
                        status: parsed.status || status, 
                        projectId: parsed.projectId || projectId,
                        sectionId: parsed.sectionId || sectionId
                    };
                    onSave(taskData);
                });
                if(mode === 'add') {
                    setTitle(''); setDescription(''); setPriority(4); setAssigneeId(null); setDueDate('');
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode');
                    if(titleEl) titleEl.innerHTML = '';
                }
                if(onCancel) onCancel();
            }
            setPasteLines(null);
        };

        const handleSubmit = () => {
            if(plainTitle && plainTitle.length <= MAX_CHARS) {
                // Son temizlik ve kaydetme
                const plainText = title.replace(/<[^>]*>/g, ' ');
                const parsed = SmartParser.parse(plainText, projects, users, sections);
                
                // HTML içindeki anahtar kelimeleri temizlemek zor olduğu için şimdilik
                // kullanıcının yazdığı orijinal title'ı (biçimlendirmeli) koruyoruz.
                // İleride replace mantığı eklenebilir.
                
                const taskData = { 
                    id: initialData.id, 
                    title: title, // Orijinal (HTML) başlığı kaydet (istenirse parsed.cleanTitle kullanılabilir ama rich text gider)
                    content: description, 
                    priority, 
                    assignees: assigneeId ? [assigneeId] : [], 
                    dueDate, 
                    status, 
                    projectId,
                    sectionId 
                };
                onSave(taskData);
                
                if(mode === 'add') {
                    setTitle(''); setDescription(''); setPriority(4); setAssigneeId(null); setDueDate('');
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode');
                    if(titleEl) titleEl.innerHTML = '';
                }
            }
        };

        const execCmd = (cmd, val = null) => { document.execCommand(cmd, false, val); };
        const handleFormat = (type) => { if (type === 'bold') execCmd('bold'); else if (type === 'italic') execCmd('italic'); else if (type === 'underline') execCmd('underline'); else if (type === 'strikethrough') execCmd('strikeThrough'); else if (type === 'code') { const selection = window.getSelection(); if(selection.rangeCount > 0) { const range = selection.getRangeAt(0); const codeNode = document.createElement('code'); codeNode.appendChild(range.extractContents()); range.insertNode(codeNode); } } else if (type === 'link_prompt') { const selection = window.getSelection(); if (selection.rangeCount > 0) savedSelectionRange.current = selection.getRangeAt(0); setTooltipState(prev => ({ ...prev, showLinkInput: true })); } };
        const handleLinkSubmit = (url) => { if (url) { const selection = window.getSelection(); selection.removeAllRanges(); if (savedSelectionRange.current) selection.addRange(savedSelectionRange.current); execCmd('createLink', url); if (selection.anchorNode && selection.anchorNode.parentElement.tagName === 'A') { selection.anchorNode.parentElement.setAttribute('target', '_blank'); } else if (selection.focusNode && selection.focusNode.parentElement.tagName === 'A') { selection.focusNode.parentElement.setAttribute('target', '_blank'); } } setTooltipState(null); savedSelectionRange.current = null; };
        const handleKeyDown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleFormat('bold'); } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); handleFormat('italic'); } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); handleFormat('underline'); } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') { e.preventDefault(); handleFormat('strikethrough'); } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); handleFormat('link_prompt'); } else if (e.key === '`') { const selection = window.getSelection(); if (!selection.isCollapsed) { e.preventDefault(); handleFormat('code'); } } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } if (e.key === 'Escape') onCancel(); };

        // ... (renderPopup aynı) ...
        const renderPopup = () => {
            if (!activePopup) return null;
            const popupStyle = { top: '100%', left: 0, marginTop: 5 };
            
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, padding: 10 } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(new Date().toISOString().split('T')[0]); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#058527', marginRight:8}}), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { const t = new Date(); t.setDate(t.getDate()+1); setDueDate(t.toISOString().split('T')[0]); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#eb8909', marginRight:8}}), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: 5 } }, el('input', { type: 'date', className: 'h2l-input', value: dueDate, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } })));
            if (activePopup === 'project') return el('div', { className: 'h2l-popover-menu', style: { bottom: '100%', top: 'auto', marginBottom: 5, left: 0 } }, el('div', { className: 'h2l-menu-title' }, 'Proje Seç'), projects.map(p => el('div', { key: p.id, className: 'h2l-menu-item', onClick: () => { setProjectId(p.id); setActivePopup(null); } }, el('span', { style: { color: p.color, marginRight: 8, fontSize: 14 } }, '#'), p.title, parseInt(projectId) === parseInt(p.id) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'status') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, Object.keys({'open':'Açık','in_progress':'Devam Ediyor','completed':'Tamamlandı'}).map(k => el('div', { key: k, className: 'h2l-menu-item', onClick: () => { setStatus(k); setActivePopup(null); } }, el(Icon, { name: k === 'completed' ? 'check-circle' : 'circle', style: { marginRight: 8, color: '#888' } }), {'open':'Açık','in_progress':'Devam Ediyor','completed':'Tamamlandı'}[k], status === k && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
        };

        const selectedUser = assigneeId ? users.find(u => parseInt(u.id) === parseInt(assigneeId)) : null;
        const selectedProject = projects.find(p => parseInt(p.id) === parseInt(projectId));

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef },
            tooltipState && el(TextTooltip, { position: tooltipState.pos, showLinkInput: tooltipState.showLinkInput, onFormat: handleFormat, onLinkSubmit: handleLinkSubmit, onClose: () => setTooltipState(null) }),
            pasteLines && el(PasteModal, { lines: pasteLines, onConfirm: handlePasteConfirm, onCancel: () => setPasteLines(null) }),

            el('div', { className: 'h2l-todoist-editor-body' },
                el(ContentEditable, { 
                    html: title, 
                    onChange: setTitle, 
                    placeholder: mode === 'add' ? 'Görev adı örn: Toplantı p1 yarın @ali' : 'Görev adı', 
                    className: 'title-mode', 
                    autoFocus: true, 
                    onKeyDown: handleKeyDown,
                    onPasteIntent: handlePasteIntent 
                }),
                
                el(ContentEditable, { html: description, onChange: setDescription, placeholder: 'Açıklama', className: 'desc-mode' }),
                
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Karakter Sınırı Aşıldı`),

                el('div', { className: 'h2l-todoist-chips-area' },
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date') }, el(Icon, {name:'calendar'}), dueDate || 'Tarih'), activePopup === 'date' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 6, verticalAlign:'middle' } }), selectedUser.name] : [el(Icon, {name:'user'}), 'Atanan kişi']), activePopup === 'assignee' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` Öncelik ${priority !== 4 ? priority : ''}`), activePopup === 'priority' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip disabled' }, el(Icon, {name:'clock'}), ' Hatırlatıcılar')),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'status' ? null : 'status') }, el(Icon, {name:'spinner'}), status === 'open' ? ' Status' : ` ${status}`), activePopup === 'status' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip icon-only' }, el(Icon, {name:'ellipsis'})))
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-chip-wrapper' }, el('div', { className: 'h2l-todoist-project-selector', onClick: () => setActivePopup(activePopup === 'project' ? null : 'project') }, selectedProject ? el('span', {style:{color:selectedProject.color}}, '#') : el(Icon, {name:'inbox'}), el('span', null, selectedProject ? selectedProject.title : 'Proje Seç'), el(Icon, {name:'angle-down', style:{fontSize:10, marginLeft:4}})), activePopup === 'project' && renderPopup()),
                el('div', { className: 'h2l-todoist-footer-actions' }, el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'), el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !plainTitle || isLimitExceeded }, mode === 'add' ? 'Görev ekle' : 'Kaydet'))
            )
        );
    };

    const QuickAddTrigger = ({ onOpen }) => {
        return el('div', { className: 'h2l-todoist-add-trigger', onClick: onOpen }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
    };

    window.H2L.TaskInput = { TaskEditor, QuickAddTrigger };

})(window.wp);