/**
 * Hip to List - Popup Loader
 * SPA olmayan sayfalarda (Single Post vb.) görev modalını açmak için kullanılır.
 */

(function(wp, settings) {
    const { createElement: el, useState, useEffect, Fragment } = wp.element;
    const apiFetch = wp.apiFetch;
    const { TaskDetailModal } = window.H2L.TaskModal;
    const { ErrorBoundary } = window.H2L.Common;

    // API Middleware (Nonce ayarı)
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        return next(options);
    });

    // --- Mini React App: Modal Container ---
    const ModalContainer = () => {
        const [activeTaskId, setActiveTaskId] = useState(null);
        const [taskData, setTaskData] = useState(null);
        const [loading, setLoading] = useState(false);
        
        // Global Veriler (Projeler, Etiketler, Kullanıcılar)
        // İlk açılışta yüklenecek
        const [globalData, setGlobalData] = useState({ users: [], projects: [], sections: [], labels: [] });
        const [isGlobalDataLoaded, setIsGlobalDataLoaded] = useState(false);

        // Global Event Listener: .h2l-task-trigger tıklamalarını dinle
        useEffect(() => {
            const handleTriggerClick = (e) => {
                const trigger = e.target.closest('.h2l-task-trigger');
                if (trigger) {
                    e.preventDefault();
                    e.stopPropagation();
                    const taskId = trigger.getAttribute('data-task-id');
                    if (taskId) {
                        openTask(taskId);
                    }
                }
            };

            document.addEventListener('click', handleTriggerClick);
            return () => document.removeEventListener('click', handleTriggerClick);
        }, []);

        const loadGlobalData = async () => {
            if (isGlobalDataLoaded) return true;
            try {
                const res = await apiFetch({ path: '/h2l/v1/init' });
                setGlobalData(res);
                setIsGlobalDataLoaded(true);
                return true;
            } catch (err) {
                console.error("H2L Init Error:", err);
                alert('Veri yüklenemedi.');
                return false;
            }
        };

        const openTask = async (id) => {
            setLoading(true);
            setActiveTaskId(id); // Modalı loading state ile aç

            // 1. Önce global verileri yükle (Eğer yüklenmediyse)
            const initSuccess = await loadGlobalData();
            if (!initSuccess) {
                setLoading(false);
                setActiveTaskId(null);
                return;
            }

            // 2. Görev detayını çek (API listesinden bulmaya çalış, yoksa fetch et)
            // SPA'da tüm tasklar bellekteydi, burada tekil çekmek daha mantıklı ama
            // şimdilik API yapımız liste dönüyor. İlerde /tasks/{id} endpointi eklenebilir.
            // Mevcut /tasks endpointi filtre destekliyor.
            
            try {
                // Performans için sadece bu taskı çekmeye çalışalım (mevcut API destekliyorsa)
                // API henüz tekil task get desteklemiyor olabilir, listeyi filtreleyelim.
                // NOT: Eğer API'de tekil GET yoksa, init datasındaki 'tasks' içinde arayabiliriz.
                // Ancak init data sadece 'open' taskları döndürüyor olabilir.
                
                // Şimdilik init datasındaki task listesinde arayalım
                // Eğer orada yoksa (örn: tamamlanmış bir görev), özel bir istek gerekebilir.
                // Geçici çözüm: /h2l/v1/tasks endpointini kullanarak tüm taskları çekip filtrelemek yerine
                // Modal, task prop'u bekliyor.
                
                // İYİLEŞTİRME: Backend API'ye tekil task getirme eklenmeli.
                // Şimdilik init datasından bulmaya çalışıyoruz.
                
                // Geçici olarak 'init' endpointi tüm aktif görevleri döndürüyor. 
                // Eğer görev listede yoksa (örn: arşivlenmiş), modal hata verebilir.
                // Bu durumda basit bir mock obje ile açıp, detayları modal içinde refresh edebiliriz.
                
                // NOT: TaskDetailModal içinde zaten "loadComments" ve "loadSubtasks" var.
                // Ancak ana task verisi prop olarak gidiyor.
                
                // Hızlı çözüm: task listesinden bul.
                // (Global data yüklendiği için state'ten okuyabiliriz ama state update async olduğu için res üzerinden okuyoruz)
                // Yukarıdaki loadGlobalData promise döndürdüğü için globalData state'i henüz güncellenmemiş olabilir.
                // Bu yüzden tekrar fetch yapmayıp, loadGlobalData'nın return değerini kullanmak daha iyi olurdu ama
                // şimdilik basitçe init datasını tekrar çekiyoruz (cacheli olacağı için sorun değil).
                
                const res = await apiFetch({ path: '/h2l/v1/init' });
                const foundTask = res.tasks.find(t => parseInt(t.id) === parseInt(id));
                
                if (foundTask) {
                    setTaskData(foundTask);
                } else {
                    // Görev init listesinde yoksa (örn tamamlanmış ve listeden düşmüş)
                    // Basit bir obje oluşturup modalın açılmasını sağlıyoruz, 
                    // İdeal dünyada API'den tekil çekilmeli.
                    setTaskData({ 
                        id: id, 
                        title: 'Yükleniyor veya Bulunamadı...', 
                        project_id: 0, 
                        status: 'open', 
                        priority: 4 
                    });
                    
                    // Eğer tekil task endpoint'i yaparsak:
                    // const singleTask = await apiFetch({ path: `/h2l/v1/tasks/${id}` });
                    // setTaskData(singleTask);
                }
                
                setLoading(false);

            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        const closeTask = () => {
            setActiveTaskId(null);
            setTaskData(null);
        };

        // Modal Callbacks
        const handleUpdateTask = async (id, data) => {
            await apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'POST', data: data });
            // Optimistic update veya reload yapılabilir.
            // Basitlik için taskData'yı güncelliyoruz
            setTaskData(prev => ({ ...prev, ...data }));
            
            // Global listeyi de güncellemek iyi olur ama popup modunda kritik değil
        };

        const handleDeleteTask = async (id) => {
            if(confirm('Görevi silmek istediğinize emin misiniz?')) {
                await apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' });
                closeTask();
                // Sayfayı yenile veya ikonu gizle
                const trigger = document.querySelector(`.h2l-task-trigger[data-task-id="${id}"]`);
                if(trigger) trigger.style.display = 'none';
            }
        };

        const handleAddTask = async (data) => {
            // Alt görev ekleme vb için
            await apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data: data });
            // Modal içindeki subtask listesi kendi kendine güncelleniyor (useEffect ile)
        };

        // Render
        if (!activeTaskId) return null;

        return el(Fragment, null,
            loading && el('div', { className: 'h2l-overlay', style:{zIndex:99999} }, 
                el('div', { style:{color:'#fff'} }, 'Yükleniyor...')
            ),
            (!loading && taskData) && el(TaskDetailModal, {
                task: taskData,
                tasks: [], // Navigasyon için gerekli ama popup modunda boş olabilir
                onClose: closeTask,
                onUpdate: handleUpdateTask,
                onDelete: handleDeleteTask,
                onAdd: handleAddTask,
                users: globalData.users,
                projects: globalData.projects,
                sections: globalData.sections,
                labels: globalData.labels,
                navigate: (path) => { console.log("Navigate:", path); /* Popup modunda navigasyon devre dışı veya handle edilebilir */ }
            })
        );
    };

    // --- DOM Injection ---
    document.addEventListener('DOMContentLoaded', () => {
        // React Root için container oluştur
        let rootEl = document.getElementById('h2l-popup-root');
        if (!rootEl) {
            rootEl = document.createElement('div');
            rootEl.id = 'h2l-popup-root';
            document.body.appendChild(rootEl);
        }

        if (wp.element.createRoot) {
            wp.element.createRoot(rootEl).render(el(ErrorBoundary, null, el(ModalContainer)));
        } else {
            wp.element.render(el(ErrorBoundary, null, el(ModalContainer)), rootEl);
        }
    });

})(window.wp, window.h2lFrontendSettings);