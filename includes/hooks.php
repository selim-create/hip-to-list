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
 * Yazı başlıklarına ilişkili görev ikonu ekle (JS Enjeksiyonu)
 */
add_action('wp_footer', 'h2l_inject_task_icon_script');

function h2l_inject_task_icon_script() {
    // Admin, Feed, API vb. yerlerde çalışma
    if ( is_admin() || is_feed() || defined('REST_REQUEST') ) {
        return;
    }

    // Sadece giriş yapmış kullanıcılar görebilir
    if ( ! is_user_logged_in() ) {
        return;
    }

    // Toplanan ID'leri al
    global $wp_query, $h2l_displayed_post_ids;
    
    $posts_to_check = $h2l_displayed_post_ids;

    // Yedek olarak ana sorgudaki ID'leri de ekle
    if ( is_singular() ) {
        $posts_to_check[] = get_the_ID();
    } elseif ( !empty( $wp_query->posts ) ) {
        foreach ( $wp_query->posts as $p ) {
            if ( isset( $p->ID ) ) {
                $posts_to_check[] = $p->ID;
            }
        }
    }

    // ID'leri temizle
    $posts_to_check = array_unique( array_filter( $posts_to_check ) );

    if ( empty( $posts_to_check ) ) {
        return;
    }

    global $wpdb;
    $ids_placeholder = implode(',', array_fill(0, count($posts_to_check), '%d'));
    
    // Bu postlara bağlı, silinmemiş görevleri çek
    // ORDER BY id ASC: Eskiden yeniye sıralar. Döngüde son işlenen görev (en yeni) haritada kalır.
    $sql = "SELECT id, status, title, related_object_id FROM {$wpdb->prefix}h2l_tasks 
            WHERE related_object_id IN ($ids_placeholder) 
            AND status != 'trash'
            ORDER BY id ASC";
            
    $tasks = $wpdb->get_results($wpdb->prepare($sql, $posts_to_check));
    
    if ( empty($tasks) ) {
        return;
    }

    // JS tarafına aktarılacak veriyi hazırla
    $tasks_map = [];
    foreach ($tasks as $task) {
        $is_completed = ($task->status === 'completed');
        // Modern renk paleti
        $color = $is_completed ? '#10b981' : '#3b82f6'; // Tailwind Green-500 / Blue-500
        $bg_color = $is_completed ? '#d1fae5' : '#dbeafe'; // Green-100 / Blue-100
        $icon_class = $is_completed ? 'fa-check' : 'fa-clipboard-check';
        
        $tooltip_text = 'Görev: ' . wp_strip_all_tags($task->title);
        
        // MODERN İKON HTML
        $pulse_html = !$is_completed ? '<span class="h2l-pulse-ring"></span>' : '';
        
        $icon_html = sprintf(
            '<div class="h2l-icon-wrapper" data-h2l-tooltip="%s">
                <span class="h2l-task-trigger h2l-modern-icon %s" data-task-id="%d" style="color:%s; background-color:%s;">
                    %s
                    <i class="fa-solid %s"></i>
                </span>
            </div>',
            esc_attr($tooltip_text),
            $is_completed ? 'completed' : 'open',
            $task->id,
            $color,
            $bg_color,
            $pulse_html,
            $icon_class
        );
        
        $tasks_map[$task->related_object_id] = [
            'html' => $icon_html,
            'url'  => get_permalink($task->related_object_id)
        ];
    }

    $tasks_json = json_encode($tasks_map);

    ?>
    <!-- H2L Modern Icon & Tooltip Styles -->
    <style>
        /* Icon Wrapper */
        .h2l-icon-wrapper {
            display: inline-flex;
            align-items: center;
            vertical-align: middle;
            margin-left: 10px;
            position: relative;
            z-index: 99;
            line-height: 1;
        }

        /* Modern Icon Base */
        .h2l-modern-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            position: relative;
            border: 1px solid transparent;
        }

        .h2l-modern-icon:hover {
            transform: translateY(-1px) scale(1.05);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        /* Pulse Animation for Open Tasks */
        .h2l-pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            opacity: 0;
            animation: h2l-pulse 2s infinite;
            top: -2px;
            left: -2px;
            box-sizing: content-box;
        }

        @keyframes h2l-pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            70% { transform: scale(1.4); opacity: 0; }
            100% { transform: scale(0.95); opacity: 0; }
        }

        /* CSS Tooltip (SAĞ TARAF) */
        .h2l-icon-wrapper::before {
            content: attr(data-h2l-tooltip);
            position: absolute;
            /* Tooltip'i ikonun sağına hizala */
            top: 50%;
            left: 100%;
            transform: translateY(-50%) translateX(10px);
            
            background-color: #1f2937; /* Dark Gray */
            color: #fff;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
            pointer-events: none;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 1000;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Tooltip Arrow (Ok - Sola Bakıyor) */
        .h2l-icon-wrapper::after {
            content: '';
            position: absolute;
            /* Ok ikonun sağında */
            top: 50%;
            left: 100%;
            transform: translateY(-50%) translateX(5px);
            
            border-width: 5px;
            border-style: solid;
            /* Sağ tooltip için ok sola bakmalı (rengi tooltip rengi) */
            border-color: transparent #1f2937 transparent transparent;
            
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
            pointer-events: none;
        }

        .h2l-icon-wrapper:hover::before,
        .h2l-icon-wrapper:hover::after {
            opacity: 1;
            visibility: visible;
        }
        
    </style>

    <script type="text/javascript">
        document.addEventListener('DOMContentLoaded', function() {
            var tasks = <?php echo $tasks_json; ?>;
            
            function injectIcon(targetElement, html) {
                if (targetElement.nextSibling && targetElement.nextSibling.classList && targetElement.nextSibling.classList.contains('h2l-icon-wrapper')) return;
                if (targetElement.querySelector && targetElement.querySelector('.h2l-task-trigger')) return;

                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                var iconElement = tempDiv.firstChild;

                if (targetElement.tagName.toLowerCase() === 'a') {
                    targetElement.parentNode.insertBefore(iconElement, targetElement.nextSibling);
                } else {
                    targetElement.appendChild(iconElement);
                }
            }

            <?php if ( is_singular() ): ?>
                // --- TEKİL SAYFA ---
                var pid = <?php echo get_the_ID(); ?>;
                if (tasks[pid]) {
                    var selectors = [
                        '.entry-header h1.entry-title', 
                        'article h1.entry-title', 
                        '.site-main h1.post-title',
                        '.site-main h1',
                        'h1.page-title',
                        'h1.entry-title',
                        'h1'
                    ];
                    
                    for (var i = 0; i < selectors.length; i++) {
                        var el = document.querySelector(selectors[i]);
                        if (el && el.offsetParent !== null && !el.closest('.site-header') && !el.closest('#masthead')) {
                            injectIcon(el, tasks[pid].html);
                            break;
                        }
                    }
                }

            <?php else: ?>
                // --- ARŞİV / TABLO / KART ---
                for (var pid in tasks) {
                    if (tasks.hasOwnProperty(pid)) {
                        var taskData = tasks[pid];
                        var url = taskData.url;
                        
                        var urlNoSlash = url.replace(/\/$/, "");
                        var urlSlash = urlNoSlash + "/";
                        
                        // Linkleri bul
                        var links = document.querySelectorAll('a[href="' + urlSlash + '"], a[href="' + urlNoSlash + '"]');
                        
                        for (var j = 0; j < links.length; j++) {
                            var link = links[j];
                            
                            if (link.querySelector('img')) continue;
                            if (link.classList.contains('btn') || link.classList.contains('edit-icon') || link.classList.contains('btn-comment')) continue;
                            if (link.innerText.trim().length === 0) continue;

                            var isTarget = false;
                            
                            // ÖZEL SINIFLAR
                            if (link.closest('.kampanya-title') || 
                                link.closest('.ajans-kolonu') || 
                                link.closest('.entry-title') || 
                                link.closest('.post-title') ||
                                link.closest('h2') || 
                                link.closest('h3') ||
                                link.closest('td.font-medium')
                               ) {
                                isTarget = true;
                            }
                            
                            // Genel Tablo Satırı Kontrolü
                            if (!isTarget && link.closest('td') && link.innerText.length > 3 && !link.closest('.row-actions')) {
                                isTarget = true;
                            }

                            if (isTarget) {
                                injectIcon(link, taskData.html);
                                break; 
                            }
                        }
                    }
                }
            <?php endif; ?>
        });
    </script>
    <?php
}
?>