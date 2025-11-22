(function(wp) {
    window.H2L = window.H2L || {};
    window.H2L.Reminders = window.H2L.Reminders || {};

    // --- YARDIMCI: Render Rich Text (Mevcut) ---
    const renderRichText = (text, mode = 'display') => {
        if (!text) return null;
        const { createElement: el } = wp.element;
        
        // Regex: Öncelik, Tarihler, Mentions, Markdown, Linkler
        const regex = /((?:^|\s)(?:p[1-4]|bugün|yarın|dün|haftaya|gelecek hafta|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|@\w+|#[^\s]+|>[^\s]+|\+\w+)(?=$|\s)|\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/gi;
        
        return text.split(regex).map((part, index) => {
            if (!part) return null;
            
            // Chips / Highlights
            if (part.match(/^(?:^|\s)(?:p[1-4]|bugün|yarın|dün|haftaya|gelecek hafta|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|@\w+|#[^\s]+|>[^\s]+|\+\w+)$/i)) {
                let className = 'h2l-highlight-tag';
                const lower = part.toLowerCase().trim();
                
                if(lower.startsWith('p') && lower.length === 2 && !isNaN(lower[1])) className += ' priority';
                else if(lower.startsWith('@')) className += ' mention';
                else if(lower.startsWith('#')) className += ' project';
                else if(lower.startsWith('>')) className += ' section';
                else if(lower.startsWith('+')) className += ' status';
                else className += ' date'; 

                return el('span', { key: index, className: className }, part);
            }

            // Markdown Rules
            if (part.match(/^\*\*[^*]+\*\*$/)) return el('strong', { key: index, className: 'h2l-md-bold' }, part.slice(2, -2));
            if (part.match(/^\*[^*]+\*$/) || part.match(/^_[^_]+_$/)) return el('em', { key: index, className: 'h2l-md-italic' }, part.slice(1, -1));
            if (part.match(/^~~[^~]+~~$/)) return el('del', { key: index, className: 'h2l-md-strike' }, part.slice(2, -2));
            if (part.match(/^`[^`]+`$/)) return el('code', { key: index, className: 'h2l-md-code' }, part.slice(1, -1));
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return el('a', { 
                    key: index, href: linkMatch[2], className: 'h2l-md-link', target: '_blank', rel: 'noopener noreferrer',
                    onClick: (e) => { e.stopPropagation(); }, onMouseDown: (e) => e.stopPropagation()
                }, linkMatch[1]);
            }
            return part;
        });
    };

    const getPriorityColor = (p) => {
        switch(parseInt(p)) {
            case 1: return '#d1453b'; // Kırmızı
            case 2: return '#eb8909'; // Turuncu
            case 3: return '#246fe0'; // Mavi
            default: return '#808080'; // Gri
        }
    };

    // --- SMART PARSING ENGINE (Akıllı Ayrıştırıcı) ---
    
    const SmartParser = {
        // Regex Kütüphanesi
        patterns: {
            priority: /(?:^|\s)p([1-4])(?:$|\s)/i,
            user: /(?:^|\s)@(\w+)/,
            projectOrLabel: /(?:^|\s)#([\w\u00C0-\u017F-]+)/, // Türkçe karakter destekli #etiket
            section: /(?:^|\s)>([\w\u00C0-\u017F-]+)/,
            status: /(?:^|\s)\+([\w\u00C0-\u017F]+)/, // +Açık vb.
            
            // Tarih Kalıpları (Basitten karmaşığa)
            today: /\b(bugün|today)\b/i,
            tomorrow: /\b(yarın|tomorrow|yarından sonra)\b/i,
            weekDays: /\b(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
            nextWeek: /\b(gelecek hafta|haftaya|bu hafta|önümüzdeki hafta)\b/i,
            relativeDays: /\b(\d+)\s+(gün|hafta|ay)\s+(sonra)\b/i,
            
            // Formatlı Tarihler
            dateSlash: /\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{4}))?\b/, // 12/2 veya 12.02.2025
            dateText: /\b(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
            
            // Saat
            time: /\b(\d{1,2})[:.](\d{2})\b/, // 14:00, 14.30
            
            // Tekrar (Recurring)
            recurring: /\b(her|every)\s+(gün|sabah|akşam|hafta|ay|yıl|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)\b/i
        },

        /**
         * Metni analiz eder ve yapılandırılmış veri döndürür.
         * @param {string} text - Kullanıcının girdiği ham metin
         * @param {Array} projects - Mevcut projeler listesi (Çakışma kontrolü için)
         * @param {Array} users - Mevcut kullanıcılar listesi
         * @param {Array} sections - Mevcut bölümler
         */
        parse: function(text, projects = [], users = [], sections = []) {
            if (!text) return {};

            let parsed = {
                cleanTitle: text,
                priority: null,
                assigneeId: null,
                dueDate: null,
                projectId: null,
                sectionId: null,
                labels: [],
                status: null,
                isRecurring: false,
                rawDateString: null // UI'da göstermek için yakalanan tarih metni
            };

            // 1. Öncelik (Priority)
            const pMatch = text.match(this.patterns.priority);
            if (pMatch) {
                parsed.priority = parseInt(pMatch[1]);
                parsed.cleanTitle = parsed.cleanTitle.replace(pMatch[0], ' ');
            }

            // 2. Kullanıcı (Assignee)
            const uMatch = text.match(this.patterns.user);
            if (uMatch && users.length > 0) {
                const search = uMatch[1].toLowerCase();
                const user = users.find(u => u.name.toLowerCase().includes(search));
                if (user) {
                    parsed.assigneeId = user.id;
                    parsed.cleanTitle = parsed.cleanTitle.replace(uMatch[0], ' ');
                }
            }

            // 3. Proje ve Etiketler (#)
            // Todoist mantığı: Eğer #isim bir projeye uyuyorsa Proje seçilir, uymuyorsa Etiket olur.
            let plMatch;
            while ((plMatch = this.patterns.projectOrLabel.exec(parsed.cleanTitle)) !== null) {
                const tag = plMatch[1];
                const project = projects.find(p => p.title.toLowerCase() === tag.toLowerCase() || p.slug === tag.toLowerCase());
                
                if (project) {
                    parsed.projectId = project.id; // Proje bulundu
                } else {
                    parsed.labels.push(tag); // Proje değilse etikettir
                }
                parsed.cleanTitle = parsed.cleanTitle.replace(plMatch[0], ' ');
            }

            // 4. Bölüm (Section) >
            const sMatch = text.match(this.patterns.section);
            if (sMatch) {
                const secName = sMatch[1].toLowerCase();
                // Eğer proje seçildiyse sadece o projenin bölümlerine bak, yoksa tümüne bak
                const relevantSections = parsed.projectId 
                    ? sections.filter(s => parseInt(s.project_id) === parseInt(parsed.projectId))
                    : sections;
                
                const section = relevantSections.find(s => s.name.toLowerCase().includes(secName));
                if (section) {
                    parsed.sectionId = section.id;
                    // Eğer proje seçilmediyse ama bölüm bulunduysa, projesini de otomatik seç
                    if (!parsed.projectId) parsed.projectId = section.project_id;
                    parsed.cleanTitle = parsed.cleanTitle.replace(sMatch[0], ' ');
                }
            }

            // 5. Durum (Status) +
            const stMatch = text.match(this.patterns.status);
            if (stMatch) {
                const stMap = { 'açık': 'open', 'tamamlandı': 'completed', 'bekliyor': 'on_hold' };
                const stKey = stMatch[1].toLowerCase();
                if(stMap[stKey]) parsed.status = stMap[stKey];
                parsed.cleanTitle = parsed.cleanTitle.replace(stMatch[0], ' ');
            }

            // 6. Tarih ve Saat (En karmaşık kısım)
            const dateResult = this.parseDate(text);
            if (dateResult) {
                parsed.dueDate = dateResult.date;
                parsed.isRecurring = dateResult.isRecurring;
                parsed.rawDateString = dateResult.matchedString;
                // Tarih metnini başlıktan temizle
                // Not: Bu biraz risklidir, çünkü "Toplantı bugün 14:00" -> "Bugün 14:00" kısmını silmemiz lazım.
                // Basit bir replace yapalım, çoklu tarih varsa ilki gider.
                parsed.cleanTitle = parsed.cleanTitle.replace(dateResult.matchedString, ' ');
            }

            // Temizlik
            parsed.cleanTitle = parsed.cleanTitle.replace(/\s+/g, ' ').trim();
            return parsed;
        },

        /**
         * İç Tarih Çözümleyici
         */
        parseDate: function(text) {
            const now = new Date();
            let targetDate = new Date();
            let hasDate = false;
            let matchedString = "";
            let isRecurring = false;

            // Tekrarlı Görev Kontrolü
            const recMatch = text.match(this.patterns.recurring);
            if (recMatch) {
                isRecurring = true;
                matchedString = recMatch[0];
                // Detaylı RRULE hesaplaması backend'e bırakılabilir veya burada genişletilebilir.
                // Şimdilik basitçe "yarın" mantığı gibi bir sonraki oluşumu hesaplayalım.
                if(recMatch[2].match(/gün|sabah|akşam/i)) targetDate.setDate(now.getDate() + 1);
                else if(recMatch[2].match(/hafta/i)) targetDate.setDate(now.getDate() + 7);
                hasDate = true;
            }

            // Günlük İfadeler (Bugün, Yarın...)
            if (!hasDate) {
                const todayMatch = text.match(this.patterns.today);
                const tomMatch = text.match(this.patterns.tomorrow);
                const relMatch = text.match(this.patterns.relativeDays);
                
                if (todayMatch) {
                    hasDate = true; matchedString = todayMatch[0];
                } else if (tomMatch) {
                    if(tomMatch[0].includes('yarından sonra')) targetDate.setDate(now.getDate() + 2);
                    else targetDate.setDate(now.getDate() + 1);
                    hasDate = true; matchedString = tomMatch[0];
                } else if (relMatch) {
                    const num = parseInt(relMatch[1]);
                    if (relMatch[2] === 'gün') targetDate.setDate(now.getDate() + num);
                    if (relMatch[2] === 'hafta') targetDate.setDate(now.getDate() + (num * 7));
                    hasDate = true; matchedString = relMatch[0];
                }
            }

            // Gün İsimleri (Pazartesi...)
            if (!hasDate) {
                const dayMatch = text.match(this.patterns.weekDays);
                if (dayMatch) {
                    const days = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
                    // Mapping ingilizce destekli
                    const dayMap = { 'sunday':0, 'monday':1, 'tuesday':2, 'wednesday':3, 'thursday':4, 'friday':5, 'saturday':6 };
                    let targetDay = -1;
                    const dLower = dayMatch[0].toLowerCase();
                    if (days.includes(dLower)) targetDay = days.indexOf(dLower);
                    else if (dayMap[dLower] !== undefined) targetDay = dayMap[dLower];

                    if (targetDay > -1) {
                        let diff = targetDay - now.getDay();
                        if (diff <= 0) diff += 7;
                        if (text.match(/önümüzdeki|gelecek/i)) diff += 7; // "Gelecek pazartesi"
                        targetDate.setDate(now.getDate() + diff);
                        hasDate = true; matchedString = dayMatch[0];
                    }
                }
            }

            // Formatlı Tarih (12/2 veya 5 Şubat)
            if (!hasDate) {
                const slashMatch = text.match(this.patterns.dateSlash);
                const textMatch = text.match(this.patterns.dateText);

                if (slashMatch) {
                    // TR format: Gün/Ay
                    targetDate.setMonth(parseInt(slashMatch[2]) - 1);
                    targetDate.setDate(parseInt(slashMatch[1]));
                    if(slashMatch[3]) targetDate.setFullYear(parseInt(slashMatch[3]));
                    // Geçmiş tarihse seneye at
                    if(targetDate < now && !slashMatch[3]) targetDate.setFullYear(now.getFullYear() + 1);
                    hasDate = true; matchedString = slashMatch[0];
                } else if (textMatch) {
                    const months = ['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık'];
                    const mIndex = months.findIndex(m => textMatch[2].toLowerCase().startsWith(m.substring(0,3)));
                    if(mIndex > -1) {
                        targetDate.setMonth(mIndex);
                        targetDate.setDate(parseInt(textMatch[1]));
                        if(targetDate < now) targetDate.setFullYear(now.getFullYear() + 1);
                        hasDate = true; matchedString = textMatch[0];
                    }
                }
            }

            // Saat Kontrolü (Bağımsız veya tarihe ekli)
            const timeMatch = text.match(this.patterns.time);
            if (timeMatch) {
                targetDate.setHours(parseInt(timeMatch[1]));
                targetDate.setMinutes(parseInt(timeMatch[2]));
                targetDate.setSeconds(0);
                // Eğer tarih bulunmadıysa ama saat varsa, "Bugün o saat" kabul et
                if (!hasDate) {
                    hasDate = true; 
                    // Eğer saat geçmişse yarına at? (Todoist mantığı: hayır, bugün kalır, overdue olur)
                }
                // matchedString'e saati de ekle (eğer ayrıysa)
                if (!matchedString.includes(timeMatch[0])) {
                    matchedString += (matchedString ? ' ' : '') + timeMatch[0];
                }
            }

            if (hasDate) {
                // ISO String (Local Timezone Fix)
                const year = targetDate.getFullYear();
                const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                const day = String(targetDate.getDate()).padStart(2, '0');
                const hour = String(targetDate.getHours()).padStart(2, '0');
                const min = String(targetDate.getMinutes()).padStart(2, '0');
                
                return {
                    date: `${year}-${month}-${day} ${hour}:${min}`,
                    isRecurring: isRecurring,
                    matchedString: matchedString
                };
            }

            return null;
        }
    };

    window.H2L.Reminders = {
        renderRichText,
        getPriorityColor,
        SmartParser // Dışarıya açtık
    };

})(window.wp);