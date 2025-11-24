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
?>