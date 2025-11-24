(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null, TASK_STATUSES: {} };
    const { Icon, Avatar, TASK_STATUSES } = Common;
    
    const getReminders = () => {
        return window.H2L && window.H2L.Reminders ? window.H2L.Reminders : {
            getPriorityColor: () => '#808080',
            SmartParser: { parse: (t) => ({ cleanTitle: t }) },
            generateHighlightHTML: (t) => t
        };
    };

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    const PLACEHOLDERS = [
        "Kampanya kurulumu ekleyin… ör. yarın 10:00 #DV360 p1",
        "Müşteri onayı iste… @selim bugün 15:00",
        "Günlük optimizasyon görevi… her gün 09:30 #MetaAds",
        "Teklif hazırlama… 2 gün sonra >Satış @berkay",
        "Story tasarımı ekleyin… bugün 17:00 p2",
        "Kreatif revize iste… @özge yarın sabah",
        "IION kurulum kontrolü… >Analitik p1",
        "Aylık performans raporu… her ayın 1’i #Raporlama",
        "Müşteri toplantısı ekleyin… cuma 14:00",
        "Kampanya bütçe güncellemesi… 5 şubat 10:00",
        "Yeni reklam metni yaz… @cemre #Kreatif",
        "Rakip analizi planla… 3 gün sonra p2",
        "DV360 yayına alma… yarın 08:00 p1",
        "Kampanya durdurma talebi… bugün 18:00",
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
        "Reklam reddi çözümü… bugün >Acil p1",
        "Strateji dokümanı hazırla… pazartesi 10:00",
        "Tracking testleri yap… yarın 14:30 >Analitik",
        "Kampanya kalite kontrol… her hafta içi 09:00",
        "UTM parametrelerini oluştur… bugün #Analitik",
        "Yaratıcı konsept hazırlanması… @özge yarın",
        "CRM datasını güncelle… #Müşteri",
        "Banner adaptasyonları… 2 gün sonra p2",
        "Budget pacing kontrolü… >Performans",
        "Sosyal medya içerik planı… her pazartesi",
        "Müşteri SLA kontrolü… yarın sabah",
        "A/B test kurulumu… cuma 11:00",
        "Kampanya yayını izleme… her gün 10:00",
        "Reklam metni varyasyonları oluştur… bugün @cemre",
        "Segment oluşturma… #Programmatic",
        "Yeni hedef kitle tanımı… 2 gün sonra",
        "Tag Manager publish… bugün 17:00 p1",
        "Creative approval follow-up… @selim",
        "Yayın durumu raporla… gelecek hafta",
        "Meta Ads retest… yarın öğleden sonra",
        "Lookalike audience ekle… #MetaAds",
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
        "Müşteri önerilerini takip et… #Müşteri",
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
        "Müşteriden missing asset iste… bugün",
        "Conversion tracking doğrula… 12:00 p1",
        "Kampanya maliyet tahmini oluştur… #Planlama",
        "Cross-channel kontrol… perşembe",
        "Reklam yöneticisinde hata giderme… bugün >Acil",
        "Rakip banner görsellerini topla… @elifnaz",
        "Creative X çıkış kontrolü… gün içinde",
        "Story & Reel planlama… #SosyalMedya",
        "Yayın, harcama ve pacing uyumu kontrol… p2",
        "Google DV360 kalite puanı artırma görevi… yarın",
        "GAM Ads kur… >B2B @süleyman",
        "Kampanya döviz kuruna göre düzeltme… #Finans",
        "YouTube bumper hazırlığı… bugün",
        "Hedef kitle temizliği… 2 hafta sonra",
        "Yeni müşteri onboarding akışı… #CRM",
        "Ajans içi not ekle… @selim",
        "İçerik revize takip… @cemre",
        "Finansal döküman gönder… #Muhasebe",
        "Müşteri feedback dokümanı oluştur… >Müşteriİlişkileri",
        "DV360 event mapping güncelle… p1",
        "Performance Max görsel kontrolü… bugün",
        "Hesap güvenlik kontrolü… #Admin",
        "Yayın harcama limiti ayarla… @berkay",
        "Müşteri blacklist/whitelist düzenle… #Programmatic",
        "Kreatif test planı oluştur… yarın p3",
        "Yayın içgörüleri topla… cuma",
        "Toplantı özetini yaz… @selim bugün",
        "Feed optimizasyonu… 3 gün sonra",
        "Etiket düzeni kontrol et… #GTM",
        "Yayın hatalarını tara… >Performans p1"
    ];

    const getRandomPlaceholder = () => {
        return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
    };

    const sanitizeHTML = (html, mode = 'title') => {
        if (!html) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let allowedTags = [];
        if (mode === 'title') {
            allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'A', 'SPAN'];
        } else {
            allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'A', 'SPAN', 'H1', 'H2', 'BLOCKQUOTE', 'UL', 'OL', 'LI'];
        }
        const clean = (node) => {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                const child = node.childNodes[i];
                if (child.nodeType === 1) {
                    const tagName = child.tagName;
                    if (!allowedTags.includes(tagName)) {
                        if (['DIV', 'P', 'BR', 'TR', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) node.insertBefore(document.createTextNode(' '), child);
                        while (child.firstChild) node.insertBefore(child.firstChild, child);
                        node.removeChild(child);
                    } else {
                        const attrs = Array.from(child.attributes);
                        for (const attr of attrs) {
                            const name = attr.name.toLowerCase();
                            if (tagName === 'A' && (name === 'href' || name === 'target')) continue;
                            if (tagName === 'SPAN' && name === 'class' && attr.value.includes('h2l-highlight-tag')) continue;
                            child.removeAttribute(name);
                        }
                        if (tagName === 'A') child.setAttribute('target', '_blank');
                        clean(child);
                    }
                }
            }
        };
        clean(doc.body);
        return doc.body.innerHTML.replace(/&nbsp;/g, ' ').trim();
    };

    const DatePickerWrapper = ({ date, time, repeat, onChange }) => {
        const wrapperRef = useRef(null);
        const pickerRef = useRef(null);

        useEffect(() => {
            // Global sınıfı kullan
            const DatePickerClass = window.H2L.TodoistDatepicker;
            
            if (wrapperRef.current && !pickerRef.current && DatePickerClass) {
                pickerRef.current = new DatePickerClass(wrapperRef.current, {
                    defaultDate: date,
                    defaultTime: time,
                    defaultRepeat: repeat,
                    onChange: onChange
                });
            }
            return () => { if (pickerRef.current && pickerRef.current.destroy) pickerRef.current.destroy(); };
        }, []);

        useEffect(() => {
            if (pickerRef.current) {
                if (date) {
                    const d = new Date(date);
                    pickerRef.current.selectedDate = isNaN(d.getTime()) ? null : d;
                } else {
                    pickerRef.current.selectedDate = null;
                }
                pickerRef.current.selectedTime = time;
                pickerRef.current.selectedRepeat = repeat;
                if (pickerRef.current.updateUI) pickerRef.current.updateUI();
            }
        }, [date, time, repeat]);

        return el('div', { ref: wrapperRef, className: 'td-popup-wrapper', style: { marginRight: 0 } });
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

    const ContentEditable = ({ html, onChange, placeholder, className, autoFocus, onKeyDown, onPasteIntent, onInputHighlight, onBlur }) => {
        const contentEditableRef = useRef(null);
        const lastHtml = useRef(null);

        useEffect(() => { 
            if (contentEditableRef.current && html !== contentEditableRef.current.innerHTML && html !== lastHtml.current) { 
                contentEditableRef.current.innerHTML = html; lastHtml.current = html;
            } 
        }, [html]); 
        
        useEffect(() => { if (autoFocus && contentEditableRef.current) { contentEditableRef.current.focus(); } }, []);

        const handleInput = (e) => { 
            let newHtml = e.target.innerHTML;
            const textContent = e.target.textContent || ""; 
            if (textContent.trim() === "" && (!newHtml || newHtml === "<br>" || newHtml === "<div><br></div>")) { newHtml = ""; e.target.innerHTML = ""; }
            lastHtml.current = newHtml; onChange(newHtml); 
        };

        const handleKeyUp = (e) => {
            if ([' ', 'Enter', 'Backspace', 'Delete'].includes(e.key) && onInputHighlight) onInputHighlight(contentEditableRef.current);
        };

        const handleKeyDownLocal = (e) => { if (onKeyDown) onKeyDown(e); };
        
        const handlePasteLocal = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            const htmlContent = e.clipboardData.getData('text/html');
            const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0);
            
            if (className.includes('title-mode') && lines.length > 1 && onPasteIntent) {
                onPasteIntent(lines, htmlContent); 
            } else { 
                const mode = className.includes('desc-mode') ? 'desc' : 'title';
                let contentToInsert = htmlContent ? sanitizeHTML(htmlContent, mode) : sanitizeHTML(text, mode);
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
            onBlur: onBlur,
            'data-placeholder': placeholder, 
            suppressContentEditableWarning: true, 
            dir: "ltr", style: { direction: 'ltr', textAlign: 'left', unicodeBidi: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } 
        });
    };

    const TextTooltip = ({ position, onFormat, showLinkInput, onLinkSubmit, onClose, type = 'basic' }) => {
        const [linkUrl, setLinkUrl] = useState('');
        const inputRef = useRef(null);
        useEffect(() => { if (showLinkInput && inputRef.current) inputRef.current.focus(); }, [showLinkInput]);
        if (!position) return null;
        
        const handleLinkKey = (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); onLinkSubmit(linkUrl); } 
            if (e.key === 'Escape') { e.preventDefault(); onClose(); } 
        };

        const renderButtons = () => {
            if (showLinkInput) {
                return el('div', { className: 'h2l-tooltip-link-area' }, 
                    el('input', { ref: inputRef, className: 'h2l-tooltip-input', placeholder: 'https://...', value: linkUrl, onChange: e => setLinkUrl(e.target.value), onKeyDown: handleLinkKey }), 
                    el('button', { className: 'h2l-tooltip-btn action', onClick: () => onLinkSubmit(linkUrl) }, el(Icon, {name:'check'})), 
                    el('button', { className: 'h2l-tooltip-btn action', onClick: onClose }, el(Icon, {name:'xmark'}))
                );
            }
            const buttons = [
                el('button', { key:'b', className: 'h2l-tooltip-btn', title:'Kalın', onClick: () => onFormat('bold') }, el(Icon, {name:'bold'})), 
                el('button', { key:'i', className: 'h2l-tooltip-btn', title:'İtalik', onClick: () => onFormat('italic') }, el(Icon, {name:'italic'})), 
                el('button', { key:'u', className: 'h2l-tooltip-btn', title:'Altı Çizili', onClick: () => onFormat('underline') }, el(Icon, {name:'underline'})), 
                el('button', { key:'s', className: 'h2l-tooltip-btn', title:'Üstü Çizili', onClick: () => onFormat('strikethrough') }, el(Icon, {name:'strikethrough'})), 
                el('button', { key:'code', className: 'h2l-tooltip-btn', title:'Kod', onClick: () => onFormat('code') }, el(Icon, {name:'code'}))
            ];
            if (type === 'advanced') {
                buttons.push(
                    el('div', { key:'sep1', className: 'h2l-tooltip-divider' }),
                    el('button', { key:'h1', className: 'h2l-tooltip-btn', title:'Başlık 1', onClick: () => onFormat('formatBlock', 'H1') }, 'H1'),
                    el('button', { key:'h2', className: 'h2l-tooltip-btn', title:'Başlık 2', onClick: () => onFormat('formatBlock', 'H2') }, 'H2'),
                    el('button', { key:'quote', className: 'h2l-tooltip-btn', title:'Alıntı', onClick: () => onFormat('formatBlock', 'BLOCKQUOTE') }, el(Icon, {name:'quote-right'})),
                    el('button', { key:'ul', className: 'h2l-tooltip-btn', title:'Liste', onClick: () => onFormat('insertUnorderedList') }, el(Icon, {name:'list-ul'})),
                    el('button', { key:'ol', className: 'h2l-tooltip-btn', title:'Sıralı Liste', onClick: () => onFormat('insertOrderedList') }, el(Icon, {name:'list-ol'}))
                );
            }
            buttons.push(
                el('div', { key:'sep_link', className: 'h2l-tooltip-divider' }), 
                el('button', { key:'l', className: 'h2l-tooltip-btn', title:'Link', onClick: () => onFormat('link_prompt') }, el(Icon, {name:'link'}))
            );
            return buttons;
        };
        return el('div', { className: 'h2l-tooltip-popover', style: { left: position.left, top: position.top }, onMouseDown: e => e.stopPropagation() }, renderButtons());
    };

    const TaskEditor = ({ mode = 'add', initialData = {}, users = [], projects = [], sections = [], activeProjectId = 0, onSave, onCancel, labels = [], initialOpenMenu = null }) => {
        const [title, setTitle] = useState(initialData.title || '');
        const [description, setDescription] = useState(initialData.content || '');
        const [currentPlaceholder, setCurrentPlaceholder] = useState(mode === 'add' ? getRandomPlaceholder() : 'Görev adını yazın… @selim bugün 15:00');
        const [priority, setPriority] = useState(initialData.priority || 4);
        const [assigneeIds, setAssigneeIds] = useState(initialData.assignees || []);
        const [dueDate, setDueDate] = useState(initialData.due_date ? initialData.due_date.split(' ')[0] : '');
        const [dueTime, setDueTime] = useState(initialData.due_date && initialData.due_date.includes(' ') ? initialData.due_date.split(' ')[1].substring(0, 5) : '');
        const [repeat, setRepeat] = useState(initialData.repeat || null);
        
        const [status, setStatus] = useState(initialData.status || 'in_progress');
        const [reminderEnabled, setReminderEnabled] = useState(initialData.reminder_enabled == 1 || false);

        const [projectId, setProjectId] = useState(initialData.project_id || activeProjectId);
        const [sectionId, setSectionId] = useState(initialData.section_id || null);
        
        const [activePopup, setActivePopup] = useState(initialOpenMenu || null);
        const [tooltipState, setTooltipState] = useState(null);
        const [pasteLines, setPasteLines] = useState(null);
        const [assigneeSearch, setAssigneeSearch] = useState('');
        const [selectedLabels, setSelectedLabels] = useState(initialData.labels ? initialData.labels.map(l => l.name) : []);
        const [location, setLocation] = useState(initialData.location || '');
        const [labelSearch, setLabelSearch] = useState('');
        const [limitWarning, setLimitWarning] = useState(null); 
        const [projectSearch, setProjectSearch] = useState('');
        
        const savedSelectionRange = useRef(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        const plainTitle = title ? title.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : '';
        const isLimitExceeded = plainTitle.length > MAX_CHARS;

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
                        range.setStart(node, offset - currentPos); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); found = true;
                    }
                    currentPos = nextPos;
                } else { let i = node.childNodes.length; while (i--) nodeStack.push(node.childNodes[i]); }
            }
        };

        const handleHighlight = (el) => {
            const { generateHighlightHTML } = getReminders();
            const currentHtml = el.innerHTML;
            const newHtml = generateHighlightHTML(currentHtml);
            if (currentHtml !== newHtml) {
                const caret = saveCaret(el); el.innerHTML = newHtml; restoreCaret(el, caret); setTitle(newHtml);
            }
        };

        useEffect(() => {
            if (!title || title.replace(/<[^>]*>/g, '').trim().length < 2) return;
            const plainText = title.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
            const { SmartParser } = getReminders();
            
            if (SmartParser && SmartParser.parse) {
                let eligibleUsers = users;
                if (projectId) {
                    const currentProj = projects.find(p => parseInt(p.id) === parseInt(projectId));
                    if (currentProj) {
                        let mgrs = currentProj.managers || [];
                        if (typeof mgrs === 'string') mgrs = JSON.parse(mgrs);
                        const pMembers = [parseInt(currentProj.owner_id), ...mgrs.map(id => parseInt(id))].filter(Boolean);
                        eligibleUsers = users.filter(u => pMembers.includes(parseInt(u.id)));
                    }
                }

                const result = SmartParser.parse(plainText, projects, eligibleUsers, sections);
                if (result.priority) setPriority(result.priority);
                
                const mentionRegex = /(?:^|\s)@([\w\u00C0-\u017F]{2,})/gi;
                const foundIds = [];
                let m;
                while ((m = mentionRegex.exec(plainText)) !== null) {
                    const search = m[1].toLowerCase();
                    const user = eligibleUsers.find(u => u.name.toLowerCase().includes(search));
                    if (user) foundIds.push(user.id);
                }
                if (foundIds.length > 0) { setAssigneeIds([...new Set(foundIds)]); }

                if (result.dueDate) {
                    const parts = result.dueDate.split(' ');
                    setDueDate(parts[0]);
                    if(parts[1]) setDueTime(parts[1]);
                }
                if (result.projectId) setProjectId(result.projectId);
                if (result.sectionId) setSectionId(result.sectionId);
                if (result.status) setStatus(result.status);
            }
        }, [title, users, projects, sections, projectId, selectedLabels]);

        useEffect(() => { 
            const handleClickOutside = (event) => { 
                if (activePopup) {
                    if (!event.target.closest('.h2l-popover-menu') && 
                        !event.target.closest('.td-popup') && 
                        !event.target.closest('.td-trigger-btn')) {
                        setActivePopup(null);
                    }
                }
            }; 
            document.addEventListener("mousedown", handleClickOutside); 
            return () => document.removeEventListener("mousedown", handleClickOutside); 
        }, [activePopup]);
        
        useEffect(() => { 
            const handleSelection = () => { 
                const selection = window.getSelection(); 
                if (!selection.isCollapsed && wrapperRef.current && wrapperRef.current.contains(selection.anchorNode)) { 
                    const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect();
                    let type = 'basic'; 
                    let node = selection.anchorNode; 
                    if(node.nodeType === 3) node = node.parentElement;
                    if (node.closest('.desc-mode')) type = 'advanced'; 
                    setTooltipState(prev => prev && prev.showLinkInput ? prev : { pos: { left: rect.left + (rect.width / 2) - 100, top: rect.top - 50 }, showLinkInput: false, type }); 
                } else { setTooltipState(prev => prev && prev.showLinkInput ? prev : null); } 
            }; 
            document.addEventListener('selectionchange', handleSelection); return () => document.removeEventListener('selectionchange', handleSelection); 
        }, []);

        const handlePasteConfirm = (merge) => {
            if (!pasteLines) return;
            if (merge) {
                const mergedText = pasteLines.join(' ');
                const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode');
                if(titleEl) titleEl.focus(); document.execCommand('insertHTML', false, mergedText);
            } else {
                const { SmartParser } = getReminders();
                pasteLines.forEach(line => {
                    const parsed = SmartParser.parse(line, projects, users, sections);
                    const taskData = { title: line, priority: parsed.priority || priority, assignees: parsed.assigneeId ? [parsed.assigneeId] : [], dueDate: parsed.dueDate || dueDate, projectId: parsed.projectId || projectId, sectionId: parsed.sectionId || sectionId, status: 'in_progress' };
                    onSave(taskData);
                });
                if(mode === 'add') { setTitle(''); setDescription(''); setCurrentPlaceholder(getRandomPlaceholder()); }
                if(onCancel) onCancel();
            }
            setPasteLines(null);
        };

        const handleSubmit = () => {
            const finalPlainTitle = title.replace(/<[^>]*>/g, '').trim();
            if(finalPlainTitle && finalPlainTitle.length <= MAX_CHARS) {
                let finalDueDate = dueDate; if(dueDate && dueTime) finalDueDate = `${dueDate} ${dueTime}:00`;
                const taskData = { id: initialData.id, title, content: description, priority, assignees: assigneeIds, dueDate: finalDueDate, repeat, status, projectId, sectionId,location, labels: selectedLabels, reminder_enabled: reminderEnabled };
                onSave(taskData);
                if(mode === 'add') { 
                    setTitle(''); setDescription(''); setPriority(4); setAssigneeIds([]); setDueDate(''); setDueTime(''); setRepeat(null); setStatus('in_progress'); setLocation(''); setSelectedLabels([]); setReminderEnabled(false);
                    setCurrentPlaceholder(getRandomPlaceholder());
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode'); if(titleEl) titleEl.innerHTML = ''; 
                }
            }
        };

        const handleFormat = (type, value = null) => { 
            if (type === 'link_prompt') { 
                const selection = window.getSelection(); if (selection.rangeCount > 0) savedSelectionRange.current = selection.getRangeAt(0); 
                setTooltipState(prev => ({ ...prev, showLinkInput: true })); 
            } else if (type === 'code') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const code = document.createElement('code');
                    code.textContent = selection.toString();
                    range.deleteContents();
                    range.insertNode(code);
                }
            } else document.execCommand(type, false, value);
        };

        const handleLinkSubmit = (url) => { 
            if (url) { 
                const selection = window.getSelection(); selection.removeAllRanges(); 
                if (savedSelectionRange.current) selection.addRange(savedSelectionRange.current); 
                document.execCommand('createLink', false, url); 
                if (selection.anchorNode && selection.anchorNode.parentElement.tagName === 'A') selection.anchorNode.parentElement.setAttribute('target', '_blank'); 
            } 
            setTooltipState(null); savedSelectionRange.current = null; 
        };
        
        const handleKeyDown = (e) => { 
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleFormat('bold'); } 
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } 
            if (e.key === 'Escape') onCancel(); 
            if (e.key === '#') {
                setTimeout(() => {
                    setActivePopup('labels_menu');
                    setLabelSearch(''); 
                }, 10);
            }
        };

        const { getPriorityColor } = getReminders();
        const selectedProject = projects.find(p => parseInt(p.id) === parseInt(projectId));

        const renderAssigneeLabel = () => {
            if (assigneeIds.length === 0) return [el(Icon, {name:'user'}), 'Atanan'];
            const firstUser = users.find(u => u.id == assigneeIds[0]);
            if (!firstUser) return [el(Icon, {name:'user'}), 'Bilinmeyen'];
            const elements = [el(Avatar, { userId: firstUser.id, users, size: 16, style: { marginRight: 6, verticalAlign:'middle' } }), firstUser.name];
            if (assigneeIds.length > 1) elements.push(el('span', { style: { marginLeft: 4, fontWeight: 'bold', color: '#777' } }, `+${assigneeIds.length - 1}`));
            return elements;
        };

        const currentStatusObj = TASK_STATUSES[status] || TASK_STATUSES['in_progress'];

        const renderPopup = () => {
            if (!activePopup) return null;
            const popupStyle = { top: '100%', left: 0, marginTop: 5, zIndex: 1000 };
            
            if (activePopup === 'assignee') {
                let eligibleUsers = users;
                if (selectedProject) {
                    let mgrs = selectedProject.managers || [];
                    if (typeof mgrs === 'string') mgrs = JSON.parse(mgrs);
                    const pMembers = [parseInt(selectedProject.owner_id), ...mgrs.map(id => parseInt(id))].filter(Boolean);
                    eligibleUsers = users.filter(u => pMembers.includes(parseInt(u.id)));
                }
                const filteredUsers = eligibleUsers.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()));
                const displayUsers = filteredUsers.slice(0, 5);

                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, width: 260 } }, 
                    el('div', { style: { padding: '8px 12px 4px' } },
                        el('input', { type: 'text', placeholder: 'Kişi ara...', value: assigneeSearch, autoFocus: true, onChange: e => setAssigneeSearch(e.target.value), onClick: e => e.stopPropagation(), style: { width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' } })
                    ),
                    el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeIds([]); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8, color: '#888' } }), 'Atanmamış', assigneeIds.length === 0 && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })),
                    displayUsers.map(u => {
                        const isSelected = assigneeIds.some(id => parseInt(id) === parseInt(u.id));
                        return el('div', { key: u.id, className: 'h2l-menu-item', onClick: (e) => { e.stopPropagation(); const newIds = isSelected ? assigneeIds.filter(id => parseInt(id) !== parseInt(u.id)) : [...assigneeIds, u.id]; setAssigneeIds(newIds); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, isSelected && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }));
                    }),
                    displayUsers.length === 0 && el('div', { style: { padding: '10px', fontSize: '12px', color: '#999', textAlign: 'center' } }, 'Kullanıcı bulunamadı'),
                    el('div', { style: { height: 1, background: '#f0f0f0', margin: '4px 0' } },
                    el('div', { className: 'h2l-menu-item', onClick: () => document.dispatchEvent(new CustomEvent('h2l_open_share_menu')) }, el(Icon, { name: 'user-plus', style: { marginRight: 8, color: '#888' } }), 'Projeye davet et'))
                );
            }

            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            
            if (activePopup === 'status') {
                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, width: 200 } }, 
                    Object.entries(TASK_STATUSES).map(([key, val]) => 
                        el('div', { key: key, className: 'h2l-menu-item', onClick: () => { setStatus(key); setActivePopup(null); } }, 
                            el(Icon, { name: val.icon, style: { marginRight: 8, color: val.color } }), 
                            val.label, 
                            status === key && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })
                        )
                    )
                );
            }

            if (activePopup === 'project') {
                const filteredProjects = projects.filter(p => p.title.toLocaleLowerCase('tr').includes(projectSearch.toLocaleLowerCase('tr')));
                
                return el('div', { className: 'h2l-popover-menu', style: { bottom: '100%', top: 'auto', marginBottom: 5, left: 0, width: 250 } }, 
                    el('div', { className: 'h2l-popover-header' },
                        el('input', { 
                            className: 'h2l-search-input', 
                            placeholder: 'Proje ara...', 
                            value: projectSearch, 
                            onChange: e => setProjectSearch(e.target.value), 
                            autoFocus: true, 
                            onClick: e => e.stopPropagation() 
                        })
                    ),
                    el('div', { className: 'h2l-popover-list', style: { maxHeight: 200 } },
                        filteredProjects.map(p => 
                            el('div', { key: p.id, className: 'h2l-menu-item', onClick: () => { setProjectId(p.id); setSectionId(null); setActivePopup(null); setProjectSearch(''); } }, 
                                el('span', { style: { color: p.color, marginRight: 8, fontSize: 14 } }, '#'), 
                                p.title, 
                                parseInt(projectId) === parseInt(p.id) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })
                            )
                        ),
                        filteredProjects.length === 0 && el('div', { style: { padding: '10px', textAlign: 'center', color: '#999', fontSize: '12px' } }, 'Proje bulunamadı')
                    )
                );
            }

            if (activePopup === 'more') {
                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, width: 200 } },
                    el('div', { className: 'h2l-menu-item', onClick: (e) => { e.stopPropagation(); setActivePopup('labels_menu'); } }, el(Icon, { name: 'tag', style: { marginRight: 8, color: '#666' } }), 'Etiketler'),
                    el('div', { className: 'h2l-menu-item', onClick: (e) => { e.stopPropagation(); setActivePopup('location_menu'); } }, el(Icon, { name: 'location-dot', style: { marginRight: 8, color: '#666' } }), 'Konum')
                );
            }

            if (activePopup === 'labels_menu') {
                const filteredLabels = labels.filter(l => l.name.toLowerCase().includes(labelSearch.toLowerCase()));
                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, width: 220 } },
                    el('div', { className: 'h2l-popover-header' }, 
                        el('input', { className: 'h2l-search-input', placeholder: 'Etiket ara...', value: labelSearch, onChange: e => setLabelSearch(e.target.value), autoFocus: true, onClick: e => e.stopPropagation() })
                    ),
                    el('div', { className: 'h2l-popover-list' },
                        filteredLabels.map(l => {
                            const isSelected = selectedLabels.includes(l.name);
                            return el('div', { key: l.id, className: 'h2l-menu-item', onClick: (e) => { 
                                e.stopPropagation(); 
                                if (isSelected) {
                                    setSelectedLabels(selectedLabels.filter(sl => sl !== l.name));
                                } else {
                                    if (selectedLabels.length >= 3) {
                                        setLimitWarning('En fazla 3 etiket ekleyebilirsiniz.');
                                        setTimeout(() => setLimitWarning(null), 3000);
                                        return;
                                    }
                                    setSelectedLabels([...selectedLabels, l.name]);
                                }
                            } },
                                el(Icon, { name: 'tag', style: { color: l.color || '#808080', marginRight: 8, fontSize: 12 } }),
                                l.name,
                                isSelected && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f', fontSize: 12 } })
                            );
                        }),
                        filteredLabels.length === 0 && labelSearch.trim() !== '' && el('div', { className: 'h2l-menu-item', onClick: (e) => { 
                            e.stopPropagation(); 
                            if (selectedLabels.length >= 3) {
                                setLimitWarning('En fazla 3 etiket ekleyebilirsiniz.');
                                setTimeout(() => setLimitWarning(null), 3000);
                                return;
                            }
                            setSelectedLabels([...selectedLabels, labelSearch]); 
                            setLabelSearch(''); 
                        } }, el(Icon, { name: 'plus', style: { marginRight: 8 } }), `"${labelSearch}" oluştur`)
                    )
                );
            }

            if (activePopup === 'location_menu') {
                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, width: 260, padding: 10 } },
                    el('div', { className: 'h2l-menu-title', style: { margin: '0 0 5px 0' } }, 'Konum Ekle'),
                    el('input', { 
                        className: 'h2l-input', style: { width: '100%', fontSize: 13 }, 
                        placeholder: 'Konum adı...', value: location, 
                        onChange: e => setLocation(e.target.value), 
                        onKeyDown: e => { if(e.key === 'Enter') setActivePopup(null); },
                        autoFocus: true, onClick: e => e.stopPropagation()
                    }),
                    el('div', { style: { marginTop: 8, textAlign: 'right' } }, 
                        el('button', { className: 'h2l-btn primary small', onClick: () => setActivePopup(null) }, 'Tamam')
                    )
                );
            }

            return null;
        };

        const handleDateChange = (data) => { setDueDate(data.date); setDueTime(data.time); setRepeat(data.repeat); };

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef },
            tooltipState && el(TextTooltip, { position: tooltipState.pos, showLinkInput: tooltipState.showLinkInput, onFormat: handleFormat, onLinkSubmit: handleLinkSubmit, onClose: () => setTooltipState(null), type: tooltipState.type }),
            pasteLines && el(PasteModal, { lines: pasteLines, onConfirm: handlePasteConfirm, onCancel: () => setPasteLines(null) }),

            el('div', { className: 'h2l-todoist-editor-body' },
                el(ContentEditable, { html: title, onChange: setTitle, placeholder: currentPlaceholder, className: 'title-mode', autoFocus: true, onKeyDown: handleKeyDown, onPasteIntent: (lines) => setPasteLines(lines), onInputHighlight: handleHighlight }),
                el(ContentEditable, { html: description, onChange: setDescription, placeholder: 'Açıklama', className: 'desc-mode', onPasteIntent: (lines, html) => document.execCommand('insertHTML', false, html || lines.join('\n')), onInputHighlight: null }),
                isLimitExceeded && el('div', { className: 'h2l-limit-warning' }, `Görev ismi karakter limiti: ${plainTitle.length} / ${MAX_CHARS}`),
                limitWarning && el('div', { className: 'h2l-limit-warning', style: { color: '#e67e22' } }, limitWarning),

                el('div', { className: 'h2l-todoist-chips-area' },
                    el(DatePickerWrapper, { date: dueDate, time: dueTime, repeat: repeat, onChange: handleDateChange }),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, 
                        el('button', { className: `h2l-todoist-chip ${assigneeIds.length > 0 ? 'active' : ''}`, onClick: (e) => { e.stopPropagation(); setActivePopup(activePopup === 'assignee' ? null : 'assignee'); } }, renderAssigneeLabel()), 
                        activePopup === 'assignee' && renderPopup()
                    ),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, 
                        el('button', { 
                            className: 'h2l-todoist-chip', 
                            onClick: (e) => { e.stopPropagation(); setActivePopup(activePopup === 'priority' ? null : 'priority'); }, 
                            style: { borderColor: priority !== 4 ? getPriorityColor(priority) : '#e5e5e5', color: priority !== 4 ? getPriorityColor(priority) : '#555' } 
                        }, 
                            el(Icon, {name:'flag', style: { color: getPriorityColor(priority) } }), 
                            ` Öncelik ${priority !== 4 ? priority : ''}`
                        ), 
                        activePopup === 'priority' && renderPopup()
                    ),
                    el('div', { className: 'h2l-chip-wrapper' }, 
                        el('button', { 
                            className: `h2l-todoist-chip ${reminderEnabled ? 'active' : ''}`,
                            onClick: () => setReminderEnabled(!reminderEnabled),
                            style: { color: reminderEnabled ? '#db4c3f' : '#555', borderColor: reminderEnabled ? '#db4c3f' : '#e5e5e5' }
                        }, el(Icon, {name:'bell', style: { color: reminderEnabled ? '#db4c3f' : '#666' }}), reminderEnabled ? ' Hatırlatıcı Açık' : ' Hatırlatıcı')
                    ),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: (e) => { e.stopPropagation(); setActivePopup(activePopup === 'status' ? null : 'status'); } }, el(Icon, {name: currentStatusObj.icon, style: { color: currentStatusObj.color }}), ` ${currentStatusObj.label}`), activePopup === 'status' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip icon-only', onClick: (e) => { e.stopPropagation(); setActivePopup(activePopup === 'more' ? null : 'more'); } }, el(Icon, {name:'ellipsis'})), (activePopup === 'more' || activePopup === 'labels_menu' || activePopup === 'location_menu') && renderPopup())
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-chip-wrapper' }, el('div', { className: 'h2l-todoist-project-selector', onClick: (e) => { e.stopPropagation(); setActivePopup(activePopup === 'project' ? null : 'project'); } }, selectedProject ? el('span', {style:{color:selectedProject.color}}, '#') : el(Icon, {name:'inbox'}), el('span', null, selectedProject ? selectedProject.title : 'Proje Seç'), el(Icon, {name:'angle-down', style:{fontSize:10, marginLeft:4}})), activePopup === 'project' && renderPopup()),
                el('div', { className: 'h2l-todoist-footer-actions' }, el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'), el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !plainTitle || isLimitExceeded }, mode === 'add' ? 'Görev ekle' : 'Kaydet'))
            )
        );
    };

    const QuickAddTrigger = ({ onOpen }) => {
        return el('div', { className: 'h2l-todoist-add-trigger', onClick: onOpen }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
    };

    window.H2L.TaskInput = { TaskEditor, QuickAddTrigger, ContentEditable };

})(window.wp);