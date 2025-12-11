<?php
/**
 * Eklenti genelindeki Action ve Filter tanımları.
 * GÜNCELLEME: 404 hatalarını önlemek için Rewrite kuralları genişletildi.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// 1. URL YENİDEN YAZMA
add_action( 'init', 'h2l_add_rewrite_rules' );

function h2l_add_rewrite_rules() {
    // Dinamik ID içeren rotalar
    add_rewrite_rule('^gorevler/proje/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/gorev/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/klasor/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/etiket/([^/]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^' . $slug . '/profil/?', 'index.php?pagename=' . $slug, 'top');
    // YENİ EKLENEN ROTALAR (404 Çözümü İçin)
    add_rewrite_rule('^gorevler/inbox/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/bugun/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/yaklasan/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/filtreler-etiketler/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/toplantilar/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/filtre/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
}

// 2. ÖZEL CRON ARALIĞI
add_filter( 'cron_schedules', 'h2l_add_cron_intervals' );

function h2l_add_cron_intervals( $schedules ) {
    $schedules['every_minute'] = array(
        'interval' => 60,
        'display'  => __( 'Her Dakika', 'h2l' )
    );
    return $schedules;
}

// 3. CRON ZAMANLAMA (INIT)
add_action( 'init', 'h2l_schedule_cron_jobs' );

function h2l_schedule_cron_jobs() {
    if ( ! wp_next_scheduled( 'h2l_reminder_check_event' ) ) {
        wp_schedule_event( time(), 'every_minute', 'h2l_reminder_check_event' );
    }
}

// 4. TETİKLEYİCİ
add_action( 'h2l_reminder_check_event', 'h2l_trigger_reminders' );

function h2l_trigger_reminders() {
    if ( class_exists( 'H2L_Reminder' ) ) {
        $reminder = new H2L_Reminder();
        $reminder->process_queue();
    }
}
// 5. iCAL FEED LISTENER (v1.1)
add_action( 'init', 'h2l_listen_for_ical' );

function h2l_listen_for_ical() {
    if ( isset( $_GET['h2l_ical'] ) && $_GET['h2l_ical'] === 'feed' && isset( $_GET['token'] ) ) {
        if ( class_exists( 'H2L_iCal' ) ) {
            $ical = new H2L_iCal();
            $ical->generate_feed( sanitize_text_field( $_GET['token'] ) );
        }
        exit;
    }
}
// Temizlik
register_deactivation_hook( H2L_PATH . 'hip-to-list.php', 'h2l_clear_cron_jobs' );

function h2l_clear_cron_jobs() {
    wp_clear_scheduled_hook( 'h2l_reminder_check_event' );
}

/**
 * SAYFADA GÖSTERİLEN POSTLARIN ID'LERİNİ TOPLA
 * Archive sayfaları, custom query'ler ve tablo görünümleri için gereklidir.
 */
global $h2l_displayed_post_ids;
$h2l_displayed_post_ids = array();

add_action( 'the_post', 'h2l_collect_post_ids' );
function h2l_collect_post_ids( $post ) {
    global $h2l_displayed_post_ids;
    if ( isset( $post->ID ) ) {
        $h2l_displayed_post_ids[] = $post->ID;
    }
}

/**
 * Yazı başlıklarına ilişkili görev ikonu ekle (Durum Bazlı Özelleştirilmiş + CSS Tooltip)
 */
add_action('wp_footer', 'h2l_inject_task_icon_script');

function h2l_inject_task_icon_script() {
    // Admin, Feed veya API isteklerinde çalışma
    if ( is_admin() || is_feed() || defined('REST_REQUEST') || ! is_user_logged_in() ) {
        return;
    }

    global $wp_query, $h2l_displayed_post_ids, $wpdb;
    $user_id = get_current_user_id();
    
    // Sayfadaki post ID'lerini topla
    $posts_to_check = $h2l_displayed_post_ids;
    if ( is_singular() ) {
        $posts_to_check[] = get_the_ID();
    } elseif ( !empty( $wp_query->posts ) ) {
        foreach ( $wp_query->posts as $p ) { 
            if ( isset( $p->ID ) ) $posts_to_check[] = $p->ID; 
        }
    }
    $posts_to_check = array_unique( array_filter( $posts_to_check ) );

    if ( empty( $posts_to_check ) ) return;

    $ids_placeholder = implode(',', array_fill(0, count($posts_to_check), '%d'));
    $uid_str = '"' . $user_id . '"';
    
    // Görevleri Çek (En yeniden eskiye doğru)
    // YETKİ KONTROLÜ: Sadece kullanıcının yetkili olduğu projelerin görevlerini göster
    $sql = "SELECT t.id, t.status, t.title, t.priority, t.related_object_id 
            FROM {$wpdb->prefix}h2l_tasks t
            LEFT JOIN {$wpdb->prefix}h2l_projects p ON t.project_id = p.id
            WHERE t.related_object_id IN ($ids_placeholder) 
            AND t.status != 'trash'
            AND (
                p.id IS NULL OR 
                p.owner_id = %d OR 
                p.managers LIKE %s
            )
            ORDER BY t.created_at DESC";

    $tasks = $wpdb->get_results($wpdb->prepare($sql, array_merge($posts_to_check, [$user_id, '%' . $wpdb->esc_like($uid_str) . '%'])));
    
    if ( empty($tasks) ) return;

    // --- DURUM AYARLARI (İkon ve Renk Haritası) ---
    $status_config = [
        'not_started'      => ['icon' => 'fa-circle',           'color' => '#808080', 'bg' => '#f0f0f0', 'label' => 'Başlamadı'],
        'in_progress'      => ['icon' => 'fa-play',             'color' => '#3b82f6', 'bg' => '#dbeafe', 'label' => 'Devam Ediyor'],
        'on_hold'          => ['icon' => 'fa-pause',            'color' => '#e67e22', 'bg' => '#fff4e6', 'label' => 'Beklemede'],
        'in_review'        => ['icon' => 'fa-glasses',          'color' => '#8e44ad', 'bg' => '#f3e5f5', 'label' => 'Revizyonda'],
        'pending_approval' => ['icon' => 'fa-clock',            'color' => '#f1c40f', 'bg' => '#fef9e7', 'label' => 'Onay Bekliyor'],
        'cancelled'        => ['icon' => 'fa-ban',              'color' => '#c0392b', 'bg' => '#fadbd8', 'label' => 'İptal'],
        'completed'        => ['icon' => 'fa-check',            'color' => '#10b981', 'bg' => '#d1fae5', 'label' => 'Tamamlandı'],
        'default'          => ['icon' => 'fa-clipboard-check',  'color' => '#3b82f6', 'bg' => '#dbeafe', 'label' => 'Görev']
    ];

    // Görevleri Post ID'ye göre grupla
    $grouped_tasks = [];
    foreach ($tasks as $t) {
        $grouped_tasks[$t->related_object_id][] = $t;
    }

    $tasks_map = [];
    foreach ($grouped_tasks as $post_id => $post_tasks) {
        $count = count($post_tasks);
        
        // İkon Durumunu Belirle
        // Eğer tek görev varsa onun ikonunu kullan, çoksa genel ikon kullan
        if ($count === 1) {
            $first_task = $post_tasks[0];
            $status = $first_task->status;
            $conf = isset($status_config[$status]) ? $status_config[$status] : $status_config['default'];
            
            // P1 (Acil) ise ve tamamlanmamışsa kırmızı yap
            if ($first_task->priority == 1 && $status !== 'completed' && $status !== 'cancelled') {
                $conf['color'] = '#d1453b';
                $conf['bg'] = '#ffebe9';
            }
            
            $icon_class = $conf['icon'];
            $color = $conf['color'];
            $bg_color = $conf['bg'];
            $main_task_id = $first_task->id;
        } else {
            // Çoklu görev varsa
            $all_completed = true;
            $has_high_priority = false;
            $main_task_id = $post_tasks[0]->id; // En yeniye gitsin
            
            foreach($post_tasks as $pt) {
                if ($pt->status !== 'completed' && $pt->status !== 'cancelled') {
                    $all_completed = false;
                    if ($pt->priority == 1) $has_high_priority = true;
                }
            }
            
            if ($all_completed) {
                $icon_class = 'fa-check-double';
                $color = '#10b981';
                $bg_color = '#d1fae5';
            } else {
                $icon_class = 'fa-layer-group';
                $color = $has_high_priority ? '#d1453b' : '#3b82f6';
                $bg_color = $has_high_priority ? '#ffebe9' : '#dbeafe';
            }
        }

        // Tooltip Listesini Oluştur (CSS attr() için \n ile alt satır)
        $tooltip_text = "";
        $limit = 5;
        
        foreach(array_slice($post_tasks, 0, $limit) as $pt) {
            $s_conf = isset($status_config[$pt->status]) ? $status_config[$pt->status] : $status_config['default'];
            
            // Durum işareti (Tamamlandıysa Tik, değilse Nokta)
            $status_mark = ($pt->status === 'completed') ? '✓' : '•';
            
            // Durum etiketi (Sadece özel durumlar için)
            $status_label = ($pt->status !== 'in_progress' && $pt->status !== 'not_started' && $pt->status !== 'completed') 
                            ? '[' . $s_conf['label'] . '] ' 
                            : '';
                            
            $tooltip_text .= $status_mark . " " . $status_label . wp_strip_all_tags($pt->title) . "\n";
        }
        
        if ($count > $limit) {
            $tooltip_text .= "+ " . ($count - $limit) . " görev daha...";
        }
        $tooltip_text = trim($tooltip_text);
        
        // Pulse animasyonu (Tamamlanmamış iş varsa)
        $show_pulse = false;
        foreach($post_tasks as $pt) {
            if ($pt->status !== 'completed' && $pt->status !== 'cancelled') {
                $show_pulse = true; 
                break; 
            }
        }
        $pulse_html = $show_pulse ? '<span class="h2l-pulse-ring" style="border-color:'.$color.'"></span>' : '';
        
        // Sayı Rozeti
        $count_badge = $count > 1 ? '<span class="h2l-icon-count" style="background:'.$color.'">'.$count.'</span>' : '';

        $icon_html = sprintf(
            '<div class="h2l-icon-wrapper" data-h2l-tooltip="%s">
                <span class="h2l-task-trigger h2l-modern-icon" data-task-id="%d" style="color:%s; background-color:%s;">
                    %s
                    <i class="fa-solid %s"></i>
                    %s
                </span>
            </div>',
            esc_attr($tooltip_text),
            $main_task_id,
            $color,
            $bg_color,
            $pulse_html,
            $icon_class,
            $count_badge
        );
        
        $tasks_map[$post_id] = [
            'html' => $icon_html,
            'url'  => get_permalink($post_id)
        ];
    }

    $tasks_json = json_encode($tasks_map);
    ?>
    <style>
        .h2l-icon-wrapper { display: inline-flex; align-items: center; vertical-align: middle; margin-left: 10px; position: relative; z-index: 99; line-height: 1; }
        .h2l-modern-icon { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative; border: 1px solid transparent; }
        .h2l-modern-icon:hover { transform: translateY(-1px) scale(1.05); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .h2l-pulse-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #3b82f6; opacity: 0; animation: h2l-pulse 2s infinite; top: -2px; left: -2px; box-sizing: content-box; }
        .h2l-icon-count { position: absolute; top: -5px; right: -5px; color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 8px; font-weight: bold; border: 1px solid #fff; min-width: 14px; text-align: center; }
        
        /* CSS Tooltip (Geri Getirildi) */
        .h2l-icon-wrapper::before {
            content: attr(data-h2l-tooltip);
            position: absolute;
            top: 50%;
            left: 100%;
            transform: translateY(-50%) translateX(10px);
            background-color: #1f2937;
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            white-space: pre; /* Alt satıra geçmeyi sağlar */
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
            pointer-events: none;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 10000;
            min-width: 180px;
            max-width: 300px;
            line-height: 1.5;
            text-align: left;
        }

        .h2l-icon-wrapper::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 100%;
            transform: translateY(-50%) translateX(5px);
            border-width: 5px;
            border-style: solid;
            border-color: transparent #1f2937 transparent transparent;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
            pointer-events: none;
            z-index: 10000;
        }

        .h2l-icon-wrapper:hover::before,
        .h2l-icon-wrapper:hover::after {
            opacity: 1;
            visibility: visible;
        }

        @keyframes h2l-pulse { 0% { transform: scale(0.95); opacity: 0.5; } 70% { transform: scale(1.4); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
    </style>

    <script type="text/javascript">
        document.addEventListener('DOMContentLoaded', function() {
            var tasks = <?php echo $tasks_json; ?>;
            
            function injectIcon(targetElement, html) {
                if (targetElement.nextSibling && targetElement.nextSibling.classList && targetElement.nextSibling.classList.contains('h2l-icon-wrapper')) return;
                if (targetElement.querySelector && targetElement.querySelector('.h2l-task-trigger')) return;
                var tempDiv = document.createElement('div'); tempDiv.innerHTML = html; var iconElement = tempDiv.firstChild;
                if (targetElement.tagName.toLowerCase() === 'a') { targetElement.parentNode.insertBefore(iconElement, targetElement.nextSibling); } else { targetElement.appendChild(iconElement); }
            }

            <?php if ( is_singular() ): ?>
                var pid = <?php echo get_the_ID(); ?>;
                if (tasks[pid]) {
                    var selectors = ['.entry-header h1.entry-title', 'article h1.entry-title', '.site-main h1.post-title', '.site-main h1', 'h1.page-title', 'h1.entry-title', 'h1'];
                    for (var i = 0; i < selectors.length; i++) { var el = document.querySelector(selectors[i]); if (el && el.offsetParent !== null && !el.closest('.site-header') && !el.closest('#masthead')) { injectIcon(el, tasks[pid].html); break; } }
                }
            <?php else: ?>
                for (var pid in tasks) {
                    if (tasks.hasOwnProperty(pid)) {
                        var taskData = tasks[pid]; var url = taskData.url; var urlNoSlash = url.replace(/\/$/, ""); var urlSlash = urlNoSlash + "/";
                        var links = document.querySelectorAll('a[href="' + urlSlash + '"], a[href="' + urlNoSlash + '"]');
                        for (var j = 0; j < links.length; j++) {
                            var link = links[j];
                            if (link.querySelector('img')) continue;
                            if (link.classList.contains('btn') || link.classList.contains('edit-icon') || link.classList.contains('btn-comment')) continue;
                            if (link.innerText.trim().length === 0) continue;
                            var isTarget = false;
                            if (link.closest('.kampanya-title') || link.closest('.ajans-kolonu') || link.closest('.entry-title') || link.closest('.post-title') || link.closest('h2') || link.closest('h3') || link.closest('td.font-medium')) { isTarget = true; }
                            if (!isTarget && link.closest('td') && link.innerText.length > 3 && !link.closest('.row-actions')) { isTarget = true; }
                            if (isTarget) { injectIcon(link, taskData.html); break; }
                        }
                    }
                }
            <?php endif; ?>
        });
    </script>
    <?php
}
?>