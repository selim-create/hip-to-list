(function(wp) {
    const { createElement: el, useState, useEffect, useRef, Component } = wp.element;

    window.H2L = window.H2L || {};
    window.H2L.Common = window.H2L.Common || {};

    // --- CONSTANTS ---
    const PROJECT_COLORS = [
        { name: 'Gri', code: '#808080' }, { name: 'Kırmızı', code: '#db4c3f' }, { name: 'Turuncu', code: '#e67e22' }, 
        { name: 'Sarı', code: '#f1c40f' }, { name: 'Yeşil', code: '#27ae60' }, { name: 'Mavi', code: '#2980b9' }, 
        { name: 'Mor', code: '#8e44ad' }, { name: 'Pembe', code: '#e84393' }, { name: 'Menekşe', code: '#b8255f' }, 
        { name: 'Nane', code: '#6accbc' }, { name: 'Turkuaz', code: '#158fad' }, { name: 'Koyu Gri', code: '#2c3e50' }
    ];

    // --- ERROR BOUNDARY ---
    class ErrorBoundary extends Component {
        constructor(props) { super(props); this.state = { hasError: false }; }
        static getDerivedStateFromError(error) { return { hasError: true }; }
        componentDidCatch(error, errorInfo) { console.error("H2L Error:", error, errorInfo); }
        render() { return this.state.hasError ? el('div', {className:'h2l-error-box'}, 'Beklenmedik bir hata oluştu. Lütfen sayfayı yenileyiniz.') : this.props.children; }
    }

    // --- BASIC HELPERS ---
    const Icon = ({ name, className = "", style = {}, onClick, title }) => 
        el('i', { className: `fa-solid fa-${name} ${className}`, style: style, onClick, title });
    
    const Avatar = ({ userId, users, size = 24, style = {} }) => {
        if (!users || !Array.isArray(users)) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        const finalStyle = { width: size, height: size, minWidth: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', ...style };
        if (!user) return el('div', { className: 'h2l-avatar-ph', style: { ...finalStyle, background:'#eee' } });
        return el('img', { src: user.avatar, className: 'h2l-avatar', style: finalStyle, title: user.name });
    };

    const getFolderId = (p) => p.folderId || p.folder_id || 0;

    // --- MULTI SELECT ---
    const MultiSelect = ({ users, selected, onChange }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const wrapperRef = useRef(null);
        useEffect(() => {
            const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);
        const toggleSelection = (id) => onChange(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return el('div', { className: 'h2l-multi-select', ref: wrapperRef },
            el('div', { className: 'h2l-multi-trigger', onClick: () => setIsOpen(!isOpen) }, 
                el('span', { style: { color: selected.length ? '#333' : '#999' } }, selected.length > 0 ? `${selected.length} kişi` : 'Seç...'), el(Icon, { name: 'angle-down' })),
            isOpen && el('div', { className: 'h2l-multi-dropdown' },
                el('div', { className: 'h2l-multi-search' }, el('input', { type: 'text', placeholder: 'Ara...', value: searchTerm, onChange: e => setSearchTerm(e.target.value) })),
                el('div', { className: 'h2l-multi-list' },
                    filteredUsers.map(u => el('div', { key: u.id, className: `h2l-multi-item ${selected.includes(u.id)?'selected':''}`, onClick: () => toggleSelection(u.id) },
                        el(Avatar, { userId: u.id, users: users, size: 24 }), 
                        el('span', { style: { flex:1 } }, u.name), 
                        selected.includes(u.id) && el(Icon, { name: 'check', style: { color: '#db4c3f' } })))
                )
            )
        );
    };

    // EXPORT TO GLOBAL
    window.H2L.Common = {
        ErrorBoundary,
        Icon,
        Avatar,
        MultiSelect,
        getFolderId,
        PROJECT_COLORS
    };

})(window.wp);