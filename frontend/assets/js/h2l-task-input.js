(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    // Reminders Güvenli Yükleme
    const getReminders = () => {
        return window.H2L && window.H2L.Reminders ? window.H2L.Reminders : {
            getPriorityColor: () => '#808080',
            SmartParser: { parse: (t) => ({ cleanTitle: t }) },
            generateHighlightHTML: (t) => t
        };
    };

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    // --- PLACEHOLDER LİSTESİ (Zengin Senaryolar) ---
    const PLACEHOLDERS = [
        "Kampanya kurulumu ekleyin… ör. yarın 10:00 #DV360 p1 @elifnaz",
        "Müşteri onayı iste… @selim bugün 15:00",
        "Günlük optimizasyon görevi… her gün 09:30 #MetaAds",
        "Teklif hazırlama… 2 gün sonra >Satış @berkay",
        "Story tasarımı ekleyin… bugün 17:00 p2",
        "Kreatif revize iste… @özge yarın sabah @berkay",
        "IION kurulum kontrolü… >Analitik p1 @elifnaz",
        "Aylık performans raporu… her ayın 1’i #Raporlama",
        "Müşteri toplantısı ekleyin… cuma 14:00",
        "Kampanya bütçe güncellemesi… 5 şubat 10:00 @berkay",
        "Yeni reklam metni yaz… @cemre #Kreatif @elifnaz",
        "Rakip analizi planla… 3 gün sonra p2",
        "DV360 yayına alma… yarın 08:00 p1",
        "Kampanya durdurma talebi… bugün 18:00 @berkay",
        "Influencer seçimi… >SosyalMedya @elifnaz",
        "Fatura talebi oluştur… #Muhasebe p1",
        "Etiketleme (GTM) görevi… 12/2 saat 16:00",
        "Haftalık durum toplantısı… her cuma >Toplantılar",
        "Kreatif çıkışları kontrol et… 4pm @oğuz",
        "Landing page revizesi… yarına ertele #Web",
        "KPI kontrolü ekle… >Performans bugün p1",
        "Müşteri geri dönüşlerini toparla… @süleyman",
        "Yeni proje kaydı aç… #YeniMüşteri",
        "Maliyet optimizasyonu… 2 hafta sonra p2",
        "Rapor gönderimi… bugün 11:00 @selim",
        "Video reklam çıkışı… 3 gün sonra @özge",
        "Reklam reddi çözümü… bugün >Acil p1 @elifnaz",
        "Strateji dokümanı hazırla… pazartesi 10:00 @cemre",
        "Tracking testleri yap… yarın 14:30 >Analitik @süleyman",
        "Kampanya kalite kontrol… her hafta içi 09:00 @süleyman",
        "UTM parametrelerini oluştur… bugün #Analitik @süleyman",
        "Yaratıcı konsept hazırlanması… @özge yarın @selim",
        "CRM datasını güncelle… #Müşteri @cemre",
        "Banner adaptasyonları… 2 gün sonra p2 @cemre",
        "Budget pacing kontrolü… >Performans @selim",
        "Sosyal medya içerik planı… her pazartesi",
        "Müşteri SLA kontrolü… yarın sabah @selim",
        "A/B test kurulumu… cuma 11:00 @selim",
        "Kampanya yayını izleme… her gün 10:00",
        "Reklam metni varyasyonları oluştur… bugün @cemre",
        "Segment oluşturma… #Programmatic",
        "Yeni hedef kitle tanımı… 2 gün sonra @selim",
        "Tag Manager publish… bugün 17:00 p1",
        "Creative approval follow-up… @selim",
        "Yayın durumu raporla… gelecek hafta @elifnaz",
        "Rewarded Ads retest… yarın öğleden sonra @berkay",
        "Lookalike audience ekle… #MetaAds @cemre",
        "Video kurgusu hazırlansın… @özge cuma 15:00",
        "Data Studio dashboard güncelle… bugün",
        "Remarketing listeleri kontrol… her salı",
        "Konum hedefleme düzenle… #GoogleAds",
        "CAPI entegrasyonu test et… @berkay",
        "Ürün feed kontrolü… >E-ticaret",
        "Kreatif teslim tarihini netleştir… @cemre",
        "Reklam harcaması kontrolü… bugün 17:00",
        "Yayın optimizasyon notu ekle… p2",
        "Erişim frekans kontrolü… yarın sabah",
        "Brief dokümanı paylaş… @süleyman",
        "Müşteri önerilerini takip et… #Müşteri @cemre",
        "Video thumbnail düzenle… 4pm @özge",
        "Sosyal medya raporu hazırla… cuma 17:00",
        "Kreatif yönlendirme hazırla… #KreatifBrief",
        "Kampanya hedeflerini güncelle… >Strateji",
        "Yedek reklam grubu oluştur… @berkay",
        "Ürün setlerini güncelle… #CatalogAds",
        "Email automation testi… yarın 10:00",
        "Atribüsyon modeli kontrol… #Analitik",
        "Theadx kreatif ekleme sorunu çöz… p1 @alper",
        "Adform Ads kurulumu… @cemre",
        "Yayın sonrası performans değerlendirmesi… gelecek pazartesi",
        "Müşteriden missing asset iste… bugün @süleyman",
        "Conversion tracking doğrula… 12:00 p1 @selim",
        "Kampanya maliyet tahmini oluştur… #Planlama @cemre",
        "Cross-channel kontrol… perşembe",
        "Reklam yöneticisinde hata giderme… bugün >Acil",
        "Rakip banner görsellerini topla… @elifnaz",
        "Creative X çıkış kontrolü… gün içinde",
        "Story & Reel planlama… #SosyalMedya @selim",
        "Yayın, harcama ve pacing uyumu kontrol… p2",
        "Google DV360 kalite puanı artırma görevi… yarın",
        "GAM Ads kur… >B2B @süleyman",
        "Kampanya döviz kuruna göre düzeltme… #Finans @süleyman",
        "YouTube bumper hazırlığı… bugün",
        "Hedef kitle temizliği… 2 hafta sonra @cemre",
        "Yeni müşteri onboarding akışı… #CRM @cemre",
        "Ajans içi not ekle… @selim",
        "İçerik revize takip… @cemre",
        "Finansal döküman gönder… #Muhasebe @selim",
        "Müşteri feedback dokümanı oluştur… >Müşteriİlişkileri",
        "DV360 event mapping güncelle… p1",
        "Performance Max görsel kontrolü… bugün @süleyman",
        "Hesap güvenlik kontrolü… #Admin @cemre",
        "Yayın harcama limiti ayarla… @berkay",
        "Müşteri blacklist/whitelist düzenle… #Programmatic",
        "Kreatif test planı oluştur… yarın p3 @süleyman",
        "Yayın içgörüleri topla… cuma",
        "Toplantı özetini yaz… @selim bugün",
        "Feed optimizasyonu… 3 gün sonra",
        "Etiket düzeni kontrol et… #GTM",
        "Yayın hatalarını tara… >Performans p1"
    ];

    const getRandomPlaceholder = () => {
        return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
    };

    // --- YARDIMCI FONKSİYONLAR ---
    const sanitizeHTML = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'A', 'SPAN'];
        const clean = (node) => {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                const child = node.childNodes[i];
                if (child.nodeType === 1) { 
                    // Highlight classlarını koru
                    if(child.classList.contains('h2l-highlight-tag')) {
                        child.removeAttribute('style');
                        child.removeAttribute('id');
                    } else {
                        child.removeAttribute('style'); 
                        child.removeAttribute('class'); 
                        child.removeAttribute('id');
                    }
                    if (!allowedTags.includes(child.tagName)) {
                        if(['DIV', 'P', 'BR', 'LI', 'TR'].includes(child.tagName)) { 
                            const space = document.createTextNode(' '); node.insertBefore(space, child); 
                        }
                        while (child.firstChild) { node.insertBefore(child.firstChild, child); }
                        node.removeChild(child);
                    } else {
                        const href = child.getAttribute('href');
                        while (child.attributes.length > 0) { 
                            if(child.attributes[0].name !== 'class' && child.attributes[0].name !== 'href' && child.attributes[0].name !== 'target') {
                                child.removeAttribute(child.attributes[0].name); 
                            }
                        }
                        if (child.tagName === 'A' && href) { child.setAttribute('href', href); child.setAttribute('target', '_blank'); }
                        clean(child);
                    }
                }
            }
        };
        clean(doc.body);
        return doc.body.innerHTML.replace(/&nbsp;/g, ' ').trim();
    };

    // --- PASTE MODAL ---
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

    // --- CONTENT EDITABLE (GÜNCELLENDİ) ---
    const ContentEditable = ({ html, onChange, placeholder, className, autoFocus, onKeyDown, onPasteIntent, onInputHighlight }) => {
        const contentEditableRef = useRef(null);
        const lastHtml = useRef(null);

        useEffect(() => { 
            if (contentEditableRef.current && html !== contentEditableRef.current.innerHTML && html !== lastHtml.current) { 
                contentEditableRef.current.innerHTML = html; 
                lastHtml.current = html;
            } 
        }, [html]); 
        
        useEffect(() => { if (autoFocus && contentEditableRef.current) { contentEditableRef.current.focus(); } }, []);

        const handleInput = (e) => { 
            let newHtml = e.target.innerHTML;
            const textContent = e.target.textContent || ""; 

            // Eğer içerik sadece <br> veya boşluktan ibaretse temizle ki placeholder görünsün
            if (textContent.trim() === "" && (!newHtml || newHtml === "<br>" || newHtml === "<div><br></div>")) {
                newHtml = "";
                // DOM'u da temizle
                e.target.innerHTML = "";
            }

            lastHtml.current = newHtml; 
            onChange(newHtml); 
        };

        const handleKeyUp = (e) => {
            if ([' ', 'Enter', 'Backspace', 'Delete'].includes(e.key) && onInputHighlight) {
                onInputHighlight(contentEditableRef.current);
            }
        };

        const handleKeyDownLocal = (e) => { if (onKeyDown) onKeyDown(e); };
        
        const handlePasteLocal = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            const htmlContent = e.clipboardData.getData('text/html');
            const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0);
            
            if (lines.length > 1 && onPasteIntent) { 
                onPasteIntent(lines, htmlContent); 
            } else { 
                let contentToInsert = htmlContent ? sanitizeHTML(htmlContent) : text; 
                document.execCommand('insertHTML', false, contentToInsert); 
            }
        };

        return el('div', { 
            ref: contentEditableRef, 
            className: `h2l-content-editable ${className}`, 
            contentEditable: true, 
            onInput: handleInput, 
            onKeyDown: handleKeyDownLocal, 
            onKeyUp: handleKeyUp, 
            onPaste: handlePasteLocal, 
            'data-placeholder': placeholder, // DİNAMİK PLACEHOLDER
            suppressContentEditableWarning: true, 
            dir: "ltr", 
            style: { direction: 'ltr', textAlign: 'left', unicodeBidi: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } 
        });
    };

    // --- TEXT TOOLTIP ---
    const TextTooltip = ({ position, onFormat, showLinkInput, onLinkSubmit, onClose }) => {
        const [linkUrl, setLinkUrl] = useState('');
        const inputRef = useRef(null);
        useEffect(() => { if (showLinkInput && inputRef.current) inputRef.current.focus(); }, [showLinkInput]);
        if (!position) return null;
        const handleLinkKey = (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); onLinkSubmit(linkUrl); } 
            if (e.key === 'Escape') { e.preventDefault(); onClose(); } 
        };
        return el('div', { className: 'h2l-tooltip-popover', style: { left: position.left, top: position.top }, onMouseDown: e => e.stopPropagation() },
            showLinkInput 
            ? el('div', { className: 'h2l-tooltip-link-area' }, 
                el('input', { ref: inputRef, className: 'h2l-tooltip-input', placeholder: 'https://...', value: linkUrl, onChange: e => setLinkUrl(e.target.value), onKeyDown: handleLinkKey }), 
                el('button', { className: 'h2l-tooltip-btn action', onClick: () => onLinkSubmit(linkUrl) }, el(Icon, {name:'check'})), 
                el('button', { className: 'h2l-tooltip-btn action', onClick: onClose }, el(Icon, {name:'xmark'}))
              ) 
            : [ 
                el('button', { key:'b', className: 'h2l-tooltip-btn', title:'Kalın', onClick: () => onFormat('bold') }, el(Icon, {name:'bold'})), 
                el('button', { key:'i', className: 'h2l-tooltip-btn', title:'İtalik', onClick: () => onFormat('italic') }, el(Icon, {name:'italic'})), 
                el('button', { key:'u', className: 'h2l-tooltip-btn', title:'Altı Çizili', onClick: () => onFormat('underline') }, el(Icon, {name:'underline'})), 
                el('button', { key:'s', className: 'h2l-tooltip-btn', title:'Üstü Çizili', onClick: () => onFormat('strikethrough') }, el(Icon, {name:'strikethrough'})), 
                el('button', { key:'c', className: 'h2l-tooltip-btn', title:'Kod', onClick: () => onFormat('code') }, el(Icon, {name:'code'})), 
                el('div', { key:'div', className: 'h2l-tooltip-divider' }), 
                el('button', { key:'l', className: 'h2l-tooltip-btn', title:'Link', onClick: () => onFormat('link_prompt') }, el(Icon, {name:'link'})) 
              ]
        );
    };

    // --- TASK EDITOR ---
    const TaskEditor = ({ mode = 'add', initialData = {}, users = [], projects = [], sections = [], activeProjectId = 0, onSave, onCancel }) => {
        const [title, setTitle] = useState(initialData.title || '');
        const [description, setDescription] = useState(initialData.content || '');
        
        // Random placeholder (Her mount olduğunda)
        const [currentPlaceholder, setCurrentPlaceholder] = useState(mode === 'add' ? getRandomPlaceholder() : 'Görev adı');

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

        const plainTitle = title ? title.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : '';
        const currentLength = plainTitle.length;
        const isLimitExceeded = currentLength > MAX_CHARS;

        const saveCaret = (el) => {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return null;
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(el);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        };

        const restoreCaret = (el, offset) => {
            if (offset === null) return;
            const selection = window.getSelection();
            const range = document.createRange();
            let currentPos = 0, nodeStack = [el], node, found = false;
            while (!found && (node = nodeStack.pop())) {
                if (node.nodeType === 3) {
                    const nextPos = currentPos + node.length;
                    if (offset >= currentPos && offset <= nextPos) {
                        range.setStart(node, offset - currentPos);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        found = true;
                    }
                    currentPos = nextPos;
                } else {
                    let i = node.childNodes.length;
                    while (i--) nodeStack.push(node.childNodes[i]);
                }
            }
        };

        const handleHighlight = (el) => {
            const { generateHighlightHTML } = getReminders();
            const currentHtml = el.innerHTML;
            const newHtml = generateHighlightHTML(currentHtml);
            if (currentHtml !== newHtml) {
                const caret = saveCaret(el);
                el.innerHTML = newHtml;
                restoreCaret(el, caret);
                setTitle(newHtml);
            }
        };

        useEffect(() => {
            if (!title || title.replace(/<[^>]*>/g, '').trim().length < 2) return;
            const plainText = title.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
            const { SmartParser } = getReminders();
            if (SmartParser && SmartParser.parse) {
                const result = SmartParser.parse(plainText, projects, users, sections);
                if (result.priority) setPriority(result.priority);
                if (result.assigneeId) setAssigneeId(result.assigneeId);
                if (result.dueDate) setDueDate(result.dueDate);
                if (result.projectId) setProjectId(result.projectId);
                if (result.sectionId) setSectionId(result.sectionId);
                if (result.status) setStatus(result.status);
            }
        }, [title, users, projects, sections]);

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
                const { SmartParser, getPriorityColor } = getReminders();
                pasteLines.forEach(line => {
                    const parsed = SmartParser.parse(line, projects, users, sections);
                    const taskData = { title: line, priority: parsed.priority || priority, assignees: parsed.assigneeId ? [parsed.assigneeId] : [], dueDate: parsed.dueDate || dueDate, projectId: parsed.projectId || projectId, sectionId: parsed.sectionId || sectionId, status: 'open' };
                    onSave(taskData);
                });
                if(mode === 'add') { 
                    setTitle(''); setDescription(''); 
                    setCurrentPlaceholder(getRandomPlaceholder()); // Her eklemeden sonra değiştir
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode'); 
                    if(titleEl) titleEl.innerHTML = ''; 
                }
                if(onCancel) onCancel();
            }
            setPasteLines(null);
        };

        const handleSubmit = () => {
            const finalPlainTitle = title.replace(/<[^>]*>/g, '').trim();
            if(finalPlainTitle && finalPlainTitle.length <= MAX_CHARS) {
                const taskData = { id: initialData.id, title: title, content: description, priority, assignees: assigneeId ? [assigneeId] : [], dueDate, status, projectId, sectionId };
                onSave(taskData);
                if(mode === 'add') { 
                    setTitle(''); setDescription(''); 
                    setPriority(4); setAssigneeId(null); setDueDate(''); 
                    setCurrentPlaceholder(getRandomPlaceholder()); // Her eklemeden sonra değiştir
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode'); 
                    if(titleEl) titleEl.innerHTML = ''; 
                }
            }
        };

        const execCmd = (cmd, val = null) => { document.execCommand(cmd, false, val); };
        const handleFormat = (type) => { if (type === 'bold') execCmd('bold'); else if (type === 'italic') execCmd('italic'); else if (type === 'underline') execCmd('underline'); else if (type === 'strikethrough') execCmd('strikeThrough'); else if (type === 'code') { const selection = window.getSelection(); if(selection.rangeCount > 0) { const range = selection.getRangeAt(0); const codeNode = document.createElement('code'); codeNode.appendChild(range.extractContents()); range.insertNode(codeNode); } } else if (type === 'link_prompt') { const selection = window.getSelection(); if (selection.rangeCount > 0) savedSelectionRange.current = selection.getRangeAt(0); setTooltipState(prev => ({ ...prev, showLinkInput: true })); } };
        const handleLinkSubmit = (url) => { if (url) { const selection = window.getSelection(); selection.removeAllRanges(); if (savedSelectionRange.current) selection.addRange(savedSelectionRange.current); execCmd('createLink', url); if (selection.anchorNode && selection.anchorNode.parentElement.tagName === 'A') { selection.anchorNode.parentElement.setAttribute('target', '_blank'); } } setTooltipState(null); savedSelectionRange.current = null; };
        const handleKeyDown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleFormat('bold'); } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); handleFormat('italic'); } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); handleFormat('link_prompt'); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } if (e.key === 'Escape') onCancel(); };

        const { getPriorityColor } = getReminders();
        const renderPopup = () => {
            if (!activePopup) return null;
            const popupStyle = { top: '100%', left: 0, marginTop: 5 };
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, padding: 10 } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(new Date().toISOString().split('T')[0]); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#058527', marginRight:8}}), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { const t = new Date(); t.setDate(t.getDate()+1); setDueDate(t.toISOString().split('T')[0]); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#eb8909', marginRight:8}}), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: 5 } }, el('input', { type: 'date', className: 'h2l-input', value: dueDate, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } })));
            if (activePopup === 'project') return el('div', { className: 'h2l-popover-menu', style: { bottom: '100%', top: 'auto', marginBottom: 5, left: 0 } }, el('div', { className: 'h2l-menu-title' }, 'Proje Seç'), projects.map(p => el('div', { key: p.id, className: 'h2l-menu-item', onClick: () => { setProjectId(p.id); setActivePopup(null); } }, el('span', { style: { color: p.color, marginRight: 8, fontSize: 14 } }, '#'), p.title, parseInt(projectId) === parseInt(p.id) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'status') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, Object.keys({'open':'Açık','in_progress':'Devam Ediyor','completed':'Tamamlandı'}).map(k => el('div', { key: k, className: 'h2l-menu-item', onClick: () => { setStatus(k); setActivePopup(null); } }, el(Icon, { name: k === 'completed' ? 'check-circle' : 'circle', style: { marginRight: 8, color: '#888' } }), {'open':'Açık','in_progress':'Devam Ediyor','completed':'Tamamlandı'}[k], status === k && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            return null;
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
                    placeholder: currentPlaceholder, 
                    className: 'title-mode', 
                    autoFocus: true, 
                    onKeyDown: handleKeyDown,
                    onPasteIntent: handlePasteIntent,
                    onInputHighlight: handleHighlight
                }),
                
                el(ContentEditable, { html: description, onChange: setDescription, placeholder: 'Açıklama', className: 'desc-mode' }),
                
                isLimitExceeded && el('div', { className: 'h2l-limit-warning' }, 
                    `Görev ismi karakter limiti: ${currentLength} / ${MAX_CHARS}`
                ),

                el('div', { className: 'h2l-todoist-chips-area' },
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date') }, el(Icon, {name:'calendar'}), dueDate || 'Tarih'), activePopup === 'date' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 6, verticalAlign:'middle' } }), selectedUser.name] : [el(Icon, {name:'user'}), 'Atanan']), activePopup === 'assignee' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` Öncelik ${priority !== 4 ? priority : ''}`), activePopup === 'priority' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip disabled' }, el(Icon, {name:'clock'}), ' Hatırlatıcılar')),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'status' ? null : 'status') }, el(Icon, {name:'spinner'}), status === 'open' ? ' Status' : ` ${status}`), activePopup === 'status' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip icon-only' }, el(Icon, {name:'ellipsis'})))
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-chip-wrapper' }, el('div', { className: 'h2l-todoist-project-selector', onClick: () => setActivePopup(activePopup === 'project' ? null : 'project') }, selectedProject ? el('span', {style:{color:selectedProject.color}}, '#') : el(Icon, {name:'inbox'}), el('span', null, selectedProject ? selectedProject.title : 'Proje Seç'), el(Icon, {name:'angle-down', style:{fontSize:10, marginLeft:4}})), activePopup === 'project' && renderPopup()),
                
                el('div', { className: 'h2l-todoist-footer-actions' }, 
                    el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'), 
                    el('button', { 
                        className: 'h2l-todoist-btn-add', 
                        onClick: handleSubmit, 
                        disabled: !plainTitle || isLimitExceeded 
                    }, mode === 'add' ? 'Görev ekle' : 'Kaydet')
                )
            )
        );
    };

    const QuickAddTrigger = ({ onOpen }) => {
        return el('div', { className: 'h2l-todoist-add-trigger', onClick: onOpen }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
    };

    window.H2L.TaskInput = { TaskEditor, QuickAddTrigger };

})(window.wp);