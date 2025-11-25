<?php
/**
 * Eklenti silindiğinde çalışır.
 * Veritabanı tablolarını ve opsiyonları temizler.
 */

// Eğer WordPress tarafından çağrılmadıysa çık.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

// Tüm tabloları diziye al
$tables = [
    'h2l_tasks',
    'h2l_projects',
    'h2l_folders',
    'h2l_sections',
    'h2l_labels',
    'h2l_task_labels',
    'h2l_comments',
    'h2l_activity_log',
    'h2l_notifications',
    'h2l_user_favorites',
    'h2l_meetings',
    'h2l_filters'
];

// Tabloları döngüyle sil
foreach ( $tables as $table ) {
    $table_name = $wpdb->prefix . $table;
    $wpdb->query( "DROP TABLE IF EXISTS $table_name" );
}

// Ayarları (Options) sil
delete_option( 'h2l_db_version' );
delete_option( 'h2l_app_page_id' );
delete_option( 'h2l_reminder_subject' );
delete_option( 'h2l_reminder_body' );
delete_option( 'h2l_reminder_footer' );
delete_option( 'h2l_openai_api_key' );
delete_option( 'h2l_meeting_model' );
delete_option( 'h2l_meeting_max_duration' );

// Kullanıcı tercihlerini (User Meta) temizle
$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'h2l_%'" );

// Varsa zamanlanmış cron işlerini temizle
$timestamp = wp_next_scheduled( 'h2l_reminder_check_event' );
if ( $timestamp ) {
    wp_unschedule_event( $timestamp, 'h2l_reminder_check_event' );
}
?>