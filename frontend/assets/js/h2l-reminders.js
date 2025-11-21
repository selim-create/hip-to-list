(function(wp) {
    const { createElement: el } = wp.element;
    window.H2L = window.H2L || {};
    window.H2L.Reminders = window.H2L.Reminders || {};

    // --- HELPERS ---
    const getPriorityColor = (p) => {
        switch(parseInt(p)) {
            case 1: return '#d1453b';
            case 2: return '#eb8909';
            case 3: return '#246fe0';
            default: return '#808080';
        }
    };

    // --- PARSERS ---
    const cleanTaskTitle = (text) => {
        let clean = text || "";
        clean = clean.replace(/(?:^|\s)p[1-4](?:$|\s)/gi, ' ');
        return clean.replace(/\s+/g, ' ').trim();
    };

    const renderRichText = (text, mode = 'display') => {
        if (!text) return null;
        
        const regex = /((?:^|\s)(?:p[1-4]|bugün|yarın|today|tomorrow|@\w+)(?=$|\s)|\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/gi;
        
        return text.split(regex).map((part, index) => {
            if (!part) return null;
            
            // Chips
            if (part.match(/^(?:^|\s)(?:p[1-4]|bugün|yarın|today|tomorrow|@\w+)$/i)) {
                return el('span', { key: index, className: 'h2l-highlight-tag' }, part);
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

    window.H2L.Reminders = {
        getPriorityColor,
        cleanTaskTitle,
        renderRichText
    };

})(window.wp);