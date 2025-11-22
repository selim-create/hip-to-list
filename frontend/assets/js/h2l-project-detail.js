(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const { Icon, Avatar } = window.H2L.Common;
    const { ListView, BoardView, TaskDetailModal } = window.H2L.Tasks;

    window.H2L = window.H2L || {};

    window.H2L.ProjectDetail = ({ project, folders, tasks, sections, users, navigate, onAddTask, onDeleteTask, onUpdateTask, onAddSection, onAction, onUpdateSection, onDeleteSection }) => {
        const [viewMode, setViewMode] = useState(project ? (project.view_type || 'list') : 'list');
        const [selectedTask, setSelectedTask] = useState(null);
        const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
        const [showCompleted, setShowCompleted] = useState(true);
        const [highlightToday, setHighlightToday] = useState(false);
        const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
        const viewMenuRef = useRef(null);
        const moreMenuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => { 
                if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) setIsViewMenuOpen(false);
                if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setIsMoreMenuOpen(false);
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [viewMenuRef, moreMenuRef]);

        if (!project) return el('div', null, 'Yükleniyor...');
        const folderId = parseInt(project.folderId || project.folder_id || 0);
        const folder = folders ? folders.find(f => parseInt(f.id) === folderId) : null;
        const folderName = folder ? folder.name : 'Projelerim';
        const managers = (project.managers || []).map(uid => users.find(u => parseInt(u.id) === parseInt(uid))).filter(Boolean);

        return el('div', { className: 'h2l-project-page' },
            el('div', { className: 'h2l-project-header-wrapper' },
                el('div', { className: 'h2l-detail-header' },
                    el('div', { className: 'h2l-header-top' },
                        el('div', { className: 'h2l-breadcrumb' },
                            el('span', { className: 'link', onClick: () => navigate('') }, folderName), el('span', { className: 'divider' }, '/'), el('span', null, project.title)
                        ),
                        el('div', { className: 'h2l-header-actions' },
                            managers.length > 0 && el('div', { className: 'h2l-avatars-stack' }, managers.map((u, i) => el(Avatar, { key: u.id, userId: u.id, users, size: 26, style:{marginLeft: i===0?0:-8} }))),
                            el('button', { className: 'h2l-action-btn', title: 'Üye Ekle' }, el(Icon, { name: 'user-plus' }), 'Paylaş'),
                            el('div', { style: { position: 'relative' }, ref: viewMenuRef },
                                el('button', { className: 'h2l-action-btn', onClick: () => setIsViewMenuOpen(!isViewMenuOpen) }, el(Icon, { name: 'sliders' }), 'Görünüm'),
                                isViewMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' },
                                    el('div', { className: 'h2l-menu-section' }, el('span', { className: 'h2l-menu-title' }, 'DÜZEN'), el('div', { className: 'h2l-view-selector' }, el('div', { className: `h2l-view-btn ${viewMode==='list'?'active':''}`, onClick: () => setViewMode('list') }, el(Icon, { name: 'list' }), ' Liste'), el('div', { className: `h2l-view-btn ${viewMode==='board'?'active':''}`, onClick: () => setViewMode('board') }, el(Icon, { name: 'table-columns' }), ' Pano'))),
                                    el('div', { className: 'h2l-menu-section' }, el('div', { className: 'h2l-switch-item', onClick:()=>setShowCompleted(!showCompleted) }, el('span', null, 'Tamamlanan görevler'), el('div', { className: `h2l-toggle-switch ${showCompleted?'on':''}` }, el('div', {className:'knob'}))))
                                )
                            ),
                            el('div', { style: { position: 'relative' }, ref: moreMenuRef },
                                el('button', { className: 'h2l-action-btn', title: 'Diğer', onClick: () => setIsMoreMenuOpen(!isMoreMenuOpen) }, el(Icon, { name: 'ellipsis' })),
                                isMoreMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' },
                                    el('div', { className: 'h2l-menu-item', onClick: () => { if(onAction) onAction('edit_project', project); setIsMoreMenuOpen(false); } }, el(Icon, { name: 'pen' }), ' Projeyi düzenle'),
                                    el('div', { className: 'h2l-menu-item' }, el(Icon, { name: 'box-archive' }), ' Projeyi arşivle'),
                                    el('div', { className: 'h2l-menu-item text-danger', onClick: () => { if(onAction) onAction('delete_project', project.id); setIsMoreMenuOpen(false); } }, el(Icon, { name: 'trash' }), ' Projeyi sil')
                                )
                            )
                        )
                    )
                )
            ),
            el('div', { className: 'h2l-project-content-wrapper' },
                viewMode === 'list' 
                    ? el(ListView, { project, tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask: (opts) => onAddTask({ projectId: project.id, ...opts }), onAddSection: (data) => onAddSection({ projectId: project.id, ...data }), onTaskClick: setSelectedTask, showCompleted, highlightToday, onUpdateSection, onDeleteSection })
                    : el(BoardView, { tasks, sections, onUpdateTask })
            ),
            selectedTask && el(TaskDetailModal, { task: selectedTask, onClose: () => setSelectedTask(null), onUpdate: (id, d) => { onUpdateTask(id, d); setSelectedTask(prev => ({...prev, ...d})); }, users, projects: [project], sections })
        );
    };

})(window.wp);