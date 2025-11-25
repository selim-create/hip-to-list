<?php
/**
 * Hip to List - Ayarlar Sayfası
 * Bu dosya admin/h2l-admin.php tarafından dahil edilir.
 *
 * KAPSAM:
 * 1. Genel Ayarlar
 * 2. Bildirim Ayarları (E-posta Şablonları Dahil)
 * 3. Takvim & Entegrasyon
 * 4. Otomasyon
 * 5. Yetkiler & Roller
 * 6. Canlı Toplantı Asistanı
 * 7. Gelişmiş & Performans
 * 8. Veri & Raporlama (İçe/Dışa Aktarım Dahil)
 * 9. Geliştirici
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function h2l_render_settings_page() {
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'general';

    // --- AYARLARI KAYDETME ---
    if ( isset($_POST['h2l_save_settings']) ) {
        check_admin_referer('h2l_settings_nonce');
        
        // 1. Genel
        if(isset($_POST['h2l_default_view'])) update_option('h2l_default_view', sanitize_text_field($_POST['h2l_default_view']));
        if(isset($_POST['h2l_quick_add_lang'])) update_option('h2l_quick_add_lang', sanitize_text_field($_POST['h2l_quick_add_lang']));
        if(isset($_POST['h2l_archive_days'])) update_option('h2l_archive_days', intval($_POST['h2l_archive_days']));
        update_option('h2l_hide_completed', isset($_POST['h2l_hide_completed']) ? 1 : 0);
        
        // 2. Bildirimler
        update_option('h2l_notify_wp', isset($_POST['h2l_notify_wp']) ? 1 : 0);
        update_option('h2l_notify_email', isset($_POST['h2l_notify_email']) ? 1 : 0);
        if(isset($_POST['h2l_reminder_p1'])) update_option('h2l_reminder_p1', intval($_POST['h2l_reminder_p1']));
        
        // E-posta Şablonu
        if(isset($_POST['h2l_reminder_subject'])) update_option('h2l_reminder_subject', sanitize_text_field($_POST['h2l_reminder_subject']));
        if(isset($_POST['h2l_reminder_body'])) update_option('h2l_reminder_body', wp_kses_post($_POST['h2l_reminder_body']));
        if(isset($_POST['h2l_reminder_footer'])) update_option('h2l_reminder_footer', wp_kses_post($_POST['h2l_reminder_footer']));

        // 3. Entegrasyon
        update_option('h2l_ical_active', isset($_POST['h2l_ical_active']) ? 1 : 0);

        // 6. Toplantı Asistanı
        if(isset($_POST['h2l_meeting_active'])) update_option('h2l_meeting_active', isset($_POST['h2l_meeting_active']) ? 1 : 0);
        if(isset($_POST['h2l_openai_api_key'])) update_option('h2l_openai_api_key', sanitize_text_field($_POST['h2l_openai_api_key']));
        if(isset($_POST['h2l_meeting_model'])) update_option('h2l_meeting_model', sanitize_text_field($_POST['h2l_meeting_model']));
        if(isset($_POST['h2l_meeting_max_duration'])) update_option('h2l_meeting_max_duration', intval($_POST['h2l_meeting_max_duration']));

        h2l_show_admin_notice('Ayarlar başarıyla kaydedildi.');
    }

    // --- TEST E-POSTASI ---
    if ( isset($_POST['h2l_send_test_email']) ) {
        check_admin_referer('h2l_settings_nonce');
        $test_email = sanitize_email($_POST['h2l_test_email']);
        if ( is_email($test_email) && class_exists('H2L_Reminder') ) {
            $reminder = new H2L_Reminder();
            if ( $reminder->send_test_reminder($test_email) ) { h2l_show_admin_notice('Test e-postası gönderildi.'); } 
            else { h2l_show_admin_notice('E-posta gönderilemedi. SMTP ayarlarınızı kontrol edin.', 'error'); }
        }
    }

    // --- VARSAYILAN DEĞERLERİ GETİR ---
    $default_view = get_option('h2l_default_view', 'projects'); // Varsayılan güncellendi
    $quick_add_lang = get_option('h2l_quick_add_lang', 'tr');
    $archive_days = get_option('h2l_archive_days', 30);
    $hide_completed = get_option('h2l_hide_completed', 0);
    
    $notify_wp = get_option('h2l_notify_wp', 1);
    $notify_email = get_option('h2l_notify_email', 1);
    $reminder_p1 = get_option('h2l_reminder_p1', 24); // Saat

    $subject = get_option('h2l_reminder_subject', '🔔 Hatırlatma: {task_title}');
    $body_intro = get_option('h2l_reminder_body', "Merhaba {user_name},\n\nAşağıdaki görevin zamanı geldi:");
    $footer_text = get_option('h2l_reminder_footer', 'Bu e-posta Hip to List tarafından gönderilmiştir.');
    
    $ical_active = get_option('h2l_ical_active', 0);
    
    $meeting_active = get_option('h2l_meeting_active', 0);
    $api_key = get_option('h2l_openai_api_key', '');
    $meeting_model = get_option('h2l_meeting_model', 'gpt-4o-mini');
    $max_duration = get_option('h2l_meeting_max_duration', 60);

    ?>
    <div class="wrap">
        <h1>Hip to List Ayarları</h1>
        
        <h2 class="nav-tab-wrapper">
            <a href="?page=h2l-settings&tab=general" class="nav-tab <?php echo $active_tab == 'general' ? 'nav-tab-active' : ''; ?>">Genel</a>
            <a href="?page=h2l-settings&tab=notifications" class="nav-tab <?php echo $active_tab == 'notifications' ? 'nav-tab-active' : ''; ?>">Bildirimler & E-posta</a>
            <a href="?page=h2l-settings&tab=integrations" class="nav-tab <?php echo $active_tab == 'integrations' ? 'nav-tab-active' : ''; ?>">Takvim & Entegrasyon</a>
            <a href="?page=h2l-settings&tab=automation" class="nav-tab <?php echo $active_tab == 'automation' ? 'nav-tab-active' : ''; ?>">Otomasyon</a>
            <a href="?page=h2l-settings&tab=roles" class="nav-tab <?php echo $active_tab == 'roles' ? 'nav-tab-active' : ''; ?>">Yetkiler</a>
            <a href="?page=h2l-settings&tab=meeting" class="nav-tab <?php echo $active_tab == 'meeting' ? 'nav-tab-active' : ''; ?>">Toplantı Asistanı</a>
            <a href="?page=h2l-settings&tab=advanced" class="nav-tab <?php echo $active_tab == 'advanced' ? 'nav-tab-active' : ''; ?>">Gelişmiş</a>
            <a href="?page=h2l-settings&tab=data" class="nav-tab <?php echo $active_tab == 'data' ? 'nav-tab-active' : ''; ?>">Veri & Rapor</a>
            <a href="?page=h2l-settings&tab=developer" class="nav-tab <?php echo $active_tab == 'developer' ? 'nav-tab-active' : ''; ?>">Geliştirici</a>
        </h2>
        
        <form method="post" style="margin-top: 20px;">
            <input type="hidden" name="h2l_save_settings" value="1">
            <?php wp_nonce_field('h2l_settings_nonce'); ?>
            
            <!-- 1. GENEL AYARLAR -->
            <form method="post" style="margin-top: 20px;">
            <input type="hidden" name="h2l_save_settings" value="1">
            <?php wp_nonce_field('h2l_settings_nonce'); ?>
            
            <?php if ($active_tab == 'general'): ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Global Başlangıç Görünümü</th>
                        <td>
                            <select name="h2l_default_view">
                                <option value="projects" <?php selected($default_view, 'projects'); ?>>Projelerim (Varsayılan)</option>
                                <option value="inbox" <?php selected($default_view, 'inbox'); ?>>Gelen Kutusu</option>
                                <option value="today" <?php selected($default_view, 'today'); ?>>Bugün</option>
                                <option value="upcoming" <?php selected($default_view, 'upcoming'); ?>>Yaklaşan</option>
                            </select>
                            <p class="description">Yeni kullanıcılar veya özel tercih yapmamış kişiler için varsayılan açılış sayfası.</p>
                        </td>
                    </tr>
                        <th scope="row">Quick Add Dili</th>
                        <td>
                            <select name="h2l_quick_add_lang">
                                <option value="tr" <?php selected($quick_add_lang, 'tr'); ?>>Türkçe Öncelikli</option>
                                <option value="en" <?php selected($quick_add_lang, 'en'); ?>>İngilizce Öncelikli</option>
                            </select>
                            <p class="description">"Yarın 10:00" gibi ifadelerin ayrıştırılması için öncelikli dil.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Tamamlanan Görevler</th>
                        <td>
                            <label><input type="checkbox" name="h2l_hide_completed" value="1" <?php checked($hide_completed, 1); ?>> Listelerde varsayılan olarak gizle</label><br><br>
                            <input type="number" name="h2l_archive_days" value="<?php echo esc_attr($archive_days); ?>" class="small-text"> gün sonra otomatik arşivle (0 = kapalı)
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Listeleme Limitleri</th>
                        <td>
                            <label><input type="checkbox" disabled checked> Sonsuz Scroll (Varsayılan)</label>
                            <p class="description">Sayfalama yerine aşağı indikçe yükle.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Board Durum Eşlemesi</th>
                        <td>
                           <p class="description">Varsayılan Kanban kolonları: Başlanmadı (open), Devam Ediyor (in_progress), Tamamlandı (done).</p>
                        </td>
                    </tr>
                </table>

            <!-- 2. BİLDİRİMLER & E-POSTA -->
            <?php elseif ($active_tab == 'notifications'): ?>
                <h3>Bildirim Kanalları (Global)</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">Kanallar</th>
                        <td>
                            <label><input type="checkbox" name="h2l_notify_wp" value="1" <?php checked($notify_wp, 1); ?>> WordPress Admin Bar Bildirimleri</label><br>
                            <label><input type="checkbox" name="h2l_notify_email" value="1" <?php checked($notify_email, 1); ?>> E-posta Bildirimleri</label><br>
                            <label style="color:#999;"><input type="checkbox" disabled> Web Push (Yakında)</label>
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Olay Bazlı Bildirimler</th>
                        <td>
                             <label><input type="checkbox" checked disabled> Atama aldığımda bildirim gönder</label><br>
                             <label><input type="checkbox" checked disabled> Bana mention geldiğinde bildirim gönder</label><br>
                             <label><input type="checkbox" disabled> Görev tarihimde değişiklik olursa</label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Son Tarih Hatırlatıcıları</th>
                        <td>
                            P1 (Kritik) Görevler: Son tarihten <input type="number" name="h2l_reminder_p1" value="<?php echo esc_attr($reminder_p1); ?>" class="small-text"> saat önce hatırlat.
                            <p class="description">Diğer öncelikler için varsayılan ayarlar kullanılacaktır.</p>
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Geciken Görevler (Overdue)</th>
                        <td>
                            <label><input type="checkbox" disabled> Günlük özet e-postası</label>
                            <p class="description">Her sabah 09:00'da geciken görevleri listeler.</p>
                        </td>
                    </tr>
                </table>

                <hr>
                <h3>E-posta Şablonu Düzenleme</h3>
                <p class="description">Aşağıdaki değişkenleri kullanabilirsiniz: <code>{task_title}</code>, <code>{user_name}</code>, <code>{project_name}</code>, <code>{due_date}</code>, <code>{task_link}</code></p>
                <table class="form-table">
                    <tr>
                        <th scope="row">Konu (Subject)</th>
                        <td><input name="h2l_reminder_subject" type="text" value="<?php echo esc_attr($subject); ?>" class="regular-text" style="width:100%"></td>
                    </tr>
                    <tr>
                        <th scope="row">Gövde (Body)</th>
                        <td><?php wp_editor($body_intro, 'h2l_reminder_body', array('textarea_rows'=>6, 'media_buttons'=>false, 'teeny'=>true)); ?></td>
                    </tr>
                    <tr>
                        <th scope="row">Footer</th>
                        <td><?php wp_editor($footer_text, 'h2l_reminder_footer', array('textarea_rows'=>3, 'media_buttons'=>false, 'teeny'=>true)); ?></td>
                    </tr>
                </table>
                
                <div class="card" style="margin-top:20px; padding:15px; background:#f9f9f9; border-left:4px solid #2271b1;">
                    <h4>Test Gönderimi</h4>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input name="h2l_test_email" type="email" value="<?php echo esc_attr(wp_get_current_user()->user_email); ?>" class="regular-text" placeholder="Alıcı E-posta">
                        <button type="submit" name="h2l_send_test_email" value="1" class="button button-secondary">Test Maili Gönder</button>
                    </div>
                </div>

         <?php elseif ($active_tab == 'integrations'): ?>
            <!-- 3. TAKVİM & ENTEGRASYON -->
             <h3>Takvim Entegrasyonu</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">iCal Feed</th>
                        <td>
                            <label><input type="checkbox" name="h2l_ical_active" value="1" <?php checked($ical_active, 1); ?>> Aktif Et</label>
                            <p class="description">Bu linki Google Calendar veya Outlook'a ekleyerek görevlerinizi takviminizde görün.</p>
                            <?php if($ical_active): 
                                // Kalıcı Token Kullanımı
                                $user_id = get_current_user_id();
                                $token = '';
                                if (class_exists('H2L_iCal')) {
                                    $token = H2L_iCal::get_user_token($user_id);
                                }
                                $feed_url = site_url('?h2l_ical=feed&token=' . $token);
                            ?>
                                <div style="margin-top:10px; background:#fff; padding:10px; border:1px solid #ddd;">
                                    <strong>Besleme URL'niz:</strong><br>
                                    <code><?php echo esc_url($feed_url); ?></code>
                                </div>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Google Calendar (2-Yönlü)</th>
                        <td>
                            <button class="button" disabled>Google Hesabını Bağla</button> <span class="badge">Yakında</span>
                            <p class="description">Çift yönlü senkronizasyon çok yakında.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Diğer Entegrasyonlar</th>
                        <td>
                            <label style="color:#999;"><input type="checkbox" disabled> Slack Entegrasyonu</label><br>
                            <label style="color:#999;"><input type="checkbox" disabled> Microsoft Teams</label><br>
                            <label style="color:#999;"><input type="checkbox" disabled> Telegram / Whatsapp</label>
                        </td>
                    </tr>
                </table>

            <!-- 4. OTOMASYON -->
            <?php elseif ($active_tab == 'automation'): ?>
                <h3>Otomasyon Kuralları</h3>
                <div class="notice notice-info inline"><p>Gelişmiş kural oluşturucu v1.2 sürümünde eklenecektir.</p></div>
                <table class="form-table">
                    <tr>
                        <th scope="row">Basit Kurallar</th>
                        <td>
                            <label><input type="checkbox" disabled> Aktif Et</label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Örnek Senaryolar</th>
                        <td>
                            <div style="background:#fff; border:1px solid #ddd; padding:10px; color:#555;">
                                <ul>
                                    <li><code>Etiket = [Muhasebe]</code> İSE <code>Atanan = [Muhasebe Ekibi]</code></li>
                                    <li><code>Son Tarih Geçti</code> İSE <code>Etiketle = [Geciken]</code></li>
                                    <li><code>Proje = [Satış]</code> VE <code>Durum = [Tamamlandı]</code> İSE <code>E-posta Gönder = [Yönetici]</code></li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Otomatik Arşiv</th>
                        <td>
                             Tamamlandıktan <strong><?php echo $archive_days; ?></strong> gün sonra arşivle. (Genel ayarlardan değiştirilebilir)
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Çalışma Modu</th>
                        <td>
                            <select disabled>
                                <option>Anında (Request bazlı)</option>
                                <option>Arka Plan (Cron Job)</option>
                            </select>
                        </td>
                    </tr>
                </table>

            <!-- 5. YETKİLER & ROLLER -->
            <?php elseif ($active_tab == 'roles'): ?>
                <h3>Kullanıcı İzinleri & Rol Matrisi</h3>
                <p class="description">Varsayılan WordPress rollerine göre Hip to List yetenekleri aşağıdadır.</p>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Yetenek (Capability)</th>
                            <th>Administrator</th>
                            <th>Editor</th>
                            <th>Author</th>
                            <th>Subscriber</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Görev Oluşturma</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td></tr>
                        <tr><td>Başkasına Atama</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Proje Yönetimi</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Toplantı Asistanı</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                        <tr><td>Ayar Değişikliği</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
                    </tbody>
                </table>
                <br>
                <h3>Varsayılan Paylaşım Kuralları</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">Yeni Proje Erişimi</th>
                        <td>
                            <select disabled>
                                <option>Özel (Sadece Ben)</option>
                                <option>Klasöre Göre Devral</option>
                            </select>
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Kullanıcı Daveti</th>
                        <td>
                             <label><input type="checkbox" checked disabled> Kullanıcı kendi projelerine başkalarını davet edebilir</label>
                        </td>
                    </tr>
                </table>

            <!-- 6. TOPLANTI ASİSTANI -->
            <?php elseif ($active_tab == 'meeting'): ?>
                <h3>Canlı Toplantı Asistanı Ayarları</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">Modül Durumu</th>
                        <td><label><input type="checkbox" name="h2l_meeting_active" value="1" <?php checked($meeting_active, 1); ?>> Modülü Aktif Et</label></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="h2l_openai_api_key">OpenAI API Anahtarı</label></th>
                        <td>
                            <input name="h2l_openai_api_key" type="password" value="<?php echo esc_attr($api_key); ?>" class="regular-text" style="width:100%">
                            <p class="description">API anahtarınızı <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a> üzerinden alabilirsiniz.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Model Seçimi</th>
                        <td>
                            <select name="h2l_meeting_model">
                                <option value="gpt-4o-mini" <?php selected($meeting_model, 'gpt-4o-mini'); ?>>GPT-4o Mini (Hızlı & Ucuz)</option>
                                <option value="gpt-4-turbo" <?php selected($meeting_model, 'gpt-4-turbo'); ?>>GPT-4 Turbo (Daha Akıllı)</option>
                                <option value="whisper-1" disabled>Whisper v3 (Ses Analizi - Yakında)</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Maks. Süre / Limit</th>
                        <td>
                            <input name="h2l_meeting_max_duration" type="number" value="<?php echo esc_attr($max_duration); ?>" class="small-text"> dakika
                            <p class="description">Sunucu kaynaklarını korumak için tek seferlik maksimum kayıt süresi.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Çıktı Dili</th>
                        <td>
                            <select disabled>
                                <option selected>Türkçe</option>
                                <option>İngilizce</option>
                            </select>
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Görev Üretim</th>
                        <td>
                             <label><input type="radio" name="meeting_task_mode" checked disabled> Aksiyonları sadece listele</label><br>
                             <label><input type="radio" name="meeting_task_mode" disabled> Otomatik görev önerisi ekranını aç</label>
                        </td>
                    </tr>
                </table>

            <!-- 7. GELİŞMİŞ -->
            <?php elseif ($active_tab == 'advanced'): ?>
                <h3>Gelişmiş & Performans</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">Sorgu Limitleri</th>
                        <td>
                            Maksimum <input type="number" disabled value="100" class="small-text"> görev/istek
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Scope Sınırı</th>
                        <td>
                            Varsayılan Today / Upcoming scope sınırı: <input type="number" disabled value="90" class="small-text"> gün
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Önbellek (Cache)</th>
                        <td>
                            <button class="button" disabled>Önbelleği Temizle</button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Rate Limit</th>
                        <td>
                            Kullanıcı başına dakikada <input type="number" disabled value="30" class="small-text"> istek (Quick Add)
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Log & Debug</th>
                        <td>
                            <select disabled>
                                <option>Kapalı</option>
                                <option>Sadece Hatalar</option>
                                <option>Hata + Uyarı</option>
                                <option>Tümü (Debug)</option>
                            </select>
                        </td>
                    </tr>
                </table>

            <!-- 8. VERİ & RAPORLAMA -->
            <?php elseif ($active_tab == 'data'): ?>
                <h3>Veri Saklama & Raporlama</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">Veri Saklama Politikası</th>
                        <td>
                            Aktivite loglarını <input type="number" disabled value="90" class="small-text"> gün sakla.<br>
                            Tamamlanmış görev verisini: <select disabled><option>Süresiz tut</option><option>Anonimleştir</option></select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Raporlama Modu</th>
                        <td>
                            İstatistik hesaplama periyodu: <select disabled><option>Günlük</option><option>Haftalık</option></select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Dışa Aktarım (Export)</th>
                        <td>
                            <button class="button" disabled>Tüm Görevleri CSV İndir</button>
                            <p class="description">Alan seçimi ve filtreleme v1.2 ile gelecektir.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">İçe Aktarım (Import)</th>
                        <td>
                            <div style="border: 2px dashed #ccc; padding: 20px; text-align: center; color: #999;">
                                CSV Dosyasını Buraya Sürükleyin<br>(Yakında)
                            </div>
                        </td>
                    </tr>
                </table>

            <!-- 9. GELİŞTİRİCİ -->
            <?php elseif ($active_tab == 'developer'): ?>
                <h3>Geliştirici Araçları</h3>
                <table class="form-table">
                    <tr>
                        <th scope="row">Webhook URL</th>
                        <td>
                            <input type="url" disabled placeholder="https://..." class="regular-text">
                            <p class="description">Görev tamamlandığında bu URL'e POST isteği gönder.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">REST API Durumu</th>
                        <td>
                            <span style="color:green;">● Aktif</span><br>
                            <code>GET /wp-json/h2l/v1/tasks</code>
                        </td>
                    </tr>
                     <tr>
                        <th scope="row">Hook Listesi</th>
                        <td>
                            <code>h2l_task_created</code>, <code>h2l_task_completed</code>, <code>h2l_task_updated</code>
                        </td>
                    </tr>
                </table>
            <?php endif; ?>
            
            <p class="submit" style="padding-top: 20px; border-top: 1px solid #eee;">
                <input type="submit" class="button button-primary" value="Değişiklikleri Kaydet">
            </p>
        </form>
    </div>
    <?php
}
?>