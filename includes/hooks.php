<?php
/**
 * Eklenti genelindeki Action ve Filter tanımları.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// 1. URL YENİDEN YAZMA
add_action( 'init', 'h2l_add_rewrite_rules' );

function h2l_add_rewrite_rules() {
    add_rewrite_rule('^gorevler/proje/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/gorev/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/klasor/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    add_rewrite_rule('^gorevler/etiket/([^/]+)/?', 'index.php?pagename=gorevler', 'top');
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

// Temizlik
register_deactivation_hook( H2L_PATH . 'hip-to-list.php', 'h2l_clear_cron_jobs' );

function h2l_clear_cron_jobs() {
    wp_clear_scheduled_hook( 'h2l_reminder_check_event' );
}

/**
 * Yazı başlıklarına ilişkili görev ikonu ekle
 */
add_filter('the_title', 'h2l_add_task_icon_to_title', 10, 2);

function h2l_add_task_icon_to_title($title, $id = null) {
    // Sadece admin olmayan, döngü içindeki ve tekil detay sayfalarında çalış
    if ( !is_admin() && in_the_loop() && is_singular() ) {
        if (!$id) $id = get_the_ID();
        
        global $wpdb;
        // Bu post ID'sine bağlı silinmemiş bir görev var mı?
        $task = $wpdb->get_row($wpdb->prepare(
            "SELECT id, status FROM {$wpdb->prefix}h2l_tasks WHERE related_object_id = %d AND related_object_type = %s AND status != 'trash'", 
            $id, 
            get_post_type($id)
        ));
        
        if ($task) {
            // Tamamlanmışsa yeşil, değilse mavi ikon
            $color = ($task->status === 'completed') ? '#27ae60' : '#246fe0';
            $icon_class = ($task->status === 'completed') ? 'fa-circle-check' : 'fa-square-check'; // FontAwesome classları
            
            // İkon HTML'i (data-task-id attribute'u JS için kritik)
            $icon_html = sprintf(
                ' <span class="h2l-task-trigger" data-task-id="%d" title="Görevi Görüntüle" style="cursor:pointer; color:%s; font-size:0.7em; vertical-align:middle; margin-left:8px;"> <i class="fa-solid %s"></i></span>',
                $task->id,
                $color,
                $icon_class
            );
            
            return $title . $icon_html;
        }
    }
    return $title;
}
?>