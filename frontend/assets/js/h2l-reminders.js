(function(wp) {
    const { createElement: el } = wp.element;
    window.H2L = window.H2L || {};
    window.H2L.Reminders = window.H2L.Reminders || {};

    // --- HELPERS ---
    const getPriorityColor = (p) => {
        switch(parseInt(p)) {
            case 1: return '#d1453b'; // Kırmızı
            case 2: return '#eb8909'; // Turuncu
            case 3: return '#246fe0'; // Mavi
            default: return '#808080'; // Gri
        }
    };

    // --- PARSERS ---
    
    /**
     * Görev başlığındaki özel komutları (p1, @ali, #etiket, yarın) temizler.
     */
    const cleanTaskTitle = (text) => {
        let clean = text || "";
        
        // Öncelik
        clean = clean.replace(/(?:^|\s)p[1-4](?:$|\s)/gi, ' ');
        
        // Tarihler (helpers.php ile uyumlu patternler)
        const datePatterns = [
            /(?:^|\s)(?:bugün|yarın|dün|today|tomorrow)(?:$|\s)/gi,
            /(?:^|\s)(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)(?:$|\s)/gi,
            /(?:^|\s)(?:gelecek hafta|haftaya)(?:$|\s)/gi,
            /(?:^|\s)(?:\d+\s+gün\s+sonra)(?:$|\s)/gi
        ];

        datePatterns.forEach(regex => {
            clean = clean.replace(regex, ' ');
        });

        return clean.replace(/\s+/g, ' ').trim();
    };

    /**
     * Rich Text Render:
     * Input içindeki text'i alır ve özel anahtar kelimeleri highlight eder.
     */
    const renderRichText = (text, mode = 'display') => {
        if (!text) return null;
        
        // Regex: Öncelik, Tarihler, Mentions, Markdown
        const regex = /((?:^|\s)(?:p[1-4]|bugün|yarın|dün|haftaya|gelecek hafta|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|@\w+)(?=$|\s)|\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/gi;
        
        return text.split(regex).map((part, index) => {
            if (!part) return null;
            
            // Chips / Highlights
            if (part.match(/^(?:^|\s)(?:p[1-4]|bugün|yarın|dün|haftaya|gelecek hafta|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|@\w+)$/i)) {
                let className = 'h2l-highlight-tag';
                if(part.toLowerCase().includes('p')) className += ' priority';
                else if(part.startsWith('@')) className += ' mention';
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

    // --- DATE CALCULATOR (JS Side for Optimistic UI) ---
    const calculateDateFromText = (text) => {
        const lower = text.toLowerCase();
        const today = new Date();
        let target = new Date();

        if(lower.includes('yarın')) target.setDate(today.getDate() + 1);
        else if(lower.includes('bugün')) { /* zaten bugün */ }
        else if(lower.includes('haftaya') || lower.includes('gelecek hafta')) target.setDate(today.getDate() + 7);
        else {
            const days = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
            const dayIndex = days.findIndex(d => lower.includes(d));
            if(dayIndex > -1) {
                let diff = dayIndex - today.getDay();
                if (diff <= 0) diff += 7; 
                target.setDate(today.getDate() + diff);
            } else {
                return null; 
            }
        }
        return target.toISOString().split('T')[0];
    };

    window.H2L.Reminders = {
        getPriorityColor,
        cleanTaskTitle,
        renderRichText,
        calculateDateFromText
    };

})(window.wp);