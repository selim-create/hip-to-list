(function(wp) {
    const { createElement: el, useState, useEffect } = wp.element;
    const { Icon } = window.H2L.Common;
    const apiFetch = wp.apiFetch;

    window.H2L = window.H2L || {};
    window.H2L.Filters = window.H2L.Filters || {};

    // --- FİLTRE OLUŞTURMA MODALI ---
    const CreateFilterModal = ({ onClose, onSave, users }) => {
        const [title, setTitle] = useState('');
        const [query, setQuery] = useState({ assignee: '', priority: '', due: '' });

        const handleSave = () => {
            // Boş değerleri temizle
            const finalQuery = {};
            if(query.assignee) finalQuery.assignee = query.assignee;
            if(query.priority) finalQuery.priority = query.priority;
            if(query.due) finalQuery.due = query.due;

            if (!title || Object.keys(finalQuery).length === 0) return;
            onSave(title, finalQuery);
        };

        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal small', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, 'Yeni Filtre'), el(Icon, { name: 'xmark', onClick: onClose })),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-form-group' },
                        el('label', { className: 'h2l-label' }, 'Filtre Adı'),
                        el('input', { className: 'h2l-input', value: title, onChange: e => setTitle(e.target.value), autoFocus: true, placeholder: 'Örn: Bana Atanan P1 Görevler' })
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('label', { className: 'h2l-label' }, 'Sorgu Kriterleri'),
                        el('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                            el('select', { className: 'h2l-select', value: query.assignee, onChange: e => setQuery({...query, assignee: e.target.value}) },
                                el('option', { value: '' }, 'Kişi: Farketmez'),
                                el('option', { value: 'me' }, 'Bana Atanan'),
                                users.map(u => el('option', { key: u.id, value: u.id }, u.name))
                            ),
                            el('select', { className: 'h2l-select', value: query.priority, onChange: e => setQuery({...query, priority: e.target.value}) },
                                el('option', { value: '' }, 'Öncelik: Farketmez'),
                                el('option', { value: '1' }, 'P1 (Kritik)'),
                                el('option', { value: '2' }, 'P2 (Yüksek)'),
                                el('option', { value: '3' }, 'P3 (Orta)'),
                                el('option', { value: '4' }, 'P4 (Düşük)')
                            ),
                            el('select', { className: 'h2l-select', value: query.due, onChange: e => setQuery({...query, due: e.target.value}) },
                                el('option', { value: '' }, 'Tarih: Farketmez'),
                                el('option', { value: 'today' }, 'Bugün'),
                                el('option', { value: 'overdue' }, 'Geciken'),
                                el('option', { value: 'upcoming' }, 'Yaklaşan')
                            )
                        )
                    )
                ),
                el('div', { className: 'h2l-modal-footer' },
                    el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'),
                    el('button', { className: 'h2l-btn primary', onClick: handleSave, disabled: !title || (Object.values(query).every(x=>!x)) }, 'Oluştur')
                )
            )
        );
    };

    // --- ANA SAYFA BİLEŞENİ ---
    const FiltersLabelsView = ({ filters, labels, users, navigate, onAddFilter, onDeleteFilter }) => {
        const [expanded, setExpanded] = useState({ filters: true, labels: true });
        const [showModal, setShowModal] = useState(false);
        const toggle = (key) => setExpanded({ ...expanded, [key]: !expanded[key] });

        const handleSaveFilter = (title, query) => {
            onAddFilter(title, query);
            setShowModal(false);
        };

        return el('div', { className: 'h2l-filters-page' },
            el('div', { className: 'h2l-header-area h2l-filters-header' }, 
                el('h1', null, 'Filtreler & Etiketler')
            ),
            
            // Filtreler Bölümü
            el('div', { className: 'h2l-filter-section' },
                el('div', { className: 'h2l-filter-section-header', onClick: () => toggle('filters') },
                    el('div', { className: 'h2l-filter-toggle' },
                        el(Icon, { name: expanded.filters ? 'chevron-down' : 'chevron-right' }),
                        'Filtreler'
                    ),
                    el(Icon, { name: 'plus', className: 'h2l-filter-add-btn', onClick: (e) => { e.stopPropagation(); setShowModal(true); } })
                ),
                expanded.filters && el('div', { className: 'h2l-filter-list' },
                    (!filters || filters.length === 0) && el('p', {style:{color:'#999', padding:10, fontStyle:'italic', fontSize:13}}, 'Henüz filtre yok.'),
                    (filters || []).map(f => 
                        el('div', { key: f.id, className: 'h2l-filter-row', onClick: () => navigate(`/filtre/${f.id}`) },
                            el('div', { className: 'h2l-filter-left' },
                                el(Icon, { name: 'filter' }),
                                f.title
                            ),
                            el('div', { className: 'h2l-filter-actions', onClick: e => e.stopPropagation() },
                                el(Icon, { name: 'trash', style:{color:'#ccc', fontSize:12}, onClick: () => { if(confirm('Silinsin mi?')) onDeleteFilter(f.id); } })
                            )
                        )
                    )
                )
            ),

            // Etiketler Bölümü
            el('div', { className: 'h2l-filter-section' },
                el('div', { className: 'h2l-filter-section-header', onClick: () => toggle('labels') },
                    el('div', { className: 'h2l-filter-toggle' },
                        el(Icon, { name: expanded.labels ? 'chevron-down' : 'chevron-right' }),
                        'Etiketler'
                    ),
                    // Etiket ekleme şimdilik sadece görev üzerinden yapılıyor
                    // el(Icon, { name: 'plus', className: 'h2l-filter-add-btn' }) 
                ),
                expanded.labels && el('div', { className: 'h2l-filter-list' },
                    labels.length === 0 && el('p', {style:{color:'#999', padding:10, fontStyle:'italic', fontSize:13}}, 'Henüz etiket yok.'),
                    labels.map(l => 
                        el('div', { key: l.id, className: 'h2l-filter-row', onClick: () => navigate(`/etiket/${l.slug}`) },
                            el('div', { className: 'h2l-filter-left' },
                                el(Icon, { name: 'tag', style: { color: l.color || '#808080', transform: 'rotate(45deg)' } }), 
                                l.name
                            ),
                            el('span', { className: 'h2l-filter-count' }, '')
                        )
                    )
                )
            ),

            showModal && el(CreateFilterModal, { onClose: () => setShowModal(false), onSave: handleSaveFilter, users })
        );
    };

    window.H2L.Filters = { FiltersLabelsView };

})(window.wp);