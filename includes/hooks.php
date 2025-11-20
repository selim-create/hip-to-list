<?php
/**
 * Eklenti genelindeki Action ve Filter tanımları.
 * Core dosyalarındaki mantığı WordPress'e bağlar.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Cron zamanlayıcısını başlat
add_action( 'init', 'h2l_schedule_cron_jobs' );

function h2l_schedule_cron_jobs() {
    if ( ! wp_next_scheduled( 'h2l_daily_reminder_check' ) ) {
        wp_schedule_event( time(), 'hourly', 'h2l_daily_reminder_check' );
    }
}

// Cron tetiklendiğinde Reminder sınıfını çalıştır
add_action( 'h2l_daily_reminder_check', 'h2l_trigger_reminders' );

function h2l_trigger_reminders() {
    // Reminder sınıfı yüklü mü kontrol et
    if ( class_exists( 'H2L_Reminder' ) ) {
        $reminder = new H2L_Reminder();
        $reminder->process_queue();
    }
}

// Frontend scriptlerini ve stillerini kaydet (Enqueue işlemi h2l-frontend.php içinde çağrılır)
add_action( 'wp_enqueue_scripts', 'h2l_register_frontend_assets' );

function h2l_register_frontend_assets() {
    wp_register_style( 'h2l-frontend-css', H2L_URL . 'frontend/assets/frontend.css', array(), H2L_VERSION );
    
    // React bağımlılıklarıyla script'i kaydet
    wp_register_script( 
        'h2l-frontend-js', 
        H2L_URL . 'frontend/assets/frontend.js', 
        array( 'wp-element', 'wp-api-fetch' ), 
        H2L_VERSION, 
        true 
    );

    // Frontend için localize data
    wp_localize_script( 'h2l-frontend-js', 'h2lFrontendSettings', array(
        'root'  => esc_url_raw( rest_url() ),
        'nonce' => wp_create_nonce( 'wp_rest' ),
        'ajax_url' => admin_url( 'admin-ajax.php' )
    ) );
}
?>