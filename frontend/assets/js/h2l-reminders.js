(function(wp) {
    window.H2L = window.H2L || {};
    window.H2L.Reminders = window.H2L.Reminders || {};

    // --- REGEX TANIMLARI ---
    const PATTERNS = {
        // Etiketler (Basit Mod: Grup 1=Önek, Grup 2=Anahtar Kelime)
        priority: /(^|\s)(p[1-4])(?=\s|$)/i,
        user: /(^|\s)(@[\w\u00C0-\u017F]{2,})(?=\s|$)/,
        projectOrLabel: /(^|\s)(#[\w\u00C0-\u017F-]{2,})(?=\s|$)/,
        section: /(^|\s)(>[\w\u00C0-\u017F\s]{2,})(?=\s|$)/,
        status: /(^|\s)(\+[\w\u00C0-\u017F]{2,})(?=\s|$)/,
        
        // Tarih ve Zaman (Kapsamlı Mod)
        keywords: /\b(bugün|today|yarın|tomorrow|dün|yesterday|yarından\s+sonra|geçen\s+hafta|gelecek\s+hafta|haftaya|bu\s+hafta|önümüzdeki\s+(?:hafta|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)|hafta\s+sonu)\b/gi,
        dayNames: /\b(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
        relative: /\b((?:\d+|bir|iki|üç|dört|beş|on)\s+(?:gün|hafta|ay|yıl)\s+(?:sonra|ertele|taşı)|(?:yarına|gelecek\s+haftaya|haftaya|bugünden\s+yarına)\s+(?:ertele|taşı)|(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)(?:ye|ya|e|a)\s+(?:kadar|ertele))\b/gi,
        formatted: /\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{4}))?\b/g,
        namedMonth: /\b(?:\d{1,2}\s+(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2})(?:\s+\d{4})?\b/gi,
        time: /\b(?:\d{1,2}[:.]\d{2}(?:\s?(?:am|pm))?|\d{1,2}(?:am|pm)|(?:\d{1,2})(?:[:.]00)?\s*['’](?:da|de|ta|te))\b/gi,
        recurring: /\b(her\s+(?:(?:\d+|bir|iki|üç)\s+)?(?:gün|sabah|akşam|hafta|ay|yıl|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)(?:\s+(?:içi|sonu|günü|bir))?|hafta\s*sonları|her\s+ayın\s+(?:son\s+günü|\d+(?:['’].*)?))\b/gi
    };

    // Statü Eşleştirme Haritası
    const STATUS_MAP = { 
        'başlamadı': 'not_started',
        'devam': 'in_progress',
        'bekle': 'on_hold',
        'iptal': 'cancelled',
        'tamam': 'completed',
        'bitti': 'completed',
        'revize': 'in_review',
        'onay': 'pending_approval'
    };

    const textToNum = (text) => {
        const map = { 'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5, 'on': 10 };
        return map[text.toLowerCase()] || parseInt(text) || 1;
    };

    // --- HIGHLIGHT HTML ENGINE ---
    const generateHighlightHTML = (htmlContent) => {
        if (!htmlContent) return '';
        const wrapper = document.createElement('div');
        wrapper.innerHTML = htmlContent;
        
        // Sadece metin düğümlerini gez (HTML yapısını bozmamak için)
        const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(node => {
            // Zaten highlight edilmiş bir elementin içindeysek atla
            if (node.parentElement && (node.parentElement.classList.contains('h2l-highlight-tag') || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentElement.tagName))) return;

            let text = node.nodeValue;
            if(!text || text.trim().length < 2) return; 

            let newHTML = text;
            let changed = false;

            const replaceSafe = (regex, className, mode = 'phrase') => {
                const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
                
                const temp = newHTML.replace(re, (match, ...args) => {
                    if (mode === 'simple') {
                        const p1 = args[0]; 
                        const p2 = args[1];
                        
                        if (p2 && typeof p2 === 'string') {
                            let finalClass = className;
                            
                            // Priority Özel Rengi (p1, p2...)
                            if (className === 'priority') {
                                finalClass = `priority priority-${p2.toLowerCase()}`;
                            }
                            
                            // Status Özel Rengi (+onay, +iptal...)
                            if (className === 'status') {
                                const stKey = p2.replace('+','').toLowerCase();
                                let statusKey = 'default';
                                
                                // Haritada anahtar kelimeyi ara
                                for (const [key, val] of Object.entries(STATUS_MAP)) {
                                    if (stKey.includes(key)) {
                                        statusKey = val;
                                        break;
                                    }
                                }
                                finalClass = `status status-${statusKey}`;
                            }

                            return `${p1}<span class="h2l-highlight-tag ${finalClass}">${p2}</span>`;
                        }
                    } else {
                        // Phrase Mode (Tarihler vb.)
                        return `<span class="h2l-highlight-tag ${className}">${match}</span>`;
                    }
                    return match;
                });

                if (temp !== newHTML) {
                    newHTML = temp;
                    changed = true;
                }
            };

            // Önce uzun ifadeleri (Tarihler) işle
            replaceSafe(PATTERNS.recurring, 'date', 'phrase');
            replaceSafe(PATTERNS.relative, 'date', 'phrase');
            replaceSafe(PATTERNS.namedMonth, 'date', 'phrase');
            replaceSafe(PATTERNS.keywords, 'date', 'phrase');
            replaceSafe(PATTERNS.formatted, 'date', 'phrase');
            replaceSafe(PATTERNS.time, 'date', 'phrase');
            replaceSafe(PATTERNS.dayNames, 'date', 'phrase');

            // Sonra kısa etiketleri işle
            replaceSafe(PATTERNS.priority, 'priority', 'simple');
            replaceSafe(PATTERNS.user, 'mention', 'simple');
            replaceSafe(PATTERNS.projectOrLabel, 'project', 'simple');
            replaceSafe(PATTERNS.section, 'section', 'simple');
            replaceSafe(PATTERNS.status, 'status', 'simple');

            if (changed) {
                const tempSpan = document.createElement('span');
                tempSpan.innerHTML = newHTML;
                if (node.parentNode) {
                    while (tempSpan.firstChild) node.parentNode.insertBefore(tempSpan.firstChild, node);
                    node.parentNode.removeChild(node);
                }
            }
        });
        return wrapper.innerHTML;
    };

    const renderRichText = (text) => {
        if (!text) return null;
        const { createElement: el } = wp.element;
        return el('span', { dangerouslySetInnerHTML: { __html: generateHighlightHTML(text) } });
    };

    const getPriorityColor = (p) => {
        switch(parseInt(p)) { case 1: return '#d1453b'; case 2: return '#eb8909'; case 3: return '#246fe0'; default: return '#808080'; }
    };

    // --- SMART PARSER (Veri Çıkarma) ---
    const SmartParser = {
        patterns: PATTERNS,
        
        parse: function(text, projects = [], users = [], sections = []) {
            if (!text || text.length < 2) return {};
            
            let cleanText = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');

            let parsed = {
                cleanTitle: text, 
                rawText: cleanText.trim(),
                priority: null, assigneeId: null, dueDate: null,
                projectId: null, sectionId: null, labels: [], status: null, isRecurring: false
            };

            // 1. Öncelik
            const pMatch = cleanText.match(PATTERNS.priority);
            if (pMatch && pMatch[2]) parsed.priority = parseInt(pMatch[2].replace('p',''));

            // 2. Kullanıcı
            const uMatch = cleanText.match(PATTERNS.user);
            if (uMatch && uMatch[2] && users.length > 0) {
                const search = uMatch[2].replace('@','').toLowerCase();
                const user = users.find(u => u.name.toLowerCase().includes(search));
                if (user) parsed.assigneeId = user.id;
            }

            // 3. Proje & Etiket
            const pRegex = new RegExp(PATTERNS.projectOrLabel, 'gi');
            let match;
            while ((match = pRegex.exec(cleanText)) !== null) {
                const tag = match[2];
                if(tag) {
                    const tagName = tag.replace('#','');
                    const project = projects.find(p => p.title.toLowerCase() === tagName.toLowerCase() || p.slug === tagName.toLowerCase());
                    if (project) parsed.projectId = project.id;
                    else parsed.labels.push(tagName);
                }
            }

            // 4. Bölüm
            const sMatch = cleanText.match(PATTERNS.section);
            if (sMatch && sMatch[2]) {
                const secName = sMatch[2].replace('>','').trim().toLowerCase();
                const relevantSections = parsed.projectId ? sections.filter(s => parseInt(s.project_id) === parseInt(parsed.projectId)) : sections;
                const section = relevantSections.find(s => s.name.toLowerCase().includes(secName));
                if (section) {
                    parsed.sectionId = section.id;
                    if(!parsed.projectId) parsed.projectId = section.project_id;
                }
            }

            // 5. Statü (Status)
            const stMatch = cleanText.match(PATTERNS.status);
            if (stMatch && stMatch[2]) {
                const stKey = stMatch[2].replace('+','').toLowerCase();
                for (const [key, val] of Object.entries(STATUS_MAP)) {
                    if (stKey.includes(key)) {
                        parsed.status = val;
                        break;
                    }
                }
            }

            // 6. Tarih
            const dateResult = this.parseDate(cleanText);
            if (dateResult) {
                parsed.dueDate = dateResult.date;
                parsed.isRecurring = dateResult.isRecurring;
            }

            return parsed;
        },

        parseDate: function(text) {
            const now = new Date();
            let targetDate = new Date();
            let hasDate = false;
            let isRecurring = false;

            if(text.match(PATTERNS.recurring)) { isRecurring = true; hasDate = true; }

            const relMatch = text.match(PATTERNS.relative);
            if(relMatch && !isRecurring) {
                const m = relMatch[0].toLowerCase();
                if (m.includes('yarına')) { targetDate.setDate(now.getDate() + 1); hasDate = true; }
                else if (m.includes('gelecek hafta') || m.includes('haftaya')) { targetDate.setDate(now.getDate() + 7); hasDate = true; }
                else {
                    const parts = m.split(/\s+/);
                    const num = textToNum(parts[0]);
                    if (m.includes('gün')) targetDate.setDate(now.getDate() + num);
                    if (m.includes('hafta')) targetDate.setDate(now.getDate() + (num * 7));
                    if (m.includes('ay')) targetDate.setMonth(now.getMonth() + num);
                    hasDate = true;
                }
            }

            if (!hasDate) {
                if (text.match(/\b(bugün|today)\b/i)) { targetDate = now; hasDate = true; }
                else if (text.match(/\b(yarın|tomorrow)\b/i)) { targetDate.setDate(now.getDate() + 1); hasDate = true; }
                else if (text.match(/\b(dün|yesterday)\b/i)) { targetDate.setDate(now.getDate() - 1); hasDate = true; }
            }

            const nameMatch = text.match(PATTERNS.namedMonth);
            if (nameMatch && !hasDate) {
                const mStr = nameMatch[0].toLowerCase();
                const months = ['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık', 'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                let day = 1, mIndex = -1;
                
                const words = mStr.split(/[\s,]+/);
                words.forEach(w => {
                    const idx = months.findIndex(m => w.startsWith(m.substring(0,3)));
                    if(idx > -1) mIndex = idx;
                    else if(!isNaN(parseInt(w)) && parseInt(w) < 32) day = parseInt(w);
                    else if(!isNaN(parseInt(w)) && parseInt(w) > 1000) targetDate.setFullYear(parseInt(w));
                });

                if (mIndex > -1) {
                    mIndex = mIndex % 12;
                    targetDate.setDate(day);
                    targetDate.setMonth(mIndex);
                    if (targetDate < now && !mStr.match(/\d{4}/)) targetDate.setFullYear(now.getFullYear() + 1);
                    hasDate = true;
                }
            }

            if (!hasDate) {
                const dayMatch = text.match(PATTERNS.dayNames);
                if (dayMatch) {
                    const days = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
                    const dLower = dayMatch[0].toLowerCase();
                    const targetIdx = days.findIndex(d => dLower.startsWith(d.substring(0,3)));
                    if (targetIdx > -1) {
                        let diff = targetIdx - now.getDay();
                        if (diff <= 0) diff += 7;
                        if (text.match(/gelecek|haftaya|önümüzdeki|next/i)) diff += 7;
                        targetDate.setDate(now.getDate() + diff);
                        hasDate = true;
                    }
                }
            }

            const fmtMatch = text.match(PATTERNS.formatted);
            if (fmtMatch && !hasDate) {
                const parts = fmtMatch[0].split(/[\/.]/);
                if(parts.length >= 2) {
                    targetDate.setDate(parseInt(parts[0]));
                    targetDate.setMonth(parseInt(parts[1]) - 1);
                    if(parts.length === 3) targetDate.setFullYear(parseInt(parts[2]));
                    else if(targetDate < now) targetDate.setFullYear(now.getFullYear() + 1);
                    hasDate = true;
                }
            }

            const timeMatch = text.match(PATTERNS.time);
            if (timeMatch) {
                const tStr = timeMatch[0];
                let hr = 0, min = 0;
                if(tStr.includes(':') || tStr.includes('.')) {
                    const parts = tStr.split(/[:.]/);
                    hr = parseInt(parts[0]);
                    min = parseInt(parts[1]);
                } else {
                    hr = parseInt(tStr.replace(/\D/g, ''));
                }
                if(tStr.toLowerCase().includes('pm') && hr < 12) hr += 12;
                if(tStr.toLowerCase().includes('am') && hr === 12) hr = 0;
                targetDate.setHours(hr);
                targetDate.setMinutes(min);
                if(!hasDate) hasDate = true;
            }

            if (hasDate) {
                const y = targetDate.getFullYear();
                const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                const d = String(targetDate.getDate()).padStart(2, '0');
                const h = String(targetDate.getHours()).padStart(2, '0');
                const i = String(targetDate.getMinutes()).padStart(2, '0');
                return { date: `${y}-${m}-${d} ${h}:${i}`, isRecurring: isRecurring };
            }
            return null;
        }
    };

    window.H2L.Reminders = {
        renderRichText,
        generateHighlightHTML,
        getPriorityColor,
        SmartParser
    };

})(window.wp);