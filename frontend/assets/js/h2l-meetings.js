(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const apiFetch = wp.apiFetch;
    const { Icon, Avatar } = window.H2L.Common;

    window.H2L = window.H2L || {};
    window.H2L.Meetings = window.H2L.Meetings || {};

    // --- DASHBOARD (YAPIM AŞAMASINDA) ---
    const MeetingsDashboard = ({ onStartNew, onSelectMeeting }) => {
        return el('div', { className: 'h2l-meeting-dashboard', style: { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' } },
            el('div', { style: { 
                width: '100px', height: '100px', background: '#ffeef6', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '25px',
                animation: 'pulse 2s infinite' 
            } },
                el(Icon, { name: 'wand-magic-sparkles', style: { fontSize: '48px', color: '#e84393' } })
            ),
            el('h1', { style: { fontSize: '28px', fontWeight: '700', color: '#202020', marginBottom: '15px' } }, 'Toplantı Asistanı Hazırlanıyor'),
            el('p', { style: { fontSize: '16px', color: '#666', maxWidth: '550px', lineHeight: '1.6', margin: '0 auto 30px' } }, 
                'Yapay zeka destekli toplantı notları, otomatik özetleme ve aksiyon maddesi oluşturma modülü şu anda geliştirme aşamasındadır.'
            ),
            el('div', { style: { display: 'flex', gap: '10px' } },
                el('span', { style: { background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#555', fontWeight: '500' } }, el(Icon, {name:'microphone'}), ' Canlı Transkript'),
                el('span', { style: { background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#555', fontWeight: '500' } }, el(Icon, {name:'bolt'}), ' Otomatik Aksiyonlar'),
                el('span', { style: { background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#555', fontWeight: '500' } }, el(Icon, {name:'language'}), ' Çoklu Dil')
            ),
            // Geliştirici Modu için gizli tetikleyici (İhtiyaç halinde açılabilir)
            /* el('button', { 
                className: 'h2l-btn', 
                style: { marginTop: '40px', opacity: 0.3 }, 
                onClick: onStartNew 
            }, 'Geliştirici Girişi') 
            */
        );
    };

    /* --- ARKA PLAN KODLARI (KORUNDU) ---
       Bu bileşenler veritabanında ve API'de hazır bekliyor. 
       Modül açılacağı zaman Dashboard'daki "Yapım Aşamasında" ekranı kaldırılarak 
       aşağıdaki orijinal Dashboard kodu aktif edilebilir.
    */

    // Orijinal Dashboard (Pasif)
    const MeetingsDashboard_Original = ({ onStartNew, onSelectMeeting }) => {
        const [meetings, setMeetings] = useState([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            apiFetch({ path: '/h2l/v1/meetings' })
                .then(res => { 
                    if (Array.isArray(res)) { setMeetings(res); } 
                    else { setMeetings([]); }
                    setLoading(false); 
                })
                .catch((err) => { setMeetings([]); setLoading(false); });
        }, []);

        if (loading) return el('div', { className: 'h2l-loading' }, 'Yükleniyor...');

        return el('div', { className: 'h2l-meeting-dashboard' },
            el('div', { className: 'h2l-meeting-header' },
                el('h1', null, 'Toplantı Asistanı'),
                el('button', { className: 'h2l-btn primary', onClick: onStartNew }, el(Icon, {name:'plus'}), ' Yeni Toplantı Başlat')
            ),
            meetings.length === 0 && el('div', { className: 'h2l-empty-state' }, 'Henüz kayıtlı toplantı yok.'),
            el('div', { className: 'h2l-meeting-list' },
                meetings.map(m => el('div', { key: m.id, className: 'h2l-meeting-card', onClick: () => onSelectMeeting(m) },
                    el('span', { className: `h2l-mc-status ${m.status}` }, m.status === 'active' ? 'Canlı' : 'Bitti'),
                    el('div', { className: 'h2l-mc-date' }, new Date(m.created_at).toLocaleDateString('tr-TR')),
                    el('div', { className: 'h2l-mc-title' }, m.title),
                    m.related_object_type && el('div', { className: 'h2l-mc-meta' }, el(Icon, {name:'link'}), m.related_object_type)
                ))
            )
        );
    };

    // --- START MODAL ---
    const StartMeetingModal = ({ onClose, onStart }) => {
        const [title, setTitle] = useState('');
        const [crmType, setCrmType] = useState('');
        
        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal small', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, 'Yeni Toplantı'), el(Icon, {name:'xmark', onClick: onClose})),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-form-group' },
                        el('label', { className: 'h2l-label' }, 'Toplantı Başlığı'),
                        el('input', { className: 'h2l-input', value: title, onChange: e => setTitle(e.target.value), autoFocus: true, placeholder: 'Örn: Haftalık Pazarlama Toplantısı' })
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('label', { className: 'h2l-label' }, 'İlişkili Kayıt Türü (Opsiyonel)'),
                        el('select', { className: 'h2l-select', value: crmType, onChange: e => setCrmType(e.target.value) },
                            el('option', {value:''}, 'Seçiniz...'),
                            el('option', {value:'kampanya'}, 'Kampanya'),
                            el('option', {value:'proje'}, 'Proje')
                        )
                    )
                ),
                el('div', { className: 'h2l-modal-footer' },
                    el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'),
                    el('button', { className: 'h2l-btn primary', onClick: () => onStart(title, crmType), disabled: !title.trim() }, 'Başlat')
                )
            )
        );
    };

    // --- LIVE VIEW ---
    const LiveMeetingView = ({ meeting, onFinish }) => {
        const [transcript, setTranscript] = useState('');
        const [isListening, setIsListening] = useState(true);
        const recognitionRef = useRef(null);
        const scrollRef = useRef(null);
        const startTimeRef = useRef(Date.now());

        useEffect(() => {
            if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
                if (typeof window !== 'undefined') alert('Tarayıcınız Web Speech API desteklemiyor (Chrome kullanın).');
                return;
            }

            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'tr-TR';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
            };

            recognition.onend = () => {
                if (isListening && recognitionRef.current) {
                    try { recognition.start(); } catch(e){}
                }
            };

            try { recognition.start(); } catch(e){}
            recognitionRef.current = recognition;

            return () => {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                    recognitionRef.current = null;
                }
            };
        }, [isListening]);

        useEffect(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, [transcript]);

        const handleFinish = () => {
            setIsListening(false);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onFinish(meeting.id, transcript, duration);
        };

        return el('div', { className: 'h2l-live-meeting' },
            el('div', { className: 'h2l-live-header' },
                el('div', null, 
                    el('h2', null, meeting.title),
                    el('small', {style:{color:'#888'}}, 'Yapay Zeka Dinliyor...')
                ),
                el('div', { className: 'h2l-live-status' },
                    el('div', { className: 'h2l-recording-dot' }),
                    el('span', {style:{color:'#cc0000', fontWeight:'bold'}}, 'CANLI KAYIT')
                )
            ),
            el('div', { className: 'h2l-transcript-area', ref: scrollRef },
                transcript || el('div', { className: 'h2l-transcript-placeholder' }, 'Konuşmaya başlayın, metin buraya akacak...')
            ),
            el('div', { className: 'h2l-live-controls' },
                el('button', { className: 'h2l-btn primary large', onClick: handleFinish }, el(Icon, {name:'stop'}), ' Toplantıyı Bitir ve Özetle')
            )
        );
    };

    // --- SUMMARY VIEW ---
    const SummaryView = ({ meeting, navigate, onAddTasks }) => {
        const [data, setData] = useState(null);
        const [selectedActions, setSelectedActions] = useState([]);

        useEffect(() => {
            apiFetch({ path: `/h2l/v1/meetings/${meeting.id}` })
                .then(res => setData(res))
                .catch(err => console.error("Summary Fetch Error:", err));
        }, [meeting.id]);

        if (!data) return el('div', { className: 'h2l-loading' }, 'Özet hazırlanıyor...');

        const actions = data.actions_json ? JSON.parse(data.actions_json) : [];
        const decisions = data.decisions_json ? JSON.parse(data.decisions_json) : [];

        const toggleAction = (idx) => {
            const newSel = [...selectedActions];
            if (newSel.includes(idx)) newSel.splice(newSel.indexOf(idx), 1);
            else newSel.push(idx);
            setSelectedActions(newSel);
        };

        const handleGenerateTasks = () => {
            const tasksToCreate = selectedActions.map(idx => actions[idx]);
            onAddTasks(tasksToCreate, data.id);
        };

        return el('div', { className: 'h2l-summary-view' },
            el('div', { className: 'h2l-header-area' },
                el('button', { className: 'h2l-btn', onClick: () => navigate('meetings'), style:{marginBottom:10} }, el(Icon, {name:'arrow-left'}), ' Listeye Dön'),
                el('h1', null, data.title)
            ),
            el('div', { className: 'h2l-summary-card' },
                el('h3', null, el(Icon, {name:'file-lines'}), ' Toplantı Özeti'),
                el('p', { style: { lineHeight: 1.6, color: '#555' } }, data.summary)
            ),
            el('div', { className: 'h2l-summary-grid' },
                el('div', { className: 'h2l-summary-card' },
                    el('h3', null, el(Icon, {name:'check-double'}), ' Alınan Kararlar'),
                    el('ul', { style: { paddingLeft: 20 } }, decisions.map((d, i) => el('li', { key: i, style:{marginBottom:5} }, d)))
                ),
                el('div', { className: 'h2l-summary-card' },
                    el('h3', null, el(Icon, {name:'bolt'}), ' Aksiyonlar (Görev Önerileri)'),
                    actions.length === 0 && el('p', null, 'Aksiyon bulunamadı.'),
                    actions.map((act, idx) => 
                        el('div', { 
                            key: idx, 
                            className: `h2l-action-item ${selectedActions.includes(idx) ? 'selected' : ''}`,
                            onClick: () => toggleAction(idx)
                        },
                            el('input', { type: 'checkbox', checked: selectedActions.includes(idx), onChange: () => {}, className: 'h2l-ai-check' }),
                            el('div', { className: 'h2l-ai-content' },
                                el('span', { className: 'h2l-ai-title' }, act.title),
                                el('div', { className: 'h2l-ai-meta' }, 
                                    act.assignee_hint && el('span', {style:{marginRight:10}}, el(Icon,{name:'user'}), ' ', act.assignee_hint),
                                    act.due_hint && el('span', null, el(Icon,{name:'calendar'}), ' ', act.due_hint)
                                )
                            )
                        )
                    )
                )
            ),
            selectedActions.length > 0 && el('button', { className: 'h2l-gen-tasks-btn', onClick: handleGenerateTasks },
                el(Icon, {name:'plus'}), 
                `${selectedActions.length} Görev Oluştur`
            )
        );
    };

    window.H2L.Meetings = {
        MeetingsDashboard,
        StartMeetingModal,
        LiveMeetingView,
        SummaryView
    };

})(window.wp);