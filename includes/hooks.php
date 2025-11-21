<?php
/**
 * Eklenti genelindeki Action ve Filter tanımları.
 * URL Yeniden Yazma (Rewrite) ve Cron İşleri
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// 1. URL YENİDEN YAZMA KURALLARI (Linklerin Çalışması İçin)
add_action( 'init', 'h2l_add_rewrite_rules' );

function h2l_add_rewrite_rules() {
    // site.com/gorevler/proje/123 -> gorevler sayfasını aç
    add_rewrite_rule('^gorevler/proje/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    
    // site.com/gorevler/gorev/456 -> gorevler sayfasını aç
    add_rewrite_rule('^gorevler/gorev/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
    
    // site.com/gorevler/klasor/789 -> gorevler sayfasını aç
    add_rewrite_rule('^gorevler/klasor/([0-9]+)/?', 'index.php?pagename=gorevler', 'top');
}

// 2. CRON İŞLERİ (Hatırlatıcılar İçin)
add_action( 'init', 'h2l_schedule_cron_jobs' );

function h2l_schedule_cron_jobs() {
    if ( ! wp_next_scheduled( 'h2l_daily_reminder_check' ) ) {
        wp_schedule_event( time(), 'hourly', 'h2l_daily_reminder_check' );
    }
}

// Cron Tetikleyici
add_action( 'h2l_daily_reminder_check', 'h2l_trigger_reminders' );

function h2l_trigger_reminders() {
    if ( class_exists( 'H2L_Reminder' ) ) {
        $reminder = new H2L_Reminder();
        $reminder->process_queue();
    }
}
?>