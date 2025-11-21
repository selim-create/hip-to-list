(function(wp, settings) {
    const { createElement: el, useState, useEffect } = wp.element;
    const apiFetch = wp.apiFetch;
    
    // IMPORT COMPONENTS FROM GLOBAL NAMESPACE
    const { ErrorBoundary, Icon } = window.H2L.Common;
    const { Sidebar } = window.H2L;
    const { ProjectsDashboard, ProjectModal, FolderModal } = window.H2L.Projects;
    const { ProjectDetail } = window.H2L;

    const BASE_URL = settings.base_url || '/gorevler';

    // --- API CONFIG ---
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        return next(options);
    });

    // --- APP (ANA BİLEŞEN) ---
    const App = () => {
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [] });
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null);

        const loadData = () => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => { setData(res); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        };

        useEffect(() => { loadData(); }, []);

        const navigate = (path) => {
            window.history.pushState({}, '', BASE_URL + path);
            if(path === '' || path === '/') setViewState({ type: 'projects' });
            else if(path.includes('/proje/')) setViewState({ type: 'project_detail', id: parseInt(path.split('/proje/')[1]) });
        };
        
        useEffect(() => {
            const path = window.location.pathname;
            if(path.includes('/proje/')) {
                const pid = parseInt(path.split('/proje/')[1]);
                if(!isNaN(pid)) setViewState({ type: 'project_detail', id: pid });
            }
        }, []);

        const handleAction = (act, item) => { 
            if(act === 'add_project' || act === 'edit_project') setModal({ type: 'project', data: item });
            if(act === 'add_folder' || act === 'edit_folder') setModal({ type: 'folder', data: item });
        };

        const handleSaveProject = (f) => apiFetch({ path: '/h2l/v1/projects'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteProject = (id) => apiFetch({ path: `/h2l/v1/projects/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); navigate(''); });
        const handleSaveFolder = (f) => apiFetch({ path: '/h2l/v1/folders'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteFolder = (id) => apiFetch({ path: `/h2l/v1/folders/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); });
        
        const handleAddTask = (d) => apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data: d }).then(loadData);
        const handleUpdateTask = (id, d) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'POST', data: d }).then(res => { loadData(); });
        const handleDeleteTask = (id) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' }).then(() => { loadData(); });
        
        // YENİ: Bölüm Ekleme (Crash Önleyici)
        const handleAddSection = (d) => {
            apiFetch({ path: '/h2l/v1/sections', method: 'POST', data: d })
                .then(newSection => {
                    if (!newSection || typeof newSection !== 'object') return;
                    setData(prev => ({
                        ...prev,
                        sections: [...prev.sections, newSection]
                    }));
                })
                .catch(err => console.error("Bölüm eklenemedi:", err));
        };

        // YENİ: Bölüm Güncelleme ve Silme
        const handleUpdateSection = (id, data) => {
            apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'POST', data: data }).then(loadData);
        };

        const handleDeleteSection = (id) => {
            apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'DELETE' }).then(loadData);
        };
        
        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

        const activeProject = data.projects.find(p => parseInt(p.id) === viewState.id);
        const activeTasks = data.tasks.filter(t => {
            const pid = parseInt(t.projectId || t.project_id);
            return pid === viewState.id && t.status !== 'trash';
        });
        const activeSections = data.sections.filter(s => {
            const pid = parseInt(s.projectId || s.project_id);
            return pid === viewState.id;
        });

        return el('div', { id: 'h2l-app-container', className: 'h2l-flex-root' },
            el(Sidebar, { navigate }),
            
            el('div', { className: 'h2l-main-wrapper' },
                viewState.type === 'projects' 
                    ? el(ProjectsDashboard, { data, navigate, onAction: handleAction }) 
                    : el(ProjectDetail, { 
                        project: activeProject, 
                        folders: data.folders, // project-detail içinde folders lazım olabilir
                        tasks: activeTasks,
                        sections: activeSections,
                        users: data.users,
                        navigate, 
                        onAddTask: handleAddTask, 
                        onUpdateTask: handleUpdateTask, 
                        onDeleteTask: handleDeleteTask,
                        onAddSection: handleAddSection,
                        onUpdateSection: handleUpdateSection,
                        onDeleteSection: handleDeleteSection,
                        onAction: handleAction // Proje detay sayfasında edit/delete actionları için
                    })
            ),

            modal?.type === 'project' && el(ProjectModal, { onClose:()=>setModal(null), onSave:handleSaveProject, onDelete:handleDeleteProject, folders:data.folders, users:data.users, initialData:modal.data }),
            modal?.type === 'folder' && el(FolderModal, { onClose:()=>setModal(null), onSave:handleSaveFolder, onDelete:handleDeleteFolder, initialData:modal.data })
        );
    };

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('h2l-frontend-app');
        if (root && wp.element) {
            if(wp.element.createRoot) wp.element.createRoot(root).render(el(ErrorBoundary, null, el(App)));
            else wp.element.render(el(ErrorBoundary, null, el(App)), root);
        }
    });
})(window.wp, window.h2lFrontendSettings);